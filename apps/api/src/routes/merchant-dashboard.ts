import type { FastifyInstance, FastifyRequest } from 'fastify'
import type { AppConfig } from '../config.js'
import { createSupabase } from '../db.js'
import { requireMerchant, requireUser } from '../lib/merchant-auth.js'
import { MerchantService } from '../modules/merchants/service.js'

export async function registerMerchantDashboardRoutes(
  app: FastifyInstance,
  config: AppConfig
) {
  const db = createSupabase(config)
  const merchants = new MerchantService(db)

  app.get('/merchants/me', async (request, reply) => {
    if (!(await requireMerchant(request, reply, merchants, db))) return
    const merchant = await merchants.getById(request.merchantId!)
    if (!merchant) return reply.code(404).send({ error: 'Not found' })
    return merchant
  })

  app.get('/merchants/me/stats', async (request, reply) => {
    if (!(await requireMerchant(request, reply, merchants, db))) return
    const merchantId = request.merchantId!

    const [paymentsRes, settlementsRes, walletsRes] = await Promise.all([
      db.from('payments').select('amount, status, fee_amount').eq('merchant_id', merchantId),
      db.from('settlements').select('id, status').eq('merchant_id', merchantId),
      db.from('wallets').select('balance, currency').eq('owner_type', 'merchant').eq('owner_id', merchantId)
    ])

    const payments = paymentsRes.data ?? []
    const completed = payments.filter((p) => p.status === 'completed')
    const failed = payments.filter((p) => p.status === 'failed')
    const volume = completed.reduce((sum, p) => sum + Number(p.amount), 0) / 100
    const revenue = completed.reduce((sum, p) => sum + Number(p.fee_amount), 0) / 100
    const pendingSettlements = (settlementsRes.data ?? []).filter((s) => s.status === 'pending').length
    const walletBalanceTotal =
      (walletsRes.data ?? []).reduce((sum, w) => sum + Number(w.balance), 0) / 100

    return {
      totalVolume: volume,
      totalRevenue: revenue,
      successfulPayments: completed.length,
      failedPayments: failed.length,
      pendingSettlements,
      walletBalanceTotal
    }
  })

  app.get('/merchants/me/payments', async (request, reply) => {
    if (!(await requireMerchant(request, reply, merchants, db))) return
    const { data, error } = await db
      .from('payments')
      .select('id, amount, currency, status, payment_method, customer_email, customer_phone, checkout_reference, created_at')
      .eq('merchant_id', request.merchantId!)
      .order('created_at', { ascending: false })
      .limit(100)
    if (error) return reply.code(500).send({ error: error.message })
    return (data ?? []).map((p) => ({
      id: p.id,
      customer: p.customer_email ?? p.customer_phone ?? 'Customer',
      amount: Number(p.amount) / 100,
      currency: p.currency,
      method: p.payment_method,
      status: p.status,
      date: p.created_at,
      reference: p.checkout_reference
    }))
  })

  app.get('/merchants/me/transactions', async (request, reply) => {
    if (!(await requireMerchant(request, reply, merchants, db))) return
    const merchantId = request.merchantId!

    const [payments, payouts, settlements, fxTx] = await Promise.all([
      db.from('payments').select('id, amount, currency, status, customer_email, customer_phone, created_at').eq('merchant_id', merchantId).order('created_at', { ascending: false }).limit(50),
      db.from('payouts').select('id, amount, currency, status, destination_reference, created_at').eq('merchant_id', merchantId).order('created_at', { ascending: false }).limit(50),
      db.from('settlements').select('id, amount, currency, status, destination_currency, created_at').eq('merchant_id', merchantId).order('created_at', { ascending: false }).limit(50),
      db.from('fx_transactions').select('id, from_amount, from_currency, to_currency, to_amount, rate, created_at').eq('merchant_id', merchantId).order('created_at', { ascending: false }).limit(50)
    ])

    const rows = [
      ...(payments.data ?? []).map((p) => ({
        id: p.id,
        type: 'payment' as const,
        counterparty: p.customer_email ?? p.customer_phone ?? 'Customer',
        amount: Number(p.amount) / 100,
        currency: p.currency,
        status: p.status,
        date: p.created_at
      })),
      ...(payouts.data ?? []).map((p) => ({
        id: p.id,
        type: 'payout' as const,
        counterparty: p.destination_reference,
        amount: Number(p.amount) / 100,
        currency: p.currency,
        status: p.status,
        date: p.created_at
      })),
      ...(settlements.data ?? []).map((s) => ({
        id: s.id,
        type: 'settlement' as const,
        counterparty: `${s.currency} → ${s.destination_currency ?? s.currency}`,
        amount: Number(s.amount) / 100,
        currency: s.currency,
        status: s.status,
        date: s.created_at
      })),
      ...(fxTx.data ?? []).map((f) => ({
        id: f.id,
        type: 'fx' as const,
        counterparty: `${f.from_currency}/${f.to_currency}`,
        amount: Number(f.from_amount) / 100,
        currency: f.from_currency,
        status: 'completed',
        date: f.created_at
      }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return rows
  })

  app.get('/merchants/me/wallets', async (request, reply) => {
    if (!(await requireMerchant(request, reply, merchants, db))) return
    const { data, error } = await db
      .from('wallets')
      .select('currency, balance')
      .eq('owner_type', 'merchant')
      .eq('owner_id', request.merchantId!)
    if (error) return reply.code(500).send({ error: error.message })
    return (data ?? []).map((w) => ({
      currency: w.currency,
      available: Number(w.balance) / 100,
      pending: 0,
      reserved: 0
    }))
  })

  app.get('/merchants/me/settlements', async (request, reply) => {
    if (!(await requireMerchant(request, reply, merchants, db))) return
    const { data, error } = await db
      .from('settlements')
      .select('*')
      .eq('merchant_id', request.merchantId!)
      .order('created_at', { ascending: false })
      .limit(100)
    if (error) return reply.code(500).send({ error: error.message })
    return (data ?? []).map((s) => ({
      id: s.id,
      amount: Number(s.amount) / 100,
      sourceCurrency: s.currency,
      destinationCurrency: s.destination_currency ?? s.currency,
      method: s.settlement_method,
      status: s.status,
      date: s.created_at
    }))
  })

  app.get('/merchants/me/payouts', async (request, reply) => {
    if (!(await requireMerchant(request, reply, merchants, db))) return
    const { data, error } = await db
      .from('payouts')
      .select('*')
      .eq('merchant_id', request.merchantId!)
      .order('created_at', { ascending: false })
      .limit(100)
    if (error) return reply.code(500).send({ error: error.message })
    return (data ?? []).map((p) => ({
      id: p.id,
      recipient: p.destination_reference,
      amount: Number(p.amount) / 100,
      currency: p.currency,
      method: p.destination_type,
      status: p.status,
      date: p.created_at
    }))
  })

  app.get('/merchants/me/refunds', async (request, reply) => {
    if (!(await requireMerchant(request, reply, merchants, db))) return
    const merchantId = request.merchantId!
    const { data: paymentIds } = await db
      .from('payments')
      .select('id')
      .eq('merchant_id', merchantId)
    const ids = (paymentIds ?? []).map((p) => p.id)
    if (ids.length === 0) return []

    const { data, error } = await db
      .from('refunds')
      .select('*, payments(customer_email, customer_phone)')
      .in('payment_id', ids)
      .order('created_at', { ascending: false })
      .limit(100)
    if (error) return reply.code(500).send({ error: error.message })
    return (data ?? []).map((r) => {
      const payment = r.payments as { customer_email?: string; customer_phone?: string } | null
      return {
        id: r.id,
        paymentId: r.payment_id,
        customer: payment?.customer_email ?? payment?.customer_phone ?? 'Customer',
        amount: Number(r.amount) / 100,
        currency: r.currency,
        status: r.status,
        reason: r.reason ?? '',
        date: r.created_at
      }
    })
  })

  app.get('/merchants/me/escrows', async (request, reply) => {
    if (!(await requireMerchant(request, reply, merchants, db))) return
    const { data, error } = await db
      .from('escrows')
      .select('*')
      .eq('merchant_id', request.merchantId!)
      .order('created_at', { ascending: false })
      .limit(100)
    if (error) return reply.code(500).send({ error: error.message })
    return (data ?? []).map((e) => ({
      id: e.id,
      paymentId: e.payment_id,
      amount: Number(e.amount) / 100,
      currency: e.currency,
      status: e.status,
      createdAt: e.created_at
    }))
  })

  app.get('/merchants/me/customers', async (request, reply) => {
    if (!(await requireMerchant(request, reply, merchants, db))) return
    const merchantId = request.merchantId!

    const [customersRes, paymentsRes] = await Promise.all([
      db.from('customers').select('*').eq('merchant_id', merchantId).order('created_at', { ascending: false }).limit(100),
      db.from('payments').select('customer_id, amount, status, created_at').eq('merchant_id', merchantId).eq('status', 'completed')
    ])

    if (customersRes.error) return reply.code(500).send({ error: customersRes.error.message })

    const statsByCustomer = new Map<string, { count: number; ltv: number; lastActivity: string | null }>()
    for (const p of paymentsRes.data ?? []) {
      if (!p.customer_id) continue
      const existing = statsByCustomer.get(p.customer_id) ?? { count: 0, ltv: 0, lastActivity: null }
      existing.count += 1
      existing.ltv += Number(p.amount) / 100
      if (!existing.lastActivity || p.created_at > existing.lastActivity) {
        existing.lastActivity = p.created_at
      }
      statsByCustomer.set(p.customer_id, existing)
    }

    return (customersRes.data ?? []).map((c) => {
      const stats = statsByCustomer.get(c.id) ?? { count: 0, ltv: 0, lastActivity: null }
      return {
        id: c.id,
        name: c.email ?? c.phone ?? 'Customer',
        email: c.email ?? '',
        phone: c.phone ?? '',
        transactions: stats.count,
        lifetimeValue: stats.ltv,
        lastActivity: stats.lastActivity
      }
    })
  })

  app.get('/merchants/me/customers/:id', async (request, reply) => {
    if (!(await requireMerchant(request, reply, merchants, db))) return
    const { id } = request.params as { id: string }
    const merchantId = request.merchantId!

    const { data: customer, error } = await db
      .from('customers')
      .select('*')
      .eq('id', id)
      .eq('merchant_id', merchantId)
      .maybeSingle()
    if (error) return reply.code(500).send({ error: error.message })
    if (!customer) return reply.code(404).send({ error: 'Not found' })

    const { data: payments } = await db
      .from('payments')
      .select('id, amount, currency, status, payment_method, created_at')
      .eq('customer_id', id)
      .order('created_at', { ascending: false })
      .limit(50)

    const completed = (payments ?? []).filter((p) => p.status === 'completed')
    const ltv = completed.reduce((sum, p) => sum + Number(p.amount), 0) / 100

    return {
      id: customer.id,
      name: customer.email ?? customer.phone ?? 'Customer',
      email: customer.email ?? '',
      phone: customer.phone ?? '',
      transactions: (payments ?? []).length,
      lifetimeValue: ltv,
      lastActivity: payments?.[0]?.created_at ?? null,
      paymentHistory: (payments ?? []).map((p) => ({
        id: p.id,
        type: 'payment' as const,
        amount: Number(p.amount) / 100,
        currency: p.currency,
        status: p.status,
        date: p.created_at
      }))
    }
  })

  app.get('/merchants/me/fx-transactions', async (request, reply) => {
    if (!(await requireMerchant(request, reply, merchants, db))) return
    const { data, error } = await db
      .from('fx_transactions')
      .select('*')
      .eq('merchant_id', request.merchantId!)
      .order('created_at', { ascending: false })
      .limit(100)
    if (error) return reply.code(500).send({ error: error.message })
    return (data ?? []).map((f) => ({
      id: f.id,
      from: f.from_currency,
      to: f.to_currency,
      fromAmount: Number(f.from_amount) / 100,
      toAmount: Number(f.to_amount) / 100,
      rate: Number(f.rate),
      date: f.created_at
    }))
  })

  app.get('/merchants/me/dashboard-charts', async (request, reply) => {
    if (!(await requireMerchant(request, reply, merchants, db))) return
    const merchantId = request.merchantId!
    const since = new Date()
    since.setDate(since.getDate() - 6)
    since.setHours(0, 0, 0, 0)

    const { data: payments } = await db
      .from('payments')
      .select('amount, currency, status, fee_amount, created_at')
      .eq('merchant_id', merchantId)
      .gte('created_at', since.toISOString())

    const byDate = new Map<string, { volume: number; revenue: number }>()
    const byCurrency = new Map<string, number>()

    for (let i = 0; i < 7; i++) {
      const d = new Date(since)
      d.setDate(since.getDate() + i)
      byDate.set(d.toISOString().slice(0, 10), { volume: 0, revenue: 0 })
    }

    for (const p of payments ?? []) {
      const key = p.created_at.slice(0, 10)
      if (!byDate.has(key)) continue
      const entry = byDate.get(key)!
      if (p.status === 'completed') {
        entry.volume += Number(p.amount) / 100
        entry.revenue += Number(p.fee_amount) / 100
        byCurrency.set(p.currency, (byCurrency.get(p.currency) ?? 0) + Number(p.amount))
      }
    }

    const volumeSeries = Array.from(byDate.entries()).map(([iso, v]) => ({
      label: iso.slice(5),
      value: Math.round(v.volume)
    }))
    const revenueSeries = Array.from(byDate.entries()).map(([iso, v]) => ({
      label: iso.slice(5),
      value: Math.round(v.revenue)
    }))

    const currencyTotal = Array.from(byCurrency.values()).reduce((a, b) => a + b, 0)
    const currencyDistribution =
      currencyTotal > 0
        ? Array.from(byCurrency.entries()).map(([currency, amount]) => ({
            currency,
            percent: Math.round((amount / currencyTotal) * 100)
          }))
        : []

    return { volumeSeries, revenueSeries, currencyDistribution }
  })

  app.get('/merchants/me/api-keys', async (request, reply) => {
    if (!(await requireMerchant(request, reply, merchants, db))) return
    const { data, error } = await db
      .from('merchant_api_keys')
      .select('id, name, key_prefix, last_used_at, created_at, revoked_at')
      .eq('merchant_id', request.merchantId!)
      .is('revoked_at', null)
    if (error) return reply.code(500).send({ error: error.message })
    return (data ?? []).map((k) => ({
      id: k.id,
      name: k.name,
      prefix: k.key_prefix,
      createdAt: k.created_at,
      lastUsed: k.last_used_at
    }))
  })

  app.post('/merchants/me/api-keys/regenerate', async (request, reply) => {
    if (!(await requireMerchant(request, reply, merchants, db))) return
    try {
      const apiKey = await merchants.regenerateApiKey(request.merchantId!)
      return { apiKey }
    } catch (err) {
      return reply.code(400).send({ error: err instanceof Error ? err.message : 'Failed' })
    }
  })

  app.post('/merchants/me/bootstrap', async (request, reply) => {
    const user = await requireUser(request, reply, db)
    if (!user) return

    if (!user.email) {
      return reply.code(400).send({ error: 'User email is required to create a merchant account' })
    }

    try {
      const result = await merchants.ensureForUser({
        userId: user.id,
        email: user.email
      })
      return result
    } catch (err) {
      return reply.code(400).send({ error: err instanceof Error ? err.message : 'Failed' })
    }
  })
}
