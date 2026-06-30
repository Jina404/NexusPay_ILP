import { randomUUID } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { LedgerEntryType } from '@nexuspay/shared'

export interface LedgerLineInput {
  ledgerAccountCode: string
  entryType: LedgerEntryType
  amount: bigint
}

export class LedgerEngine {
  constructor(private readonly db: SupabaseClient) {}

  async getAccountBalance(ledgerAccountCode: string): Promise<bigint> {
    const account = await this.getLedgerAccount(ledgerAccountCode)
    const { data, error } = await this.db
      .from('ledger_entries')
      .select('entry_type, amount')
      .eq('ledger_account_id', account.id)
    if (error) throw error

    let balance = 0n
    for (const row of data ?? []) {
      const amt = BigInt(row.amount)
      if (row.entry_type === 'debit') balance += amt
      else balance -= amt
    }
    return balance
  }

  async createLedgerTransaction(input: {
    reference: string
    description?: string
    currency: string
    lines: LedgerLineInput[]
    metadata?: Record<string, unknown>
  }): Promise<string> {
    const debits = input.lines.filter((l) => l.entryType === 'debit')
    const credits = input.lines.filter((l) => l.entryType === 'credit')
    const debitTotal = debits.reduce((s, l) => s + l.amount, 0n)
    const creditTotal = credits.reduce((s, l) => s + l.amount, 0n)
    if (debitTotal !== creditTotal || debitTotal === 0n) {
      throw new Error('Ledger transaction must balance with non-zero amounts')
    }

    const txId = randomUUID()
    const { error: txError } = await this.db.from('ledger_transactions').insert({
      id: txId,
      reference: input.reference,
      description: input.description ?? null,
      currency: input.currency,
      metadata: input.metadata ?? {}
    })
    if (txError) throw txError

    const entries = []
    for (const line of input.lines) {
      const account = await this.getLedgerAccount(line.ledgerAccountCode)
      entries.push({
        transaction_id: txId,
        ledger_account_id: account.id,
        entry_type: line.entryType,
        amount: Number(line.amount),
        currency: input.currency,
        metadata: {}
      })
    }

    const { error: entriesError } = await this.db.from('ledger_entries').insert(entries)
    if (entriesError) throw entriesError

    return txId
  }

  async creditAccount(
    ledgerAccountCode: string,
    amount: bigint,
    currency: string,
    reference: string,
    contraAccountCode: string
  ): Promise<string> {
    return this.createLedgerTransaction({
      reference,
      currency,
      lines: [
        { ledgerAccountCode, entryType: 'credit', amount },
        { ledgerAccountCode: contraAccountCode, entryType: 'debit', amount }
      ]
    })
  }

  async debitAccount(
    ledgerAccountCode: string,
    amount: bigint,
    currency: string,
    reference: string,
    contraAccountCode: string
  ): Promise<string> {
    return this.createLedgerTransaction({
      reference,
      currency,
      lines: [
        { ledgerAccountCode, entryType: 'debit', amount },
        { ledgerAccountCode: contraAccountCode, entryType: 'credit', amount }
      ]
    })
  }

  async reverseTransaction(
    originalTransactionId: string,
    reference: string
  ): Promise<string> {
    const { data: original, error } = await this.db
      .from('ledger_entries')
      .select('*, ledger_accounts(account_code)')
      .eq('transaction_id', originalTransactionId)
    if (error) throw error
    if (!original?.length) throw new Error('Transaction not found')

    const currency = original[0].currency as string
    const reversedLines: LedgerLineInput[] = original.map((row) => ({
      ledgerAccountCode: (row.ledger_accounts as { account_code: string }).account_code,
      entryType: row.entry_type === 'debit' ? 'credit' : 'debit',
      amount: BigInt(row.amount)
    }))

    const newTxId = await this.createLedgerTransaction({
      reference,
      description: `Reversal of ${originalTransactionId}`,
      currency,
      lines: reversedLines,
      metadata: { reversed_transaction_id: originalTransactionId }
    })

    await this.db
      .from('ledger_transactions')
      .update({ reversed_by: newTxId })
      .eq('id', originalTransactionId)

    return newTxId
  }

  private async getLedgerAccount(code: string) {
    const { data, error } = await this.db
      .from('ledger_accounts')
      .select('id, account_code, currency')
      .eq('account_code', code)
      .single()
    if (error || !data) throw new Error(`Ledger account not found: ${code}`)
    return data as { id: string; account_code: string; currency: string }
  }
}
