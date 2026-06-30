export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'abandoned'
export type LedgerType = 'payment' | 'payout' | 'refund' | 'settlement' | 'fx'
export type SettlementMethod = 'local' | 'cross_border' | 'ilp'

export interface DashboardMetrics {
  totalVolume: number
  totalRevenue: number
  successfulPayments: number
  failedPayments: number
  pendingSettlements: number
  walletBalanceTotal: number
}

export interface PaymentRow {
  id: string
  customer: string
  amount: number
  currency: string
  method: string
  status: PaymentStatus
  date: string
}

export interface TransactionRow {
  id: string
  type: LedgerType
  counterparty: string
  amount: number
  currency: string
  status: string
  date: string
}

export interface CustomerRow {
  id: string
  name: string
  email: string
  phone: string
  transactions: number
  lifetimeValue: number
  lastActivity: string
}

export interface WalletRow {
  currency: string
  available: number
  pending: number
  reserved: number
}

export interface SettlementRow {
  id: string
  amount: number
  sourceCurrency: string
  destinationCurrency: string
  method: SettlementMethod
  status: string
  date: string
}

export interface PayoutRow {
  id: string
  recipient: string
  amount: number
  currency: string
  method: string
  status: string
  date: string
}

export interface RefundRow {
  id: string
  paymentId: string
  customer: string
  amount: number
  currency: string
  status: 'pending' | 'completed' | 'failed' | 'rejected'
  reason: string
  date: string
}

export interface EscrowRow {
  id: string
  buyer: string
  seller: string
  amount: number
  currency: string
  status: 'held' | 'pending_release' | 'released' | 'refunded'
  createdAt: string
}

export interface ExchangeRateRow {
  pair: string
  rate: number
  spread: number
  updatedAt: string
}

export interface ConversionRow {
  id: string
  from: string
  to: string
  fromAmount: number
  toAmount: number
  rate: number
  date: string
}

export interface ApiKeyRow {
  id: string
  name: string
  prefix: string
  createdAt: string
  lastUsed: string | null
}

export interface WebhookRow {
  id: string
  url: string
  events: string[]
  status: string
  lastDelivery: string
}

export interface ApiLogRow {
  id: string
  method: string
  path: string
  status: number
  timestamp: string
}

export interface AlertRow {
  id: string
  type: 'warning' | 'info' | 'error'
  message: string
  time: string
}

export const dashboardMetrics: DashboardMetrics = {
  totalVolume: 12_500_000,
  totalRevenue: 375_000,
  successfulPayments: 842,
  failedPayments: 23,
  pendingSettlements: 4,
  walletBalanceTotal: 4_850_000
}

export const volumeSeries = [
  { label: 'Mon', value: 420 },
  { label: 'Tue', value: 680 },
  { label: 'Wed', value: 510 },
  { label: 'Thu', value: 890 },
  { label: 'Fri', value: 720 },
  { label: 'Sat', value: 950 },
  { label: 'Sun', value: 640 }
]

export const revenueSeries = [
  { label: 'Mon', value: 12 },
  { label: 'Tue', value: 20 },
  { label: 'Wed', value: 15 },
  { label: 'Thu', value: 26 },
  { label: 'Fri', value: 21 },
  { label: 'Sat', value: 28 },
  { label: 'Sun', value: 19 }
]

export const currencyDistribution = [
  { currency: 'KES', percent: 58 },
  { currency: 'UGX', percent: 22 },
  { currency: 'USD', percent: 14 },
  { currency: 'SSP', percent: 6 }
]

export const payments: PaymentRow[] = [
  { id: 'pay_8f2k9m', customer: 'Jane Wanjiku', amount: 185_000, currency: 'KES', method: 'mpesa', status: 'completed', date: '2026-06-23T09:12:00Z' },
  { id: 'pay_3n7p1q', customer: 'Acme Supplies Ltd', amount: 2_400_000, currency: 'KES', method: 'bank', status: 'pending', date: '2026-06-23T08:45:00Z' },
  { id: 'pay_5x4r8t', customer: 'David Okello', amount: 450_000, currency: 'UGX', method: 'airtel', status: 'completed', date: '2026-06-22T16:30:00Z' },
  { id: 'pay_9m2k6v', customer: 'Sarah Kimani', amount: 12_500, currency: 'USD', method: 'card', status: 'failed', date: '2026-06-22T14:20:00Z' },
  { id: 'pay_1h8j3w', customer: 'Guest checkout', amount: 75_000, currency: 'KES', method: 'mpesa', status: 'abandoned', date: '2026-06-22T11:05:00Z' },
  { id: 'pay_7c5n0b', customer: 'Nairobi Tech Hub', amount: 890_000, currency: 'KES', method: 'mpesa', status: 'completed', date: '2026-06-21T18:00:00Z' }
]

