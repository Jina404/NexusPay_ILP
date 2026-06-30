import { createClient, getApiUrl } from '@/lib/supabase'
import type {
  ApiKeyRow,
  ConversionRow,
  CustomerRow,
  DashboardCharts,
  DashboardMetrics,
  EscrowRow,
  ExchangeRateRow,
  PaymentRow,
  PayoutRow,
  RefundRow,
  SettlementRow,
  TransactionRow,
  WalletRow
} from '@/lib/merchant-types'

async function getAccessToken(): Promise<string | null> {
  const supabase = createClient()
  const {
    data: { session }
  } = await supabase.auth.getSession()
  return session?.access_token ?? null
}

function redirectToLogin() {
  if (typeof window === 'undefined') return
  const next = encodeURIComponent(window.location.pathname)
  window.location.href = `/login?next=${next}`
}

function withJsonBody(options?: RequestInit): RequestInit {
  const method = (options?.method ?? 'GET').toUpperCase()
  if (['POST', 'PUT', 'PATCH'].includes(method) && options?.body == null) {
    return { ...options, body: '{}' }
  }
  return options ?? {}
}

async function merchantFetch<T>(
  path: string,
  options?: RequestInit,
  retried = false
): Promise<{ data: T | null; error?: string }> {
  const token = await getAccessToken()
  if (!token) {
    redirectToLogin()
    return { data: null, error: 'Not authenticated' }
  }

  try {
    const requestOptions = withJsonBody(options)
    const res = await fetch(`${getApiUrl()}${path}`, {
      ...requestOptions,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...requestOptions.headers
      }
    })
    if (res.status === 401) {
      redirectToLogin()
      return { data: null, error: 'Not authenticated' }
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      const message = (body as { error?: string }).error ?? res.statusText

      if (
        !retried &&
        res.status === 403 &&
        message.toLowerCase().includes('no merchant account linked')
      ) {
        const boot = await fetch(`${getApiUrl()}/merchants/me/bootstrap`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: '{}'
        })
        if (boot.ok) {
          return merchantFetch<T>(path, options, true)
        }
      }

      return { data: null, error: message }
    }
    if (res.status === 204) return { data: null }
    return { data: (await res.json()) as T }
  } catch {
    return { data: null, error: 'Network error' }
  }
}

export interface PaymentLinkRow {
  id: string
  public_id: string
  publicId: string
  title: string
  description: string | null
  link_type: 'fixed' | 'open'
  amount: number | null
  currency: string
  status: string
  expires_at: string | null
  created_at: string
  paymentUrl: string
  paymentsCount: number
}

export interface PaymentLinkStats {
  totalLinks: number
  activeLinks: number
  totalPayments: number
  revenueCollected: number
  successRate: number
  revenueSeries: { label: string; value: number }[]
  paymentsSeries: { label: string; value: number }[]
}

export interface CreatePaymentLinkInput {
  title: string
  description?: string
  linkType: 'fixed' | 'open'
  amount?: number
  currency: string
  expiresAt?: string
}

export interface CustomerDetail extends CustomerRow {
  paymentHistory: Array<{
    id: string
    type: 'payment'
    amount: number
    currency: string
    status: string
    date: string
  }>
}

export const merchantApi = {
  bootstrap: async () =>
    merchantFetch<{ merchant: Record<string, unknown>; created: boolean; apiKey?: string }>(
      '/merchants/me/bootstrap',
      { method: 'POST' }
    ),

  getMe: async () => (await merchantFetch<Record<string, unknown>>('/merchants/me')).data,
  getStats: async () => (await merchantFetch<DashboardMetrics>('/merchants/me/stats')).data,
  getDashboardCharts: async () =>
    (await merchantFetch<DashboardCharts>('/merchants/me/dashboard-charts')).data,
  getPayments: async () => (await merchantFetch<PaymentRow[]>('/merchants/me/payments')).data,
  getTransactions: async () =>
    (await merchantFetch<TransactionRow[]>('/merchants/me/transactions')).data,
  getWallets: async () => (await merchantFetch<WalletRow[]>('/merchants/me/wallets')).data,
  getSettlements: async () =>
    (await merchantFetch<SettlementRow[]>('/merchants/me/settlements')).data,
  getPayouts: async () => (await merchantFetch<PayoutRow[]>('/merchants/me/payouts')).data,
  getRefunds: async () => (await merchantFetch<RefundRow[]>('/merchants/me/refunds')).data,
  getEscrows: async () => (await merchantFetch<EscrowRow[]>('/merchants/me/escrows')).data,
  getCustomers: async () => (await merchantFetch<CustomerRow[]>('/merchants/me/customers')).data,
  getCustomer: async (id: string) => {
    const result = await merchantFetch<CustomerDetail>(`/merchants/me/customers/${id}`)
    return result
  },
  getFxTransactions: async () =>
    (await merchantFetch<ConversionRow[]>('/merchants/me/fx-transactions')).data,
  getApiKeys: async () => (await merchantFetch<ApiKeyRow[]>('/merchants/me/api-keys')).data,
  regenerateApiKey: async () =>
    merchantFetch<{ apiKey: string }>('/merchants/me/api-keys/regenerate', { method: 'POST' }),
  getRates: async (base = 'KES') => {
    try {
      const res = await fetch(`${getApiUrl()}/rates?base=${base}`)
      if (!res.ok) return null
      const data = (await res.json()) as { base: string; rates: Record<string, number> }
      return Object.entries(data.rates).map(([quote, rate]) => ({
        pair: `${data.base}/${quote}`,
        rate,
        base: data.base,
        quote
      })) satisfies ExchangeRateRow[]
    } catch {
      return null
    }
  },

  getPaymentLinks: async () =>
    (await merchantFetch<PaymentLinkRow[]>('/payment-links')).data,
  getPaymentLinkStats: async (range = '7d') =>
    (await merchantFetch<PaymentLinkStats>(`/payment-links/stats?range=${range}`)).data,
  createPaymentLink: async (input: CreatePaymentLinkInput) =>
    merchantFetch<{ id: string; publicId: string; paymentUrl: string }>('/payment-links', {
      method: 'POST',
      body: JSON.stringify(input)
    }),
  updatePaymentLink: async (id: string, input: Partial<CreatePaymentLinkInput>) =>
    merchantFetch<PaymentLinkRow>(`/payment-links/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input)
    }),
  disablePaymentLink: async (id: string) =>
    merchantFetch<unknown>(`/payment-links/${id}/disable`, { method: 'POST' }),
  getPaymentLinkPayments: async (id: string) =>
    (await merchantFetch<unknown[]>(`/payment-links/${id}/payments`)).data,
  getInvoices: async () => merchantFetch<unknown[]>('/merchants/me/invoices')
}

export async function merchantRequest<T>(
  path: string,
  options?: RequestInit
): Promise<{ data: T | null; error?: string }> {
  return merchantFetch<T>(path, options)
}
