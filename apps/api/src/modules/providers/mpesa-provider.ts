import { randomUUID } from 'node:crypto'
import { createMpesaClient, parseStkCallback } from '@nexuspay/mpesa'
import type { FastifyBaseLogger } from 'fastify'
import type { AppConfig } from '../../config.js'
import type {
  PaymentProvider,
  ProviderInitContext,
  ProviderInitResult,
  ProviderRefundContext,
  ProviderRefundResult,
  ProviderVerifyContext,
  ProviderVerifyResult
} from './types.js'

export class MpesaProvider implements PaymentProvider {
  readonly method = 'mpesa' as const
  private readonly mpesa

  constructor(
    private readonly config: AppConfig,
    private readonly log: FastifyBaseLogger
  ) {
    this.mpesa = createMpesaClient({
      consumerKey: config.MPESA_CONSUMER_KEY,
      consumerSecret: config.MPESA_CONSUMER_SECRET,
      passkey: config.MPESA_PASSKEY,
      shortcode: config.MPESA_SHORTCODE,
      environment: config.MPESA_ENVIRONMENT,
      callbackUrl: config.MPESA_CALLBACK_URL,
      initiatorName: config.MPESA_INITIATOR_NAME,
      securityCredential: config.MPESA_SECURITY_CREDENTIAL,
      b2cShortcode: config.MPESA_B2C_SHORTCODE,
      b2cResultUrl: config.MPESA_B2C_RESULT_URL,
      b2bResultUrl: config.MPESA_B2B_RESULT_URL,
      reversalResultUrl: config.MPESA_REVERSAL_RESULT_URL,
      validationUrl: config.MPESA_VALIDATION_URL,
      confirmationUrl: config.MPESA_CONFIRMATION_URL
    })
  }

  getClient() {
    return this.mpesa
  }

  async stkPushQuery(checkoutRequestId: string) {
    return this.mpesa.stkPushQuery(checkoutRequestId)
  }

  async b2cPayment(phone: string, amountMajor: number, remarks?: string) {
    return this.mpesa.b2cPayment({ phone, amount: amountMajor, remarks })
  }

  async initiatePayment(ctx: ProviderInitContext): Promise<ProviderInitResult> {
    if (!ctx.customerPhone) throw new Error('customerPhone required for M-Pesa')
    const amountMajor = Number(ctx.amount) / 100
    const stk = await this.mpesa.stkPush({
      phone: ctx.customerPhone,
      amount: amountMajor,
      accountReference: ctx.checkoutReference.slice(0, 12),
      transactionDesc: 'NexusPay checkout'
    })
    this.log.info({ paymentId: ctx.paymentId, checkoutRequestId: stk.checkoutRequestId }, 'STK initiated')
    return {
      providerReference: stk.checkoutRequestId,
      rawPayload: {
        merchantRequestId: stk.merchantRequestId,
        checkoutRequestId: stk.checkoutRequestId,
        responseCode: stk.responseCode,
        responseDescription: stk.responseDescription,
        customerMessage: stk.customerMessage
      }
    }
  }

  async verifyPayment(ctx: ProviderVerifyContext): Promise<ProviderVerifyResult> {
    const parsed = parseStkCallback(ctx.rawPayload as Parameters<typeof parseStkCallback>[0])
    if (parsed.resultCode !== 0) {
      return {
        success: false,
        failureReason: parsed.resultDesc,
        providerReference: parsed.checkoutRequestId,
        rawPayload: parsed as unknown as Record<string, unknown>
      }
    }
    return {
      success: true,
      providerReference: parsed.checkoutRequestId,
      receiptNumber: parsed.mpesaReceiptNumber,
      amount: parsed.amount ? BigInt(Math.round(parsed.amount * 100)) : undefined,
      phone: parsed.phoneNumber,
      rawPayload: parsed as unknown as Record<string, unknown>
    }
  }

  async refundPayment(ctx: ProviderRefundContext): Promise<ProviderRefundResult> {
    this.log.warn({ paymentId: ctx.paymentId }, 'M-Pesa reversal not configured; recording refund intent')
    return {
      success: true,
      providerReference: `reversal-${randomUUID()}`,
      rawPayload: { stub: true, amount: ctx.amount.toString() }
    }
  }
}

export { parseStkCallback }
