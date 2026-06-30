import type { SupabaseClient } from '@supabase/supabase-js'

export interface ReconciliationMismatch {
  category: string
  entityId: string
  detail: string
}

export class ReconciliationEngine {
  constructor(private readonly db: SupabaseClient) {}

  async run(): Promise<ReconciliationMismatch[]> {
    const mismatches: ReconciliationMismatch[] = []

    const { data: fundedIlp } = await this.db
      .from('ilp_payments')
      .select('id, status, mpesa_receipt_number')
      .eq('status', 'funded')

    for (const p of fundedIlp ?? []) {
      if (!p.mpesa_receipt_number) {
        mismatches.push({
          category: 'ilp_missing_receipt',
          entityId: p.id,
          detail: 'ILP payment funded without M-Pesa receipt'
        })
      }
    }

    const { data: completedGateway } = await this.db
      .from('payments')
      .select('id, amount')
      .eq('status', 'completed')

    for (const p of completedGateway ?? []) {
      const { data: entries } = await this.db
        .from('ledger_transactions')
        .select('id')
        .eq('reference', `payment-${p.id}`)
        .maybeSingle()
      if (!entries) {
        mismatches.push({
          category: 'gateway_missing_ledger',
          entityId: p.id,
          detail: 'Completed gateway payment without ledger transaction'
        })
      }
    }

    const { data: stuckPayouts } = await this.db
      .from('payouts')
      .select('id')
      .eq('status', 'processing')

    for (const p of stuckPayouts ?? []) {
      mismatches.push({
        category: 'payout_stuck',
        entityId: p.id,
        detail: 'Payout stuck in processing'
      })
    }

    return mismatches
  }
}
