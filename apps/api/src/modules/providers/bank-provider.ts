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

export class BankProvider implements PaymentProvider {
  readonly method = 'bank' as const

  async initiatePayment(ctx: ProviderInitContext): Promise<ProviderInitResult> {
    const ref = `bank-${randomUUID().slice(0, 8).toUpperCase()}`
    return {
      providerReference: ref,
      rawPayload: {
        stub: true,
        provider: 'bank',
        virtualAccount: `NX${ref}`,
        amount: ctx.amount.toString(),
        reference: ctx.checkoutReference
      }
    }
  }

  async verifyPayment(ctx: ProviderVerifyContext): Promise<ProviderVerifyResult> {
    const body = ctx.rawPayload as { status?: string; bankReference?: string }
    const success = body.status === 'confirmed'
    return {
      success,
      providerReference: body.bankReference,
      rawPayload: body as Record<string, unknown>
    }
  }

  async refundPayment(ctx: ProviderRefundContext): Promise<ProviderRefundResult> {
    return { success: true, providerReference: `bank-refund-${randomUUID()}` }
  }
}
