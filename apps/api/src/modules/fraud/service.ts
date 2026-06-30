import type { SupabaseClient } from '@supabase/supabase-js'
import type { FraudDecision } from '@nexuspay/shared'

export class FraudEngine {
  constructor(private readonly db: SupabaseClient) {}

  async scoreCheckout(input: {
    merchantId: string
    paymentId: string
    amount: bigint
    customerPhone?: string
  }): Promise<{ score: number; decision: FraudDecision; rules: string[] }> {
    const rules: string[] = []
    let score = 0

    if (input.amount > 500_000_00n) {
      score += 30
      rules.push('high_amount')
    }

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { count } = await this.db
      .from('payments')
      .select('id', { count: 'exact', head: true })
      .eq('merchant_id', input.merchantId)
      .gte('created_at', oneHourAgo)
    if ((count ?? 0) > 50) {
      score += 25
      rules.push('merchant_velocity')
    }

    if (input.customerPhone) {
      const { count: phoneCount } = await this.db
        .from('payments')
        .select('id', { count: 'exact', head: true })
        .eq('customer_phone', input.customerPhone)
        .gte('created_at', oneHourAgo)
      if ((phoneCount ?? 0) > 10) {
        score += 35
        rules.push('phone_velocity')
      }
    }

    const { data: flags } = await this.db
      .from('fraud_flags')
      .select('flag_type')
      .eq('entity_type', 'merchant')
      .eq('entity_id', input.merchantId)
      .eq('active', true)
    if (flags?.length) {
      score += 50
      rules.push('merchant_flagged')
    }

    const decision: FraudDecision = score >= 80 ? 'block' : score >= 50 ? 'review' : 'allow'

    await this.db.from('fraud_scores').insert({
      payment_id: input.paymentId,
      merchant_id: input.merchantId,
      score,
      decision,
      rules_triggered: rules
    })

    return { score, decision, rules }
  }
}
