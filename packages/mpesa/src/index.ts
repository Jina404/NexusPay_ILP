export type {
  MpesaConfig,
  StkPushInput,
  StkPushResult,
  StkQueryResult,
  StkCallbackBody,
  ParsedStkCallback
} from './types.js'

import type { StkCallbackBody, ParsedStkCallback, MpesaConfig } from './types.js'
import { createMpesaClient, MpesaClient } from './mpesa-client.js'

export { MpesaClient, createMpesaClient }

export function parseStkCallback(body: StkCallbackBody): ParsedStkCallback {
  const callback = body.Body.stkCallback
  const metadata = callback.CallbackMetadata?.Item ?? []
  const getMeta = (name: string) =>
    metadata.find((item) => item.Name === name)?.Value

  return {
    merchantRequestId: callback.MerchantRequestID,
    checkoutRequestId: callback.CheckoutRequestID,
    resultCode: callback.ResultCode,
    resultDesc: callback.ResultDesc,
    mpesaReceiptNumber: getMeta('MpesaReceiptNumber') as string | undefined,
    amount: getMeta('Amount') as number | undefined,
    phoneNumber: getMeta('PhoneNumber') as string | undefined
  }
}

// Re-export for backward compatibility
export type { MpesaConfig as MpesaClientConfig }
