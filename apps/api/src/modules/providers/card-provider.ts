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

export class CardProvider implements PaymentProvider {
  readonly method = 'card' as const

  async initiatePayment(ctx: ProviderInitContext): Promise<ProviderInitResult> {
    const ref = `card-${randomUUID()}`
    return {
      providerReference: ref,
      redirectUrl: `/pay/card/${ref}?checkout=${ctx.checkoutReference}`,
      rawPayload: { stub: true, provider: 'card' }
    }
  }

  async verifyPayment(ctx: ProviderVerifyContext): Promise<ProviderVerifyResult> {
    const body = ctx.rawPayload as { status?: string; authorizationCode?: string }
    const success = body.status === 'authorized' || body.status === 'captured'
    return {
      success,
      providerReference: body.authorizationCode,
      rawPayload: body as Record<string, unknown>
    }
  }

  async refundPayment(ctx: ProviderRefundContext): Promise<ProviderRefundResult> {
    return { success: true, providerReference: `card-refund-${randomUUID()}` }
  }
}
