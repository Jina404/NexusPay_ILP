export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'abandoned'
export type LedgerType = 'payment' | 'payout' | 'refund' | 'settlement' | 'fx'

export interface DashboardMetrics {
  totalVolume: number
  totalRevenue: number
  successfulPayments: number
  failedPayments: number
  pendingSettlements: number
  walletBalanceTotal: number
}

export interface ChartPoint {
  label: string
  value: number
}

export interface CurrencyShare {
  currency: string
  percent: number
}

export interface DashboardCharts {
  volumeSeries: ChartPoint[]
  revenueSeries: ChartPoint[]
  currencyDistribution: CurrencyShare[]
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

export interface PaymentRow {
  id: string
  customer: string
  amount: number
  currency: string
  method: string
  status: string
  date: string
  reference?: string
}

export interface CustomerRow {
  id: string
  name: string
  email: string
  phone: string
  transactions: number
  lifetimeValue: number
  lastActivity: string | null
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
  method: string
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
  status: string
  reason: string
  date: string
}

export interface EscrowRow {
  id: string
  paymentId: string
  amount: number
  currency: string
  status: string
  createdAt: string
}

export interface ExchangeRateRow {
  pair: string
  rate: number
  base: string
  quote: string
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
