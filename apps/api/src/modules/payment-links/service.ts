import { randomBytes } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { FastifyBaseLogger } from 'fastify'
import type {
  CreatePaymentLinkInput,
  PaymentLinkCheckoutInput,
  UpdatePaymentLinkInput
} from '@nexuspay/shared'
import type { AppConfig } from '../../config.js'
import { AuditService } from '../audit/service.js'
import { CheckoutEngine } from '../checkout/service.js'

export interface PaymentLinkRow {
  id: string
  public_id: string
  merchant_id: string
  title: string
  description: string | null
  link_type: 'fixed' | 'open'
  amount: number | null
  currency: string
  status: 'active' | 'disabled' | 'expired'
  expires_at: string | null
  created_at: string
  updated_at: string
}

const MIN_OPEN_AMOUNT_KES = 10

function generatePublicId(): string {
  return randomBytes(16).toString('base64url')
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('254')) return digits
  if (digits.startsWith('0')) return `254${digits.slice(1)}`
  if (digits.length === 9) return `254${digits}`
  return digits
}

function getPayBaseUrl(config: AppConfig): string {
  return process.env.PAY_BASE_URL ?? config.API_PUBLIC_URL.replace(/:\d+$/, '').replace(/\/$/, '')
}

export class PaymentLinkService {
  private readonly audit: AuditService
  private readonly checkoutEngine: CheckoutEngine

  constructor(
    private readonly db: SupabaseClient,
    private readonly config: AppConfig,
    private readonly log: FastifyBaseLogger
  ) {
    this.audit = new AuditService(db)
    this.checkoutEngine = new CheckoutEngine(db, config, log)
  }

  buildPaymentUrl(publicId: string): string {
    const base = getPayBaseUrl(this.config)
    return `${base}/pay/${publicId}`
  }

  async create(merchantId: string, input: CreatePaymentLinkInput) {
    const publicId = generatePublicId()
    const amountMinor =
      input.linkType === 'fixed' && input.amount !== undefined
        ? Math.round(input.amount * 100)
        : null

    const { data, error } = await this.db
      .from('payment_links')
      .insert({
        public_id: publicId,
        merchant_id: merchantId,
        title: input.title,
        description: input.description ?? null,
        link_type: input.linkType,
        amount: amountMinor,
        currency: input.currency,
        status: 'active',
        expires_at: input.expiresAt ?? null
      })
      .select('*')
      .single()
    if (error) throw error

    await this.audit.log({
      actor: merchantId,
      action: 'payment_link.created',
      entityType: 'payment_link',
      entityId: data.id,
      payload: { publicId, linkType: input.linkType }
    })

    return {
      ...data,
      publicId: data.public_id,
      paymentUrl: this.buildPaymentUrl(publicId)
    }
  }

  async list(merchantId: string) {
    const { data: links, error } = await this.db
      .from('payment_links')
      .select('*')
      .eq('merchant_id', merchantId)
      .order('created_at', { ascending: false })
    if (error) throw error

    const enriched = await Promise.all(
      (links ?? []).map(async (link) => {
        const { count } = await this.db
          .from('payment_link_payments')
          .select('id', { count: 'exact', head: true })
          .eq('payment_link_id', link.id)
        return {
          ...link,
          publicId: link.public_id,
          paymentUrl: this.buildPaymentUrl(link.public_id),
          paymentsCount: count ?? 0
        }
      })
    )
    return enriched
  }

  async getById(merchantId: string, id: string) {
    const { data, error } = await this.db
      .from('payment_links')
      .select('*')
      .eq('id', id)
      .eq('merchant_id', merchantId)
      .maybeSingle()
    if (error) throw error
    if (!data) return null
    return {
      ...data,
      publicId: data.public_id,
      paymentUrl: this.buildPaymentUrl(data.public_id)
    }
  }