export const transactions: TransactionRow[] = [
  { id: 'txn_a1', type: 'payment', counterparty: 'Jane Wanjiku', amount: 185_000, currency: 'KES', status: 'completed', date: '2026-06-23T09:12:00Z' },
  { id: 'txn_a2', type: 'payout', counterparty: 'Vendor #4421', amount: 120_000, currency: 'KES', status: 'completed', date: '2026-06-23T07:30:00Z' },
  { id: 'txn_a3', type: 'settlement', counterparty: 'KES → UGX', amount: 500_000, currency: 'KES', status: 'processing', date: '2026-06-22T22:00:00Z' },
  { id: 'txn_a4', type: 'refund', counterparty: 'Sarah Kimani', amount: 12_500, currency: 'USD', status: 'completed', date: '2026-06-22T15:00:00Z' },
  { id: 'txn_a5', type: 'fx', counterparty: 'KES/USD', amount: 250_000, currency: 'KES', status: 'completed', date: '2026-06-22T10:15:00Z' },
  { id: 'txn_a6', type: 'payment', counterparty: 'David Okello', amount: 450_000, currency: 'UGX', status: 'completed', date: '2026-06-22T16:30:00Z' }
]

export const customers: CustomerRow[] = [
  { id: 'cus_01', name: 'Jane Wanjiku', email: 'jane@example.com', phone: '+254712345678', transactions: 24, lifetimeValue: 1_240_000, lastActivity: '2026-06-23T09:12:00Z' },
  { id: 'cus_02', name: 'Acme Supplies Ltd', email: 'billing@acme.co.ke', phone: '+254700111222', transactions: 56, lifetimeValue: 8_900_000, lastActivity: '2026-06-23T08:45:00Z' },
  { id: 'cus_03', name: 'David Okello', email: 'david@ugmail.com', phone: '+256701234567', transactions: 8, lifetimeValue: 2_100_000, lastActivity: '2026-06-22T16:30:00Z' },
  { id: 'cus_04', name: 'Sarah Kimani', email: 'sarah.k@corp.io', phone: '+254733445566', transactions: 3, lifetimeValue: 37_500, lastActivity: '2026-06-22T14:20:00Z' }
]

export const wallets: WalletRow[] = [
  { currency: 'KES', available: 2_450_000, pending: 185_000, reserved: 120_000 },
  { currency: 'UGX', available: 12_800_000, pending: 450_000, reserved: 0 },
  { currency: 'USD', available: 8_420, pending: 1_250, reserved: 500 },
  { currency: 'SSP', available: 340_000, pending: 0, reserved: 25_000 }
]

export const settlements: SettlementRow[] = [
  { id: 'stl_001', amount: 500_000, sourceCurrency: 'KES', destinationCurrency: 'UGX', method: 'cross_border', status: 'processing', date: '2026-06-22T22:00:00Z' },
  { id: 'stl_002', amount: 1_200_000, sourceCurrency: 'KES', destinationCurrency: 'KES', method: 'local', status: 'completed', date: '2026-06-21T18:00:00Z' },
  { id: 'stl_003', amount: 250_000, sourceCurrency: 'KES', destinationCurrency: 'USD', method: 'ilp', status: 'pending', date: '2026-06-23T06:00:00Z' },
  { id: 'stl_004', amount: 180_000, sourceCurrency: 'KES', destinationCurrency: 'SSP', method: 'cross_border', status: 'completed', date: '2026-06-20T12:00:00Z' }
]

export const payouts: PayoutRow[] = [
  { id: 'po_101', recipient: 'Supplier Co.', amount: 120_000, currency: 'KES', method: 'bank', status: 'completed', date: '2026-06-23T07:30:00Z' },
  { id: 'po_102', recipient: 'John Freelancer', amount: 45_000, currency: 'KES', method: 'mpesa', status: 'pending', date: '2026-06-23T10:00:00Z' },
  { id: 'po_103', recipient: 'UG Vendor', amount: 800_000, currency: 'UGX', method: 'airtel', status: 'completed', date: '2026-06-22T14:00:00Z' },
  { id: 'po_104', recipient: 'Failed payout test', amount: 5_000, currency: 'KES', method: 'mpesa', status: 'failed', date: '2026-06-21T09:00:00Z' }
]

export const refunds: RefundRow[] = [
  { id: 'ref_01', paymentId: 'pay_9m2k6v', customer: 'Sarah Kimani', amount: 12_500, currency: 'USD', status: 'pending', reason: 'Duplicate charge', date: '2026-06-22T15:30:00Z' },
  { id: 'ref_02', paymentId: 'pay_7c5n0b', customer: 'Nairobi Tech Hub', amount: 50_000, currency: 'KES', status: 'completed', reason: 'Partial refund', date: '2026-06-21T11:00:00Z' },
  { id: 'ref_03', paymentId: 'pay_3n7p1q', customer: 'Acme Supplies Ltd', amount: 200_000, currency: 'KES', status: 'failed', reason: 'Insufficient balance', date: '2026-06-20T16:00:00Z' }
]

