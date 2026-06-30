import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { AppConfig } from './config.js'

export interface Profile {
  id: string
  role: 'buyer' | 'seller'
  country: string
  phone: string | null
  business_name: string | null
}

export interface Account {
  id: string
  user_id: string
  wallet_address_id: string | null
  wallet_address_url: string | null
  wallet_path: string
  asset_code: string
  asset_id: string | null
  balance: number
  pending_debit: number
}

export interface Payment {
  id: string
  buyer_account_id: string
  seller_account_id: string
  amount_value: number
  amount_asset_code: string
  amount_asset_scale: number
  incoming_payment_id: string | null
  incoming_payment_url: string | null
  outgoing_payment_id: string | null
  quote_id: string | null
  mpesa_checkout_request_id: string | null
  mpesa_merchant_request_id: string | null
  mpesa_receipt_number: string | null
  buyer_phone: string | null
  status: string
  idempotency_key: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export function createSupabase(config: AppConfig): SupabaseClient {
  return createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  })
}

export class LedgerService {
  constructor(private readonly db: SupabaseClient) {}

  async getAccountById(id: string): Promise<Account | null> {
    const { data, error } = await this.db
      .from('accounts')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    return data as Account | null
  }

  async getAccountByWalletAddressId(
    walletAddressId: string
  ): Promise<Account | null> {
    const { data, error } = await this.db
      .from('accounts')
      .select('*')
      .eq('wallet_address_id', walletAddressId)
      .maybeSingle()
    if (error) throw error
    return data as Account | null
  }

  async getAccountByPath(path: string): Promise<Account | null> {
    const { data, error } = await this.db
      .from('accounts')
      .select('*')
      .eq('wallet_path', path)
      .maybeSingle()
    if (error) throw error
    return data as Account | null
  }

  async pendingDebit(accountId: string, amount: bigint): Promise<void> {
    const account = await this.getAccountById(accountId)
    if (!account) throw new Error('Account not found')
    const available = BigInt(account.balance) - BigInt(account.pending_debit)
    if (available < amount) {
      throw new Error('Insufficient balance')
    }
    const { error } = await this.db
      .from('accounts')
      .update({ pending_debit: Number(BigInt(account.pending_debit) + amount) })
      .eq('id', accountId)
    if (error) throw error
  }

  async voidPendingDebit(accountId: string, amount: bigint): Promise<void> {
    const account = await this.getAccountById(accountId)
    if (!account) throw new Error('Account not found')
    const next = BigInt(account.pending_debit) - amount
    const { error } = await this.db
      .from('accounts')
      .update({ pending_debit: Number(next < 0n ? 0n : next) })
      .eq('id', accountId)
    if (error) throw error
  }

  async debit(
    accountId: string,
    amount: bigint,
    fromPending = true
  ): Promise<void> {
    const account = await this.getAccountById(accountId)
    if (!account) throw new Error('Account not found')
    const balance = BigInt(account.balance) - amount
    const pending = fromPending
      ? BigInt(account.pending_debit) - amount
      : BigInt(account.pending_debit)
    const { error } = await this.db
      .from('accounts')
      .update({
        balance: Number(balance),
        pending_debit: Number(pending < 0n ? 0n : pending)
      })
      .eq('id', accountId)
    if (error) throw error
  }

  async credit(accountId: string, amount: bigint): Promise<void> {
    const account = await this.getAccountById(accountId)
    if (!account) throw new Error('Account not found')
    const { error } = await this.db
      .from('accounts')
      .update({ balance: Number(BigInt(account.balance) + amount) })
      .eq('id', accountId)
    if (error) throw error
  }

  async setWalletAddress(
    accountId: string,
    walletAddressId: string,
    walletAddressUrl: string,
    assetId?: string
  ): Promise<void> {
    const { error } = await this.db
      .from('accounts')
      .update({
        wallet_address_id: walletAddressId,
        wallet_address_url: walletAddressUrl,
        ...(assetId ? { asset_id: assetId } : {})
      })
      .eq('id', accountId)
    if (error) throw error
  }
}

export class PaymentRepository {
  constructor(private readonly db: SupabaseClient) {}

  async create(input: Partial<Payment> & Pick<Payment, 'buyer_account_id' | 'seller_account_id' | 'amount_value'>): Promise<Payment> {
    const { data, error } = await this.db
      .from('ilp_payments')
      .insert(input)
      .select('*')
      .single()
    if (error) throw error
    return data as Payment
  }

  async update(id: string, patch: Partial<Payment>): Promise<Payment> {
    const { data, error } = await this.db
      .from('ilp_payments')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single()
    if (error) throw error
    return data as Payment
  }

  async getById(id: string): Promise<Payment | null> {
    const { data, error } = await this.db
      .from('ilp_payments')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    return data as Payment | null
  }

  async getByOutgoingPaymentId(
    outgoingPaymentId: string
  ): Promise<Payment | null> {
    const { data, error } = await this.db
      .from('ilp_payments')
      .select('*')
      .eq('outgoing_payment_id', outgoingPaymentId)
      .maybeSingle()
    if (error) throw error
    return data as Payment | null
  }

  async getByCheckoutRequestId(
    checkoutRequestId: string
  ): Promise<Payment | null> {
    const { data, error } = await this.db
      .from('ilp_payments')
      .select('*')
      .eq('mpesa_checkout_request_id', checkoutRequestId)
      .maybeSingle()
    if (error) throw error
    return data as Payment | null
  }

  async findStaleAwaitingMpesa(olderThanMs: number): Promise<Payment[]> {
    const cutoff = new Date(Date.now() - olderThanMs).toISOString()
    const { data, error } = await this.db
      .from('ilp_payments')
      .select('*')
      .eq('status', 'awaiting_mpesa')
      .lt('updated_at', cutoff)
    if (error) throw error
    return (data ?? []) as Payment[]
  }
}

export async function recordWebhookEvent(
  db: SupabaseClient,
  id: string,
  type: string,
  payload: Record<string, unknown> | { id: string; type: string; data: Record<string, unknown> }
): Promise<boolean> {
  const { error } = await db.from('webhook_events').insert({
    id,
    type,
    payload_json: payload
  })
  if (error?.code === '23505') return false
  if (error) throw error
  return true
}
