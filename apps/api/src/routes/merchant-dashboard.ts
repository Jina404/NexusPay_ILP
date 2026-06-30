import type { FastifyInstance, FastifyRequest } from 'fastify'
import type { AppConfig } from '../config.js'
import { createSupabase } from '../db.js'
import { requireMerchant } from '../lib/merchant-auth.js'
import { MerchantService } from '../modules/merchants/service.js'

declare module 'fastify' {
  interface FastifyRequest {
    merchantId?: string
  }
}

export async function registerMerchantDashboardRoutes(
  app: FastifyInstance,
  config: AppConfig
) {
  const db = createSupabase(config)
  const merchants = new MerchantService(db)

  app.get('/merchants/me', async (request, reply) => {
    if (!(await requireMerchant(request, reply, merchants))) return
    const merchant = await merchants.getById(request.merchantId!)
    if (!merchant) return reply.code(404).send({ error: 'Not found' })
    return merchant
  })

  app.get('/merchants/me/stats', async (request, reply) => {
    if (!(await requireMerchant(request, reply, merchants))) return
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
    if (!(await requireMerchant(request, reply, merchants))) return
    const { data, error } = await db
      .from('payments')
      .select('id, amount, currency, status, payment_method, customer_email, customer_phone, checkout_reference, created_at')
      .eq('merchant_id', request.merchantId!)
      .order('created_at', { ascending: false })
      .limit(100)
    if (error) return reply.code(500).send({ error: error.message })
    return data ?? []
  })

  app.get('/merchants/me/transactions', async (request, reply) => {
    if (!(await requireMerchant(request, reply, merchants))) return
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
    if (!(await requireMerchant(request, reply, merchants))) return
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
    if (!(await requireMerchant(request, reply, merchants))) return
    const { data, error } = await db
      .from('settlements')
      .select('*')
      .eq('merchant_id', request.merchantId!)
      .order('created_at', { ascending: false })
      .limit(100)
    if (error) return reply.code(500).send({ error: error.message })
    return data ?? []
  })

  app.get('/merchants/me/payouts', async (request, reply) => {
    if (!(await requireMerchant(request, reply, merchants))) return
    const { data, error } = await db
      .from('payouts')
      .select('*')
      .eq('merchant_id', request.merchantId!)
      .order('created_at', { ascending: false })
      .limit(100)
    if (error) return reply.code(500).send({ error: error.message })
    return data ?? []
  })

  app.get('/merchants/me/refunds', async (request, reply) => {
    if (!(await requireMerchant(request, reply, merchants))) return
    const merchantId = request.merchantId!
    const { data: paymentIds } = await db
      .from('payments')
      .select('id')
      .eq('merchant_id', merchantId)
    const ids = (paymentIds ?? []).map((p) => p.id)
    if (ids.length === 0) return []

    const { data, error } = await db
      .from('refunds')
      .select('*')
      .in('payment_id', ids)
      .order('created_at', { ascending: false })
      .limit(100)
    if (error) return reply.code(500).send({ error: error.message })
    return data ?? []
  })

  app.get('/merchants/me/escrows', async (request, reply) => {
    if (!(await requireMerchant(request, reply, merchants))) return
    const { data, error } = await db
      .from('escrows')
      .select('*')
      .eq('merchant_id', request.merchantId!)
      .order('created_at', { ascending: false })
      .limit(100)
    if (error) return reply.code(500).send({ error: error.message })
    return data ?? []
  })

  app.get('/merchants/me/customers', async (request, reply) => {
    if (!(await requireMerchant(request, reply, merchants))) return
    const { data, error } = await db
      .from('customers')
      .select('*')
      .eq('merchant_id', request.merchantId!)
      .order('created_at', { ascending: false })
      .limit(100)
    if (error) return reply.code(500).send({ error: error.message })
    return data ?? []
  })

  app.get('/merchants/me/api-keys', async (request, reply) => {
    if (!(await requireMerchant(request, reply, merchants))) return
    const { data, error } = await db
      .from('merchant_api_keys')
      .select('id, name, key_prefix, last_used_at, created_at, revoked_at')
      .eq('merchant_id', request.merchantId!)
      .is('revoked_at', null)
    if (error) return reply.code(500).send({ error: error.message })
    return data ?? []
  })
}
