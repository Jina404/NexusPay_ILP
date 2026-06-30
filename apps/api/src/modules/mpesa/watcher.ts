import type { SupabaseClient } from '@supabase/supabase-js'
import type { FastifyBaseLogger } from 'fastify'
import type { AppConfig } from '../../config.js'
import { CheckoutEngine } from '../checkout/service.js'
import { PaymentLinkService } from '../payment-links/service.js'
import { MpesaProvider } from '../providers/mpesa-provider.js'

const POLL_INTERVAL_MS = 5_000
const QUERY_WINDOW_MS = 120_000

export class MpesaWatcher {
  private readonly checkout: CheckoutEngine
  private readonly mpesa: MpesaProvider
  private readonly paymentLinks: PaymentLinkService
  private pollTimer?: ReturnType<typeof setInterval>
  private timeoutTimer?: ReturnType<typeof setInterval>

  constructor(
    private readonly db: SupabaseClient,
    private readonly config: AppConfig,
    private readonly log: FastifyBaseLogger
  ) {
    this.checkout = new CheckoutEngine(db, config, log)
    this.mpesa = new MpesaProvider(config, log)
    this.paymentLinks = new PaymentLinkService(db, config, log)
  }

  start() {
    this.pollTimer = setInterval(() => void this.pollStkQueries(), POLL_INTERVAL_MS)
    this.timeoutTimer = setInterval(() => void this.failStalePayments(), 30_000)
    this.log.info('M-Pesa STK watcher started')
  }

  stop() {
    if (this.pollTimer) clearInterval(this.pollTimer)
    if (this.timeoutTimer) clearInterval(this.timeoutTimer)
  }

  private async pollStkQueries() {
    const since = new Date(Date.now() - QUERY_WINDOW_MS).toISOString()

    const { data: attempts } = await this.db
      .from('payment_attempts')
      .select('payment_id, provider_reference, created_at')
      .eq('provider', 'mpesa')
      .eq('status', 'pending')
      .gte('created_at', since)

    for (const attempt of attempts ?? []) {
      const { data: payment } = await this.db
        .from('payments')
        .select('status, payment_method')
        .eq('id', attempt.payment_id)
        .maybeSingle()

      if (!payment || payment.status !== 'processing' || payment.payment_method !== 'mpesa') continue
      if (!attempt.provider_reference) continue

      try {
        const query = await this.mpesa.stkPushQuery(attempt.provider_reference)
        const resultCode = Number(query.resultCode)

        if (resultCode === 0) {
          const payment = await this.checkout.completePayment(attempt.payment_id, {
            success: true,
            providerReference: attempt.provider_reference,
            rawPayload: { fromStkQuery: true, ...query }
          })
          await this.paymentLinks.syncPaymentStatus(payment.id, payment.status)
          this.log.info(
            { paymentId: attempt.payment_id, checkoutRequestId: attempt.provider_reference },
            'STK query confirmed payment'
          )
        } else if (resultCode !== 1037) {
          // 1037 = still processing; other codes are terminal failures/cancellations
          if ([1032, 1, 2001].includes(resultCode) || query.resultDesc?.toLowerCase().includes('cancel')) {
            const payment = await this.checkout.completePayment(attempt.payment_id, {
              success: false,
              providerReference: attempt.provider_reference,
              failureReason: query.resultDesc,
              rawPayload: { fromStkQuery: true, ...query }
            })
            await this.paymentLinks.syncPaymentStatus(payment.id, payment.status)
          }
        }
      } catch (err) {
        this.log.warn({ err, paymentId: attempt.payment_id }, 'STK query poll failed')
      }
    }
  }

  private async failStalePayments() {
    const cutoff = new Date(Date.now() - this.config.STK_TIMEOUT_MS).toISOString()

    const { data: stale } = await this.db
      .from('payments')
      .select('id')
      .eq('status', 'processing')
      .eq('payment_method', 'mpesa')
      .lt('updated_at', cutoff)

    for (const payment of stale ?? []) {
      await this.db.from('payments').update({ status: 'failed' }).eq('id', payment.id)
      await this.db
        .from('payment_attempts')
        .update({ status: 'failed', raw_payload: { reason: 'STK timeout' } })
        .eq('payment_id', payment.id)
      await this.paymentLinks.syncPaymentStatus(payment.id, 'failed')
      this.log.info({ paymentId: payment.id }, 'Gateway M-Pesa payment timed out')
    }
  }
}