  async getByPublicId(publicId: string) {
    const link = await this.loadAndExpireIfNeeded(publicId)
    if (!link) return null

    const { data: merchant } = await this.db
      .from('merchants')
      .select('id, business_name, status, country, settlement_currency')
      .eq('id', link.merchant_id)
      .maybeSingle()
    if (!merchant || merchant.status !== 'active') return null

    return {
      link: {
        publicId: link.public_id,
        title: link.title,
        description: link.description,
        linkType: link.link_type,
        amount: link.amount !== null ? link.amount / 100 : null,
        currency: link.currency,
        status: link.status,
        expiresAt: link.expires_at
      },
      merchant: {
        name: merchant.business_name,
        country: merchant.country,
        settlementCurrency: merchant.settlement_currency
      }
    }
  }

  async update(merchantId: string, id: string, input: UpdatePaymentLinkInput) {
    const existing = await this.getById(merchantId, id)
    if (!existing) throw new Error('Payment link not found')

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (input.title !== undefined) patch.title = input.title
    if (input.description !== undefined) patch.description = input.description
    if (input.expiresAt !== undefined) patch.expires_at = input.expiresAt
    if (input.amount !== undefined && existing.link_type === 'fixed') {
      patch.amount = Math.round(input.amount * 100)
    }

    const { data, error } = await this.db
      .from('payment_links')
      .update(patch)
      .eq('id', id)
      .eq('merchant_id', merchantId)
      .select('*')
      .single()
    if (error) throw error

    return {
      ...data,
      publicId: data.public_id,
      paymentUrl: this.buildPaymentUrl(data.public_id)
    }
  }

