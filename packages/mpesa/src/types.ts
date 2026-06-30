export interface MpesaConfig {
  consumerKey: string
  consumerSecret: string
  passkey: string
  shortcode: string
  environment: 'sandbox' | 'production'
  callbackUrl: string
  initiatorName?: string
  securityCredential?: string
  b2cShortcode?: string
  b2cResultUrl?: string
  b2bResultUrl?: string
  reversalResultUrl?: string
  validationUrl?: string
  confirmationUrl?: string
}

export interface StkPushInput {
  amount: number
  phone: string
  accountReference: string
  transactionDesc: string
}

export interface StkPushResult {
  merchantRequestId: string
  checkoutRequestId: string
  responseCode: string
  responseDescription: string
  customerMessage: string
}

export interface StkQueryResult {
  responseCode: string
  responseDescription: string
  merchantRequestId: string
  checkoutRequestId: string
  resultCode: string
  resultDesc: string
}

export interface StkCallbackBody {
  Body: {
    stkCallback: {
      MerchantRequestID: string
      CheckoutRequestID: string
      ResultCode: number
      ResultDesc: string
      CallbackMetadata?: {
        Item: Array<{ Name: string; Value?: string | number }>
      }
    }
  }
}

export interface ParsedStkCallback {
  merchantRequestId: string
  checkoutRequestId: string
  resultCode: number
  resultDesc: string
  mpesaReceiptNumber?: string
  amount?: number
  phoneNumber?: string
}

export const BASE_URLS = {
  sandbox: 'https://sandbox.safaricom.co.ke',
  production: 'https://api.safaricom.co.ke'
} as const
