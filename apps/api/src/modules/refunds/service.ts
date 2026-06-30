import { randomUUID } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { FastifyBaseLogger } from 'fastify'
import type { CreateRefundInput } from '@nexuspay/shared'
import type { AppConfig } from '../../config.js'
import { LedgerEngine } from '../ledger/service.js'
import { ProviderRegistry } from '../providers/registry.js'
import { AuditService } from '../audit/service.js'

export class RefundEngine {
  private readonly ledger: LedgerEngine
  private readonly providers: ProviderRegistry
  private readonly audit: AuditService

  constructor(db: SupabaseClient, config: AppConfig, log: FastifyBaseLogger) {
    this.ledger = new LedgerEngine(db)
    this.providers = new ProviderRegistry(config, log)
    this.audit = new AuditService(db)
    this.db = db
  }

  private readonly db: SupabaseClient

  async createRefund(input: CreateRefundInput) {
    const { data: payment } = await this.db.from('payments').select('*').eq('id', input.paymentId).single()
    if (!payment || payment.status !== 'completed') throw new Error('Payment not refundable')

    const refundAmount = input.amount
      ? BigInt(Math.round(input.amount * 100))
      : BigInt(payment.amount)

    const { data: refund, error } = await this.db
      .from('refunds')
      .insert({
        payment_id: input.paymentId,
        amount: Number(refundAmount),
        currency: payment.currency,
        status: 'processing',
        reason: input.reason ?? null,
        idempotency_key: input.idempotencyKey ?? randomUUID()
      })
      .select('*')
      .single()
    if (error) throw error

    const provider = this.providers.get(payment.payment_method)
    const { data: attempt } = await this.db
      .from('payment_attempts')
      .select('provider_reference')
      .eq('payment_id', payment.id)
      .eq('status', 'success')
      .maybeSingle()

    await provider.refundPayment({
      paymentId: payment.id,
      amount: refundAmount,
      currency: payment.currency,
      providerReference: attempt?.provider_reference ?? undefined,
      reason: input.reason
    })

    const { data: txn } = await this.db
      .from('ledger_transactions')
      .select('id')
      .eq('reference', `payment-${payment.id}`)
      .maybeSingle()
    if (txn?.id) {
      await this.ledger.reverseTransaction(txn.id, `refund-${refund.id}`)
    }

    await this.db.from('refunds').update({ status: 'completed' }).eq('id', refund.id)
    await this.db.from('payments').update({ status: 'refunded' }).eq('id', payment.id)

    await this.audit.log({
      actor: payment.merchant_id,
      action: 'refund.completed',
      entityType: 'refund',
      entityId: refund.id
    })

    return refund
  }
}
