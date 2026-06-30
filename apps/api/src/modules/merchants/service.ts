import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Merchant } from '@nexuspay/shared'
import { AuditService } from '../audit/service.js'
import { WalletEngine } from '../wallets/service.js'

const API_KEY_PREFIX = 'np_live_'

function hashApiKey(key: string): string {
  const salt = randomBytes(16)
  const hash = scryptSync(key, salt, 64)
  return `${salt.toString('hex')}:${hash.toString('hex')}`
}

function verifyApiKey(key: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(':')
  if (!saltHex || !hashHex) return false
  const salt = Buffer.from(saltHex, 'hex')
  const hash = scryptSync(key, salt, 64)
  const expected = Buffer.from(hashHex, 'hex')
  return timingSafeEqual(hash, expected)
}

export class MerchantService {
  private readonly audit: AuditService
  private readonly wallets: WalletEngine

  constructor(private readonly db: SupabaseClient) {
    this.audit = new AuditService(db)
    this.wallets = new WalletEngine(db)
  }

  async register(input: {
    businessName: string
    email: string
    phone?: string
    country?: string
    settlementCurrency?: string
    userId?: string
  }): Promise<{ merchant: Merchant; apiKey: string }> {
    const { data: merchant, error } = await this.db
      .from('merchants')
      .insert({
        business_name: input.businessName,
        email: input.email.toLowerCase(),
        phone: input.phone ?? null,
        country: input.country ?? 'KE',
        settlement_currency: input.settlementCurrency ?? 'KES',
        status: 'active'
      })
      .select('*')
      .single()
    if (error) throw error

    if (input.userId) {
      await this.db.from('merchant_users').insert({
        merchant_id: merchant.id,
        user_id: input.userId,
        role: 'owner'
      })
      await this.db
        .from('profiles')
        .update({ merchant_id: merchant.id })
        .eq('id', input.userId)
    }

    await this.wallets.createWallet('merchant', merchant.id, merchant.settlement_currency)

    const apiKey = `${API_KEY_PREFIX}${randomBytes(24).toString('hex')}`
    const keyPrefix = apiKey.slice(0, 12)
    await this.db.from('merchant_api_keys').insert({
      merchant_id: merchant.id,
      key_prefix: keyPrefix,
      key_hash: hashApiKey(apiKey),
      name: 'default'
    })

    await this.audit.log({
      actor: input.userId ?? input.email,
      action: 'merchant.registered',
      entityType: 'merchant',
      entityId: merchant.id
    })

    return { merchant: merchant as Merchant, apiKey }
  }

  async getByEmail(email: string): Promise<Merchant | null> {
    const { data, error } = await this.db
      .from('merchants')
      .select('*')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle()
    if (error) throw error
    return data as Merchant | null
  }

  async linkUserToMerchant(
    userId: string,
    merchantId: string,
    role: 'owner' | 'admin' = 'owner'
  ): Promise<void> {
    const { error: linkError } = await this.db.from('merchant_users').upsert(
      {
        merchant_id: merchantId,
        user_id: userId,
        role
      },
      { onConflict: 'merchant_id,user_id' }
    )
    if (linkError) throw linkError

    await this.db.from('profiles').update({ merchant_id: merchantId }).eq('id', userId)
  }

  async ensureForUser(input: {
    userId: string
    email: string
    businessName?: string
    phone?: string
    country?: string
  }): Promise<{ merchant: Merchant; created: boolean; apiKey?: string }> {
    const existing = await this.getByUserId(input.userId)
    if (existing) return { merchant: existing, created: false }

    let { data: profile } = await this.db
      .from('profiles')
      .select('merchant_id, business_name, phone, country')
      .eq('id', input.userId)
      .maybeSingle()

    if (!profile) {
      await this.db.from('profiles').upsert({
        id: input.userId,
        role: 'seller',
        country: input.country ?? 'KE',
        phone: input.phone ?? null,
        business_name: input.businessName ?? input.email.split('@')[0] ?? 'Merchant'
      })
      const refreshed = await this.db
        .from('profiles')
        .select('merchant_id, business_name, phone, country')
        .eq('id', input.userId)
        .maybeSingle()
      profile = refreshed.data
    }

    if (profile?.merchant_id) {
      const merchant = await this.getById(profile.merchant_id)
      if (merchant) {
        await this.linkUserToMerchant(input.userId, merchant.id)
        return { merchant, created: false }
      }
    }

    const byEmail = await this.getByEmail(input.email)
    if (byEmail) {
      await this.linkUserToMerchant(input.userId, byEmail.id)
      return { merchant: byEmail, created: false }
    }

    const result = await this.register({
      businessName:
        input.businessName ?? profile?.business_name ?? input.email.split('@')[0] ?? 'Merchant',
      email: input.email,
      phone: input.phone ?? profile?.phone ?? undefined,
      country: input.country ?? profile?.country ?? 'KE',
      userId: input.userId
    })
    return { merchant: result.merchant, created: true, apiKey: result.apiKey }
  }

  async getByUserId(userId: string): Promise<Merchant | null> {
    const { data: link, error } = await this.db
      .from('merchant_users')
      .select('merchant_id')
      .eq('user_id', userId)
      .maybeSingle()
    if (error) throw error
    if (!link) return null
    return this.getById(link.merchant_id)
  }

  async getById(id: string): Promise<Merchant | null> {
    const { data, error } = await this.db
      .from('merchants')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    return data as Merchant | null
  }

  async authenticateApiKey(
    apiKey: string
  ): Promise<{ merchantId: string; keyId: string } | null> {
    if (!apiKey.startsWith(API_KEY_PREFIX)) return null
    const prefix = apiKey.slice(0, 12)
    const { data: keys, error } = await this.db
      .from('merchant_api_keys')
      .select('id, merchant_id, key_hash, revoked_at')
      .eq('key_prefix', prefix)
      .is('revoked_at', null)
    if (error) throw error

    for (const row of keys ?? []) {
      if (verifyApiKey(apiKey, row.key_hash)) {
        await this.db
          .from('merchant_api_keys')
          .update({ last_used_at: new Date().toISOString() })
          .eq('id', row.id)
        return { merchantId: row.merchant_id, keyId: row.id }
      }
    }
    return null
  }

  async regenerateApiKey(merchantId: string): Promise<string> {
    await this.db
      .from('merchant_api_keys')
      .update({ revoked_at: new Date().toISOString() })
      .eq('merchant_id', merchantId)
      .is('revoked_at', null)

    const apiKey = `${API_KEY_PREFIX}${randomBytes(24).toString('hex')}`
    await this.db.from('merchant_api_keys').insert({
      merchant_id: merchantId,
      key_prefix: apiKey.slice(0, 12),
      key_hash: hashApiKey(apiKey),
      name: 'default'
    })
    return apiKey
  }
}

export { hashApiKey, verifyApiKey, API_KEY_PREFIX }
