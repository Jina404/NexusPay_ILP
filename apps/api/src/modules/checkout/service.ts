import { randomUUID } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { FastifyBaseLogger } from 'fastify'
import type { GatewayCheckoutInput, GatewayPayment, PaymentMethod } from '@nexuspay/shared'
import { LEDGER_ACCOUNT_CODES } from '@nexuspay/shared'
import type { AppConfig } from '../../config.js'
import { LedgerEngine } from '../ledger/service.js'
import { WalletEngine } from '../wallets/service.js'
import { FraudEngine } from '../fraud/service.js'
import { ProviderRegistry } from '../providers/registry.js'
import { EscrowEngine } from '../escrow/service.js'
import { AuditService } from '../audit/service.js'
import { InvoiceService } from '../invoices/service.js'

function cashAccountForMethod(method: PaymentMethod): string {
  switch (method) {
    case 'mpesa':
      return LEDGER_ACCOUNT_CODES.CASH_MPESA
    case 'airtel':
      return LEDGER_ACCOUNT_CODES.CASH_AIRTEL
    case 'card':
      return LEDGER_ACCOUNT_CODES.CASH_CARD
    case 'bank':
      return LEDGER_ACCOUNT_CODES.CASH_BANK
    default:
      return LEDGER_ACCOUNT_CODES.CASH_MPESA
  }
}

export class CheckoutEngine {
  private readonly ledger: LedgerEngine
  private readonly wallets: WalletEngine
  private readonly fraud: FraudEngine
  private readonly providers: ProviderRegistry
  private readonly escrow: EscrowEngine
  private readonly audit: AuditService
  private readonly invoices: InvoiceService

  constructor(
    private readonly db: SupabaseClient,
    config: AppConfig,
    log: FastifyBaseLogger
  ) {
    this.ledger = new LedgerEngine(db)
    this.wallets = new WalletEngine(db)
    this.fraud = new FraudEngine(db)
    this.providers = new ProviderRegistry(config, log)
    this.escrow = new EscrowEngine(db)
    this.audit = new AuditService(db)
    this.invoices = new InvoiceService(db, log)
  }

  async checkout(input: GatewayCheckoutInput): Promise<{
    payment: GatewayPayment
    checkoutUrl: string
    providerPayload?: Record<string, unknown>
  }> {
    const merchant = await this.db
      .from('merchants')
      .select('*')
      .eq('id', input.merchantId)
      .eq('status', 'active')
      .single()
    if (merchant.error || !merchant.data) throw new Error('Merchant not found or inactive')

    const amountMinor = BigInt(Math.round(input.amount * 100))
    const feeBps = merchant.data.fee_rate_bps as number
    const feeAmount = (amountMinor * BigInt(feeBps)) / 10000n
    const netAmount = amountMinor - feeAmount

    let customerId: string | null = null
    if (input.customerPhone || input.customerEmail) {
      let query = this.db.from('customers').select('id').eq('merchant_id', input.merchantId)
      if (input.customerPhone) query = query.eq('phone', input.customerPhone)
      const { data: existing } = await query.maybeSingle()
      if (existing) {
        customerId = existing.id
      } else {
        const { data: inserted } = await this.db
          .from('customers')
          .insert({
            merchant_id: input.merchantId,
            phone: input.customerPhone ?? null,
            email: input.customerEmail ?? null
          })
          .select('id')
          .single()
        customerId = inserted?.id ?? null
      }
    }

    const checkoutReference = `NX-${randomUUID().slice(0, 8).toUpperCase()}`
    const { data: payment, error } = await this.db
      .from('payments')
      .insert({
        merchant_id: input.merchantId,
        customer_id: customerId,
        amount: Number(amountMinor),
        currency: input.currency,
        fee_amount: Number(feeAmount),
        net_amount: Number(netAmount),
        status: 'pending',
        payment_method: input.paymentMethod,
        checkout_reference: checkoutReference,
        external_reference: input.externalReference ?? null,
        customer_phone: input.customerPhone ?? null,
        customer_email: input.customerEmail ?? null,
        idempotency_key: input.idempotencyKey ?? randomUUID(),
        metadata: { ...(input.metadata ?? {}), useEscrow: input.useEscrow ?? false }
      })
      .select('*')
      .single()
    if (error) throw error

    const fraudResult = await this.fraud.scoreCheckout({
      merchantId: input.merchantId,
      paymentId: payment.id,
      amount: amountMinor,
      customerPhone: input.customerPhone
    })
    if (fraudResult.decision === 'block') {
      await this.db.from('payments').update({ status: 'failed' }).eq('id', payment.id)
      throw new Error(`Payment blocked by fraud engine (score ${fraudResult.score})`)
    }

    const provider = this.providers.get(input.paymentMethod)
    const init = await provider.initiatePayment({
      paymentId: payment.id,
      amount: amountMinor,
      currency: input.currency,
      customerPhone: input.customerPhone,
      customerEmail: input.customerEmail,
      checkoutReference,
      metadata: input.metadata
    })

    await this.db.from('payment_attempts').insert({
      payment_id: payment.id,
      provider: input.paymentMethod,
      provider_reference: init.providerReference ?? null,
      status: 'pending',
      raw_payload: init.rawPayload ?? {}
    })

    await this.db
      .from('payments')
      .update({ status: 'processing' })
      .eq('id', payment.id)

    await this.audit.log({
      actor: input.merchantId,
      action: 'checkout.created',
      entityType: 'payment',
      entityId: payment.id,
      payload: { checkoutReference, method: input.paymentMethod }
    })

    return {
      payment: payment as GatewayPayment,
      checkoutUrl: init.redirectUrl ?? `/pay/${checkoutReference}`,
      providerPayload: init.rawPayload
    }
  }

