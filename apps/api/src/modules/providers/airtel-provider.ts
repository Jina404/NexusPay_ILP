import { randomUUID } from 'node:crypto'
import type {
  PaymentProvider,
  ProviderInitContext,
  ProviderInitResult,
  ProviderRefundContext,
  ProviderRefundResult,
  ProviderVerifyContext,
  ProviderVerifyResult
} from './types.js'

export class AirtelProvider implements PaymentProvider {
  readonly method = 'airtel' as const

  async initiatePayment(ctx: ProviderInitContext): Promise<ProviderInitResult> {
    const ref = `airtel-${randomUUID()}`
    return {
      providerReference: ref,
      redirectUrl: `https://sandbox.airtel.africa/pay/${ref}?amount=${ctx.amount}&ref=${ctx.checkoutReference}`,
      rawPayload: { stub: true, provider: 'airtel' }
    }
  }

  async verifyPayment(ctx: ProviderVerifyContext): Promise<ProviderVerifyResult> {
    const body = ctx.rawPayload as { status?: string; transactionId?: string }
    const success = body.status === 'success' || body.status === 'TS'
    return {
      success,
      providerReference: body.transactionId,
      rawPayload: body as Record<string, unknown>,
      failureReason: success ? undefined : 'Airtel payment failed'
    }
  }

  async refundPayment(ctx: ProviderRefundContext): Promise<ProviderRefundResult> {
    return { success: true, providerReference: `airtel-refund-${randomUUID()}` }
  }
}
