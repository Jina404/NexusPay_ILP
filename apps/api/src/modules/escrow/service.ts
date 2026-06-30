import type { SupabaseClient } from '@supabase/supabase-js'
import { LEDGER_ACCOUNT_CODES } from '@nexuspay/shared'
import { LedgerEngine } from '../ledger/service.js'
import { WalletEngine } from '../wallets/service.js'

export class EscrowEngine {
  private readonly ledger: LedgerEngine
  private readonly wallets: WalletEngine

  constructor(private readonly db: SupabaseClient) {
    this.ledger = new LedgerEngine(db)
    this.wallets = new WalletEngine(db)
  }

  async createFromPayment(paymentId: string) {
    const { data: payment } = await this.db.from('payments').select('*').eq('id', paymentId).single()
    if (!payment) throw new Error('Payment not found')

    const { data, error } = await this.db
      .from('escrows')
      .insert({
        payment_id: paymentId,
        merchant_id: payment.merchant_id,
        amount: payment.amount,
        currency: payment.currency,
        status: 'held'
      })
      .select('*')
      .single()
    if (error) throw error
    return data
  }

  async release(escrowId: string) {
    const { data: escrow } = await this.db.from('escrows').select('*').eq('id', escrowId).single()
    if (!escrow || escrow.status !== 'held') throw new Error('Escrow not releasable')

    const { data: payment } = await this.db.from('payments').select('*').eq('id', escrow.payment_id).single()
    if (!payment) throw new Error('Payment not found')

    const net = BigInt(payment.net_amount)
    const fee = BigInt(payment.fee_amount)
    const currency = payment.currency as string

    await this.ledger.createLedgerTransaction({
      reference: `escrow-release-${escrowId}`,
      currency,
      description: 'Escrow release to merchant',
      lines: [
        { ledgerAccountCode: LEDGER_ACCOUNT_CODES.ESCROW_LIABILITY, entryType: 'debit', amount: BigInt(escrow.amount) },
        { ledgerAccountCode: LEDGER_ACCOUNT_CODES.MERCHANT_PAYABLE, entryType: 'credit', amount: net },
        { ledgerAccountCode: LEDGER_ACCOUNT_CODES.PLATFORM_REVENUE, entryType: 'credit', amount: fee }
      ]
    })

    await this.wallets.creditWallet('merchant', escrow.merchant_id, currency, net, `escrow-${escrowId}`)

    await this.db.from('escrows').update({ status: 'released' }).eq('id', escrowId)
    return escrow
  }

  async refund(escrowId: string, reason?: string) {
    const { data: escrow } = await this.db.from('escrows').select('*').eq('id', escrowId).single()
    if (!escrow || escrow.status !== 'held') throw new Error('Escrow not refundable')

    const amount = BigInt(escrow.amount)
    const currency = escrow.currency as string

    await this.ledger.createLedgerTransaction({
      reference: `escrow-refund-${escrowId}`,
      currency,
      description: reason ?? 'Escrow refund to customer',
      lines: [
        { ledgerAccountCode: LEDGER_ACCOUNT_CODES.ESCROW_LIABILITY, entryType: 'debit', amount },
        { ledgerAccountCode: LEDGER_ACCOUNT_CODES.CASH_MPESA, entryType: 'credit', amount }
      ]
    })

    await this.db
      .from('escrows')
      .update({ status: 'refunded', metadata: { reason } })
      .eq('id', escrowId)
    return escrow
  }
}