  async disable(merchantId: string, id: string) {
    const { data, error } = await this.db
      .from('payment_links')
      .update({ status: 'disabled', updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('merchant_id', merchantId)
      .select('*')
      .single()
    if (error) throw error

    await this.audit.log({
      actor: merchantId,
      action: 'payment_link.disabled',
      entityType: 'payment_link',
      entityId: id
    })

    return data
  }

  async resolveForPayment(publicId: string): Promise<PaymentLinkRow> {
    const link = await this.loadAndExpireIfNeeded(publicId)
    if (!link) throw new Error('Payment link not found')
    if (link.status === 'disabled') throw new Error('Payment link is disabled')
    if (link.status === 'expired') throw new Error('Payment link has expired')
    return link
  }

  async checkout(publicId: string, input: PaymentLinkCheckoutInput) {
    const link = await this.resolveForPayment(publicId)
    const phone = normalizePhone(input.phone)

    let amountMajor: number
    if (link.link_type === 'fixed') {
      if (link.amount === null) throw new Error('Invalid fixed link amount')
      amountMajor = link.amount / 100
    } else {
      if (!input.amount || input.amount <= 0) throw new Error('Amount is required for open payment links')
      if (link.currency === 'KES' && input.amount < MIN_OPEN_AMOUNT_KES) {
        throw new Error(`Minimum amount is ${MIN_OPEN_AMOUNT_KES} ${link.currency}`)
      }
      amountMajor = input.amount
    }

    const result = await this.checkoutEngine.checkout({
      merchantId: link.merchant_id,
      amount: amountMajor,
      currency: link.currency,
      paymentMethod: 'mpesa',
      customerPhone: phone,
      idempotencyKey: input.idempotencyKey,
      metadata: {
        paymentLinkId: link.id,
        publicId: link.public_id,
        linkTitle: link.title
      }
    })

    await this.db.from('payment_link_payments').insert({
      payment_link_id: link.id,
      payment_id: result.payment.id,
      amount: Math.round(amountMajor * 100),
      currency: link.currency,
      payer_phone: phone,
      status: result.payment.status
    })

    await this.audit.log({
      actor: link.merchant_id,
      action: 'payment_link.checkout',
      entityType: 'payment_link',
      entityId: link.id,
      payload: { paymentId: result.payment.id, phone }
    })

    return {
      paymentId: result.payment.id,
      checkoutReference: result.payment.checkout_reference,
      status: result.payment.status,
      customerMessage:
        (result.providerPayload?.customerMessage as string | undefined) ??
        'Check your phone — enter your M-Pesa PIN to complete payment.'
    }
  }

  async listPayments(merchantId: string, linkId: string) {
    const link = await this.getById(merchantId, linkId)
    if (!link) throw new Error('Payment link not found')

    const { data, error } = await this.db
      .from('payment_link_payments')
      .select('*, payments(checkout_reference, metadata)')
      .eq('payment_link_id', linkId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data ?? []
  }

  async syncPaymentStatus(paymentId: string, status: string) {
    const { data: row } = await this.db
      .from('payment_link_payments')
      .select('payment_link_id')
      .eq('payment_id', paymentId)
      .maybeSingle()
    if (!row) return

    await this.db
      .from('payment_link_payments')
      .update({ status })
      .eq('payment_id', paymentId)

    if (status === 'completed') {
      const { data: link } = await this.db
        .from('payment_links')
        .select('merchant_id')
        .eq('id', row.payment_link_id)
        .maybeSingle()
      if (link) {
        await this.audit.log({
          actor: link.merchant_id,
          action: 'payment_link.payment_completed',
          entityType: 'payment_link',
          entityId: row.payment_link_id,
          payload: { paymentId }
        })
      }
    }
  }

  async getStats(merchantId: string, rangeDays = 7) {
    const since = new Date()
    since.setDate(since.getDate() - rangeDays)

    const { data: links } = await this.db
      .from('payment_links')
      .select('id, status, expires_at')
      .eq('merchant_id', merchantId)

    const linkIds = (links ?? []).map((l) => l.id)
    const now = new Date()

    const activeLinks = (links ?? []).filter(
      (l) =>
        l.status === 'active' &&
        (l.expires_at === null || new Date(l.expires_at) > now)
    ).length

    let payments: { amount: number; status: string; created_at: string }[] = []
    if (linkIds.length > 0) {
      const { data } = await this.db
        .from('payment_link_payments')
        .select('amount, status, created_at')
        .in('payment_link_id', linkIds)
      payments = data ?? []
    }

    const completed = payments.filter((p) => p.status === 'completed')
    const failed = payments.filter((p) => p.status === 'failed')
    const revenue = completed.reduce((sum, p) => sum + Number(p.amount), 0) / 100
    const successRate =
      completed.length + failed.length > 0
        ? Math.round((completed.length / (completed.length + failed.length)) * 100)
        : 0

    const byDate = new Map<string, { revenue: number; payments: number }>()
    for (let i = 0; i < rangeDays; i++) {
      const d = new Date()
      d.setDate(d.getDate() - (rangeDays - 1 - i))
      const key = d.toISOString().slice(0, 10)
      byDate.set(key, { revenue: 0, payments: 0 })
    }

    for (const p of payments) {
      const key = p.created_at.slice(0, 10)
      if (!byDate.has(key)) continue
      const entry = byDate.get(key)!
      entry.payments += 1
      if (p.status === 'completed') entry.revenue += Number(p.amount) / 100
    }

    const revenueSeries = Array.from(byDate.entries()).map(([label, v]) => ({
      label: label.slice(5),
      value: Math.round(v.revenue)
    }))
    const paymentsSeries = Array.from(byDate.entries()).map(([label, v]) => ({
      label: label.slice(5),
      value: v.payments
    }))

    return {
      totalLinks: links?.length ?? 0,
      activeLinks,
      totalPayments: payments.length,
      revenueCollected: revenue,
      successRate,
      revenueSeries,
      paymentsSeries
    }
  }

  private async loadAndExpireIfNeeded(publicId: string): Promise<PaymentLinkRow | null> {
    const { data, error } = await this.db
      .from('payment_links')
      .select('*')
      .eq('public_id', publicId)
      .maybeSingle()
    if (error) throw error
    if (!data) return null

    if (
      data.status === 'active' &&
      data.expires_at &&
      new Date(data.expires_at) < new Date()
    ) {
      await this.db
        .from('payment_links')
        .update({ status: 'expired', updated_at: new Date().toISOString() })
        .eq('id', data.id)
      return { ...data, status: 'expired' }
    }

    return data as PaymentLinkRow
  }
}
