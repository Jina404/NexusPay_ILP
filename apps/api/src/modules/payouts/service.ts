import { randomUUID } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { FastifyBaseLogger } from 'fastify'
import type { CreatePayoutInput } from '@nexuspay/shared'
import { LEDGER_ACCOUNT_CODES } from '@nexuspay/shared'
import type { AppConfig } from '../../config.js'
import { LedgerEngine } from '../ledger/service.js'
import { WalletEngine } from '../wallets/service.js'
import { AuditService } from '../audit/service.js'
import { MpesaProvider } from '../providers/mpesa-provider.js'

export class PayoutEngine {
  private readonly ledger: LedgerEngine
  private readonly wallets: WalletEngine
  private readonly audit: AuditService
  private readonly mpesa?: MpesaProvider

  constructor(
    private readonly db: SupabaseClient,
    config?: AppConfig,
    log?: FastifyBaseLogger
  ) {
    this.ledger = new LedgerEngine(db)
    this.wallets = new WalletEngine(db)
    this.audit = new AuditService(db)
    if (config && log) {
      this.mpesa = new MpesaProvider(config, log)
    }
  }

  async createPayout(input: CreatePayoutInput) {
    const amountMinor = BigInt(Math.round(input.amount * 100))

    await this.wallets.debitWallet(
      'merchant',
      input.merchantId,
      input.currency,
      amountMinor,
      `payout-pending`
    )

    const { data: payout, error } = await this.db
      .from('payouts')
      .insert({
        merchant_id: input.merchantId,
        amount: Number(amountMinor),
        currency: input.currency,
        destination_type: input.destinationType,
        destination_reference: input.destinationReference,
        status: 'processing',
        idempotency_key: input.idempotencyKey ?? randomUUID()
      })
      .select('*')
      .single()
    if (error) throw error

    await this.ledger.createLedgerTransaction({
      reference: `payout-${payout.id}`,
      currency: input.currency,
      lines: [
        { ledgerAccountCode: LEDGER_ACCOUNT_CODES.MERCHANT_PAYABLE, entryType: 'debit', amount: amountMinor },
        { ledgerAccountCode: LEDGER_ACCOUNT_CODES.SETTLEMENT_CLEARING, entryType: 'credit', amount: amountMinor }
      ]
    })

    if (input.destinationType === 'mpesa' && this.mpesa) {
      try {
        const b2c = await this.mpesa.b2cPayment(
          input.destinationReference,
          input.amount,
          `Payout ${payout.id}`
        ) as Record<string, string>
        await this.db
          .from('payouts')
          .update({
            status: 'processing',
            metadata: {
              b2cOriginatorConversationId: b2c.OriginatorConversationID,
              b2cResponse: b2c
            }
          })
          .eq('id', payout.id)
      } catch (err) {
        await this.db.from('payouts').update({ status: 'failed' }).eq('id', payout.id)
        throw err
      }
    } else {
      await this.db.from('payouts').update({ status: 'completed' }).eq('id', payout.id)
    }

    await this.audit.log({
      actor: input.merchantId,
      action: 'payout.initiated',
      entityType: 'payout',
      entityId: payout.id
    })

    return (await this.db.from('payouts').select('*').eq('id', payout.id).single()).data
  }
}
