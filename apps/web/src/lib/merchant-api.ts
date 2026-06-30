import { getApiUrl } from '@/lib/supabase'

const API_KEY_STORAGE = 'nexuspay_api_key'

export function getStoredApiKey(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(API_KEY_STORAGE)
}

export function setStoredApiKey(key: string) {
  localStorage.setItem(API_KEY_STORAGE, key)
}

async function merchantFetch<T>(
  path: string,
  options?: RequestInit
): Promise<{ data: T | null; error?: string }> {
  const apiKey = getStoredApiKey()
  if (!apiKey) return { data: null, error: 'API key not configured' }

  try {
    const res = await fetch(`${getApiUrl()}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...options?.headers
      }
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      return { data: null, error: (body as { error?: string }).error ?? res.statusText }
    }
    return { data: (await res.json()) as T }
  } catch {
    return { data: null, error: 'Network error' }
  }
}

export interface MerchantStats {
  totalVolume: number
  totalRevenue: number
  successfulPayments: number
  failedPayments: number
  pendingSettlements: number
  walletBalanceTotal: number
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

export const merchantApi = {
  getMe: async () => (await merchantFetch<Record<string, unknown>>('/merchants/me')).data,
  getStats: async () => (await merchantFetch<MerchantStats>('/merchants/me/stats')).data,
  getPayments: async () => (await merchantFetch<unknown[]>('/merchants/me/payments')).data,
  getTransactions: async () => (await merchantFetch<unknown[]>('/merchants/me/transactions')).data,
  getWallets: async () => (await merchantFetch<unknown[]>('/merchants/me/wallets')).data,
  getSettlements: async () => (await merchantFetch<unknown[]>('/merchants/me/settlements')).data,
  getPayouts: async () => (await merchantFetch<unknown[]>('/merchants/me/payouts')).data,
  getRefunds: async () => (await merchantFetch<unknown[]>('/merchants/me/refunds')).data,
  getEscrows: async () => (await merchantFetch<unknown[]>('/merchants/me/escrows')).data,
  getCustomers: async () => (await merchantFetch<unknown[]>('/merchants/me/customers')).data,
  getApiKeys: async () => (await merchantFetch<unknown[]>('/merchants/me/api-keys')).data,

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