export const escrows: EscrowRow[] = [
  { id: 'esc_01', buyer: 'Jane Wanjiku', seller: 'Freelancer Pro', amount: 85_000, currency: 'KES', status: 'held', createdAt: '2026-06-23T08:00:00Z' },
  { id: 'esc_02', buyer: 'Acme Supplies', seller: 'Logistics Ltd', amount: 320_000, currency: 'KES', status: 'pending_release', createdAt: '2026-06-22T12:00:00Z' },
  { id: 'esc_03', buyer: 'David Okello', seller: 'Design Studio', amount: 150_000, currency: 'UGX', status: 'released', createdAt: '2026-06-20T10:00:00Z' },
  { id: 'esc_04', buyer: 'Guest', seller: 'Shop Vendor', amount: 25_000, currency: 'KES', status: 'refunded', createdAt: '2026-06-18T14:00:00Z' }
]

export const exchangeRates: ExchangeRateRow[] = [
  { pair: 'KES/USD', rate: 0.0077, spread: 0.5, updatedAt: '2026-06-23T10:00:00Z' },
  { pair: 'KES/UGX', rate: 28.5, spread: 1.2, updatedAt: '2026-06-23T10:00:00Z' },
  { pair: 'KES/SSP', rate: 4.2, spread: 2.0, updatedAt: '2026-06-23T10:00:00Z' },
  { pair: 'KES/EUR', rate: 0.0071, spread: 0.6, updatedAt: '2026-06-23T10:00:00Z' }
]

export const conversionHistory: ConversionRow[] = [
  { id: 'fx_01', from: 'KES', to: 'USD', fromAmount: 250_000, toAmount: 1_925, rate: 0.0077, date: '2026-06-22T10:15:00Z' },
  { id: 'fx_02', from: 'KES', to: 'UGX', fromAmount: 500_000, toAmount: 14_250_000, rate: 28.5, date: '2026-06-22T22:00:00Z' },
  { id: 'fx_03', from: 'USD', to: 'KES', fromAmount: 500, toAmount: 64_935, rate: 129.87, date: '2026-06-21T09:00:00Z' }
]

export const apiKeys: ApiKeyRow[] = [
  { id: 'key_01', name: 'Production', prefix: 'np_live_8f2', createdAt: '2026-06-01T00:00:00Z', lastUsed: '2026-06-23T09:00:00Z' },
  { id: 'key_02', name: 'Staging', prefix: 'np_live_3n7', createdAt: '2026-06-15T00:00:00Z', lastUsed: null }
]

export const webhooks: WebhookRow[] = [
  { id: 'wh_01', url: 'https://api.example.com/nexuspay/webhooks', events: ['payment.completed', 'payment.failed'], status: 'active', lastDelivery: '2026-06-23T09:12:00Z' },
  { id: 'wh_02', url: 'https://staging.example.com/hooks', events: ['settlement.completed'], status: 'active', lastDelivery: '2026-06-22T22:00:00Z' }
]

export const apiLogs: ApiLogRow[] = [
  { id: 'log_01', method: 'POST', path: '/checkout', status: 200, timestamp: '2026-06-23T09:10:00Z' },
  { id: 'log_02', method: 'GET', path: '/gateway/payments/pay_8f2k9m', status: 200, timestamp: '2026-06-23T09:12:00Z' },
  { id: 'log_03', method: 'POST', path: '/payouts', status: 201, timestamp: '2026-06-23T07:28:00Z' },
  { id: 'log_04', method: 'POST', path: '/refunds', status: 400, timestamp: '2026-06-20T16:00:00Z' }
]

export const alerts: AlertRow[] = [
  { id: 'al_01', type: 'warning', message: 'Settlement stl_003 awaiting ILP confirmation', time: '2h ago' },
  { id: 'al_02', type: 'info', message: '3 payouts scheduled for today', time: '4h ago' },
  { id: 'al_03', type: 'error', message: 'Refund ref_03 failed — retry required', time: '1d ago' }
]

export const settlementSummary = {
  local: { count: 12, amount: 4_200_000 },
  crossBorder: { count: 5, amount: 1_800_000 },
  ilp: { count: 2, amount: 450_000, status: '1 pending' }
}

export function getCustomerById(id: string): CustomerRow | undefined {
  return customers.find((c) => c.id === id)
}

export function getCustomerTransactions(customerId: string): TransactionRow[] {
  const customer = getCustomerById(customerId)
  if (!customer) return []
  return transactions.filter((t) => t.counterparty === customer.name)
}
