export enum WebhookEventType {
  IncomingPaymentCreated = 'incoming_payment.created',
  IncomingPaymentCompleted = 'incoming_payment.completed',
  IncomingPaymentExpired = 'incoming_payment.expired',
  IncomingPaymentPartialPaymentReceived = 'incoming_payment.partial_payment_received',
  OutgoingPaymentCreated = 'outgoing_payment.created',
  OutgoingPaymentCompleted = 'outgoing_payment.completed',
  OutgoingPaymentFailed = 'outgoing_payment.failed',
  WalletAddressWebMonetization = 'wallet_address.web_monetization',
  WalletAddressNotFound = 'wallet_address.not_found',
  AssetLiquidityLow = 'asset.liquidity_low',
  PeerLiquidityLow = 'peer.liquidity_low'
}

export type PaymentStatus =
  | 'created'
  | 'awaiting_mpesa'
  | 'funded'
  | 'completed'
  | 'failed'
  | 'expired'

export interface AmountJSON {
  value: string
  assetCode: string
  assetScale: number
}

export interface RafikiWebhook {
  id: string
  type: WebhookEventType | string
  data: Record<string, unknown>
}

export interface Amount {
  value: bigint
  assetCode: string
  assetScale: number
}

export function parseAmount(amount: AmountJSON): Amount {
  return {
    value: BigInt(amount.value),
    assetCode: amount.assetCode,
    assetScale: amount.assetScale
  }
}

export function formatAmountMinorUnits(
  majorUnits: number,
  scale: number
): string {
  const factor = 10 ** scale
  return String(Math.round(majorUnits * factor))
}

export function toMajorUnits(value: bigint, scale: number): number {
  return Number(value) / 10 ** scale
}

export * from './schemas.js'
export * from './gateway/index.js'
