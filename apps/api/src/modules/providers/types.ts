import type { PaymentMethod } from '@nexuspay/shared'

export interface ProviderInitContext {
  paymentId: string
  amount: bigint
  currency: string
  customerPhone?: string
  customerEmail?: string
  checkoutReference: string
  metadata?: Record<string, unknown>
}

export interface ProviderInitResult {
  providerReference?: string
  redirectUrl?: string
  rawPayload?: Record<string, unknown>
}

export interface ProviderVerifyContext {
  paymentId: string
  providerReference?: string
  rawPayload: unknown
}

export interface ProviderVerifyResult {
  success: boolean
  providerReference?: string
  receiptNumber?: string
  amount?: bigint
  phone?: string
  rawPayload?: Record<string, unknown>
  failureReason?: string
}

export interface ProviderRefundContext {
  paymentId: string
  amount: bigint
  currency: string
  providerReference?: string
  reason?: string
}

export interface ProviderRefundResult {
  success: boolean
  providerReference?: string
  rawPayload?: Record<string, unknown>
}

export interface PaymentProvider {
  readonly method: PaymentMethod
  initiatePayment(ctx: ProviderInitContext): Promise<ProviderInitResult>
  verifyPayment(ctx: ProviderVerifyContext): Promise<ProviderVerifyResult>
  refundPayment(ctx: ProviderRefundContext): Promise<ProviderRefundResult>
}