  async completePayment(
    paymentId: string,
    verifyResult: {
      success: boolean
      providerReference?: string
      receiptNumber?: string
      amount?: bigint
      phone?: string
      rawPayload?: Record<string, unknown>
      failureReason?: string
    }
  ): Promise<GatewayPayment> {
    const { data: payment, error } = await this.db
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .single()
    if (error || !payment) throw new Error('Payment not found')

    if (payment.status === 'completed') return payment as GatewayPayment

    await this.db
      .from('payment_attempts')
      .update({
        status: verifyResult.success ? 'success' : 'failed',
        provider_reference: verifyResult.providerReference ?? null,
        raw_payload: verifyResult.rawPayload ?? {}
      })
      .eq('payment_id', paymentId)

    if (!verifyResult.success) {
      await this.db.from('payments').update({ status: 'failed' }).eq('id', paymentId)
      return (await this.db.from('payments').select('*').eq('id', paymentId).single()).data as GatewayPayment
    }

    const amount = BigInt(payment.amount)
    const fee = BigInt(payment.fee_amount)
    const net = BigInt(payment.net_amount)
    const currency = payment.currency as string
    const cashAccount = cashAccountForMethod(payment.payment_method as PaymentMethod)
    const useEscrow = (payment.metadata as Record<string, unknown>)?.useEscrow === true

    if (useEscrow) {
      await this.ledger.createLedgerTransaction({
        reference: `payment-${payment.id}`,
        currency,
        description: 'Customer payment to escrow',
        lines: [
          { ledgerAccountCode: cashAccount, entryType: 'debit', amount },
          { ledgerAccountCode: LEDGER_ACCOUNT_CODES.ESCROW_LIABILITY, entryType: 'credit', amount }
        ]
      })
      await this.escrow.createFromPayment(payment.id)
    } else {
      await this.ledger.createLedgerTransaction({
        reference: `payment-${payment.id}`,
        currency,
        description: 'Customer payment allocation',
        lines: [
          { ledgerAccountCode: cashAccount, entryType: 'debit', amount },
          { ledgerAccountCode: LEDGER_ACCOUNT_CODES.MERCHANT_PAYABLE, entryType: 'credit', amount: net },
          { ledgerAccountCode: LEDGER_ACCOUNT_CODES.PLATFORM_REVENUE, entryType: 'credit', amount: fee }
        ]
      })
      await this.wallets.creditWallet(
        'merchant',
        payment.merchant_id,
        currency,
        net,
        `payment-${payment.id}`
      )
    }

    await this.db
      .from('payments')
      .update({
        status: 'completed',
        metadata: {
          ...(payment.metadata as object),
          mpesa_receipt: verifyResult.receiptNumber,
          payer_phone: verifyResult.phone ?? payment.customer_phone
        }
      })
      .eq('id', paymentId)

    await this.invoices.generateForPayment(paymentId).catch(() => undefined)

    return (await this.db.from('payments').select('*').eq('id', paymentId).single()).data as GatewayPayment
  }

  getProviderRegistry() {
    return this.providers
  }
}
