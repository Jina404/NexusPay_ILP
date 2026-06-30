import type { SupabaseClient } from '@supabase/supabase-js'
import type { AppConfig } from '../../config.js'
import { getExchangeRates } from '../../config.js'

export class FxEngine {
  constructor(
    private readonly db: SupabaseClient,
    private readonly config: AppConfig
  ) {}

  async listCurrencies() {
    const { data, error } = await this.db.from('currencies').select('*').eq('active', true)
    if (error) throw error
    return data ?? []
  }

  async getRates(base: string) {
    const { data } = await this.db
      .from('exchange_rates')
      .select('quote_currency, rate, effective_at')
      .eq('base_currency', base)
      .order('effective_at', { ascending: false })

    if (data?.length) {
      const rates: Record<string, number> = {}
      for (const row of data) {
        if (!rates[row.quote_currency]) rates[row.quote_currency] = Number(row.rate)
      }
      return { base, rates }
    }

    const staticRates = getExchangeRates(this.config)
    return { base, rates: staticRates[base] ?? {} }
  }

  async convert(input: {
    fromCurrency: string
    toCurrency: string
    amount: number
    merchantId?: string
  }) {
    const { rates } = await this.getRates(input.fromCurrency)
    const rate = rates[input.toCurrency]
    if (!rate) throw new Error(`No FX rate for ${input.fromCurrency}→${input.toCurrency}`)

    const toAmount = input.amount * rate
    const { data, error } = await this.db
      .from('fx_transactions')
      .insert({
        merchant_id: input.merchantId ?? null,
        from_currency: input.fromCurrency,
        to_currency: input.toCurrency,
        from_amount: Math.round(input.amount * 100),
        to_amount: Math.round(toAmount * 100),
        rate
      })
      .select('*')
      .single()
    if (error) throw error
    return { ...data, toAmount: Math.round(toAmount * 100) }
  }
}
