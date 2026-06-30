export type MerchantStatus = 'pending' | 'active' | 'suspended' | 'closed'
export type WalletOwnerType = 'merchant' | 'customer' | 'platform' | 'escrow' | 'settlement'
export type GatewayPaymentStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'expired'
  | 'refunded'
  | 'partially_refunded'
export type PaymentMethod = 'mpesa' | 'airtel' | 'card' | 'bank'
export type PayoutDestinationType = 'bank' | 'mpesa' | 'airtel_wallet'
export type SettlementMethod = 'local' | 'cross_border_ilp' | 'manual'
export type FraudDecision = 'allow' | 'review' | 'block'
export type LedgerEntryType = 'debit' | 'credit'

export interface Merchant {
  id: string
  business_name: string
  email: string
  phone: string | null
  status: MerchantStatus
  country: string
  settlement_currency: string
  fee_rate_bps: number
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface GatewayPayment {
  id: string
  merchant_id: string
  customer_id: string | null
  amount: number
  currency: string
  fee_amount: number
  net_amount: number
  status: GatewayPaymentStatus
  payment_method: PaymentMethod
  checkout_reference: string
  external_reference: string | null
  customer_phone: string | null
  customer_email: string | null
  idempotency_key: string | null
  metadata: Record<string, unknown>
  ilp_payment_id: string | null
  created_at: string
  updated_at: string
}

export interface LedgerLine {
  ledgerAccountCode: string
  entryType: LedgerEntryType
  amount: bigint
}

export const PLATFORM_OWNER_ID = '00000000-0000-0000-0000-000000000001'

export const LEDGER_ACCOUNT_CODES = {
  CASH_MPESA: 'cash_mpesa',
  CASH_AIRTEL: 'cash_airtel',
  CASH_CARD: 'cash_card',
  CASH_BANK: 'cash_bank',
  MERCHANT_PAYABLE: 'merchant_payable',
  ESCROW_LIABILITY: 'escrow_liability',
  SETTLEMENT_CLEARING: 'settlement_clearing',
  PLATFORM_REVENUE: 'platform_revenue',
  PAYOUT_FEES: 'payout_fees'
} as const
