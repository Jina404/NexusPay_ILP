import { randomUUID } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { FastifyBaseLogger } from 'fastify'
import { createRafikiAdminClient } from '@nexuspay/rafiki-client'
import { formatAmountMinorUnits } from '@nexuspay/shared'
import { LEDGER_ACCOUNT_CODES } from '@nexuspay/shared'
import type { AppConfig } from '../../config.js'
import { LedgerEngine } from '../ledger/service.js'
import { WalletEngine } from '../wallets/service.js'
import { FxEngine } from '../fx/service.js'

export class SettlementEngine {
  private readonly ledger: LedgerEngine
  private readonly wallets: WalletEngine
  private readonly fx: FxEngine
  private readonly rafiki

  constructor(
    private readonly db: SupabaseClient,
    config: AppConfig,
    private readonly log: FastifyBaseLogger
  ) {
    this.ledger = new LedgerEngine(db)
    this.wallets = new WalletEngine(db)
    this.fx = new FxEngine(db, config)
    this.rafiki = createRafikiAdminClient({
      graphqlUrl: config.RAFIKI_GRAPHQL_URL,
      tenantId: config.RAFIKI_TENANT_ID,
      apiSecret: config.RAFIKI_API_SECRET,
      signatureVersion: config.RAFIKI_SIGNATURE_VERSION
    })
  }

  async initiateSettlement(merchantId: string, currency = 'KES', destinationCurrency?: string) {
    const wallet = await this.wallets.getWallet('merchant', merchantId, currency)
    if (!wallet || BigInt(wallet.balance) <= 0n) {
      throw new Error('No balance to settle')
    }

    const amount = BigInt(wallet.balance)
    const isCrossBorder = destinationCurrency && destinationCurrency !== currency

    const { data: settlement, error } = await this.db
      .from('settlements')
      .insert({
        merchant_id: merchantId,
        amount: Number(amount),
        currency,
        settlement_method: isCrossBorder ? 'cross_border_ilp' : 'local',
        destination_currency: destinationCurrency ?? currency,
        status: 'pending'
      })
      .select('*')
      .single()
    if (error) throw error

    if (isCrossBorder) {
      await this.settleCrossBorder(settlement.id, merchantId, amount, currency, destinationCurrency!)
    } else {
      await this.settleLocally(settlement.id, merchantId, amount, currency)
    }

    return settlement
  }

  async settleLocally(settlementId: string, merchantId: string, amount: bigint, currency: string) {
    await this.wallets.debitWallet('merchant', merchantId, currency, amount, `settlement-${settlementId}`)
    await this.ledger.createLedgerTransaction({
      reference: `settlement-${settlementId}`,
      currency,
      lines: [
        { ledgerAccountCode: LEDGER_ACCOUNT_CODES.MERCHANT_PAYABLE, entryType: 'debit', amount },
        { ledgerAccountCode: LEDGER_ACCOUNT_CODES.SETTLEMENT_CLEARING, entryType: 'credit', amount }
      ]
    })
    await this.completeSettlement(settlementId)
  }

  async settleCrossBorder(
    settlementId: string,
    merchantId: string,
    amount: bigint,
    fromCurrency: string,
    toCurrency: string
  ) {
    const fx = await this.fx.convert({
      fromCurrency,
      toCurrency,
      amount: Number(amount) / 100,
      merchantId
    })

    await this.wallets.debitWallet('merchant', merchantId, fromCurrency, amount, `settlement-${settlementId}`)

    const { data: account } = await this.db
      .from('accounts')
      .select('wallet_address_id')
      .eq('user_id', merchantId)
      .maybeSingle()

    if (account?.wallet_address_id) {
      const receiveAmount = formatAmountMinorUnits(fx.toAmount / 100, 2)
      const incoming = await this.rafiki.createIncomingPayment({
        walletAddressId: account.wallet_address_id,
        incomingAmount: { value: receiveAmount, assetCode: toCurrency, assetScale: 2 },
        expiresAt: new Date(Date.now() + 3600_000).toISOString(),
        metadata: { settlementId, merchantId }
      })
      this.log.info({ settlementId, incomingPaymentId: incoming.id }, 'Cross-border ILP settlement initiated')
    }

    await this.db
      .from('settlements')
      .update({
        fx_transaction_id: fx.id,
        metadata: { ilp: true, toAmount: fx.toAmount }
      })
      .eq('id', settlementId)

    await this.completeSettlement(settlementId)
  }

  async completeSettlement(settlementId: string) {
    await this.db
      .from('settlements')
      .update({ status: 'completed' })
      .eq('id', settlementId)
  }
}
