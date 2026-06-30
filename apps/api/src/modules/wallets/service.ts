import type { SupabaseClient } from '@supabase/supabase-js'
import type { WalletOwnerType } from '@nexuspay/shared'
import { LedgerEngine } from '../ledger/service.js'

export class WalletEngine {
  private readonly ledger: LedgerEngine

  constructor(private readonly db: SupabaseClient) {
    this.ledger = new LedgerEngine(db)
  }

  async createWallet(
    ownerType: WalletOwnerType,
    ownerId: string,
    currency: string
  ) {
    const { data, error } = await this.db
      .from('wallets')
      .upsert(
        { owner_type: ownerType, owner_id: ownerId, currency, balance: 0, status: 'active' },
        { onConflict: 'owner_type,owner_id,currency' }
      )
      .select('*')
      .single()
    if (error) throw error
    return data
  }

  async getWallet(ownerType: WalletOwnerType, ownerId: string, currency: string) {
    const { data, error } = await this.db
      .from('wallets')
      .select('*')
      .eq('owner_type', ownerType)
      .eq('owner_id', ownerId)
      .eq('currency', currency)
      .maybeSingle()
    if (error) throw error
    return data
  }

  async creditWallet(
    ownerType: WalletOwnerType,
    ownerId: string,
    currency: string,
    amount: bigint,
    reference: string
  ): Promise<void> {
    const wallet = await this.ensureWallet(ownerType, ownerId, currency)
    const { error } = await this.db
      .from('wallets')
      .update({ balance: Number(BigInt(wallet.balance) + amount) })
      .eq('id', wallet.id)
    if (error) throw error
    await this.ledger.getAccountBalance('merchant_payable')
    void reference
  }

  async debitWallet(
    ownerType: WalletOwnerType,
    ownerId: string,
    currency: string,
    amount: bigint,
    reference: string
  ): Promise<void> {
    const wallet = await this.ensureWallet(ownerType, ownerId, currency)
    const balance = BigInt(wallet.balance)
    if (balance < amount) throw new Error('Insufficient wallet balance')
    const { error } = await this.db
      .from('wallets')
      .update({ balance: Number(balance - amount) })
      .eq('id', wallet.id)
    if (error) throw error
    void reference
  }

  async transferBetweenWallets(
    from: { ownerType: WalletOwnerType; ownerId: string; currency: string },
    to: { ownerType: WalletOwnerType; ownerId: string; currency: string },
    amount: bigint,
    reference: string
  ): Promise<void> {
    if (from.currency !== to.currency) {
      throw new Error('Cross-currency wallet transfer requires FX module')
    }
    await this.debitWallet(from.ownerType, from.ownerId, from.currency, amount, reference)
    await this.creditWallet(to.ownerType, to.ownerId, to.currency, amount, reference)
  }

  private async ensureWallet(
    ownerType: WalletOwnerType,
    ownerId: string,
    currency: string
  ) {
    let wallet = await this.getWallet(ownerType, ownerId, currency)
    if (!wallet) wallet = await this.createWallet(ownerType, ownerId, currency)
    return wallet
  }
}
