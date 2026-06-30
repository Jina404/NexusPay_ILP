'use client'

import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/page-header'
import { DataTable } from '@/components/merchant/data-table'
import { DataError, LoadingState } from '@/components/merchant/api-key-banner'
import { merchantApi } from '@/lib/merchant-api'
import type { ConversionRow, ExchangeRateRow } from '@/lib/merchant-types'
import { formatCurrency, formatDate } from '@/lib/utils'

export default function MerchantExchangeRatesPage() {
  const [rates, setRates] = useState<ExchangeRateRow[]>([])
  const [history, setHistory] = useState<ConversionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const [rateData, fxData] = await Promise.all([
        merchantApi.getRates('KES'),
        merchantApi.getFxTransactions()
      ])
      if (rateData) setRates(rateData)
      if (fxData) setHistory(fxData)
      if (!rateData && !fxData) setError('Could not load rates')
      setLoading(false)
    }
    void load()
  }, [])

  if (loading) return <LoadingState />

  return (
    <div>
      <PageHeader
        title="Exchange Rates"
        description="Live FX rates and conversion history for multi-currency settlement."
      />
      <DataError message={error ?? ''} />

      <h2 className="font-display font-semibold text-lg mb-4">Live rates</h2>
      {rates.length === 0 ? (
        <p className="text-sm text-muted mb-8">No rates configured.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {rates.map((r) => (
            <div key={r.pair} className="rounded-lg border border-border bg-surface p-5">
              <p className="text-sm text-muted">{r.pair}</p>
              <p className="font-display text-2xl font-bold mt-1">{r.rate}</p>
            </div>
          ))}
        </div>
      )}

      <h2 className="font-display font-semibold text-lg mb-4">Conversion history</h2>
      <DataTable
        columns={[
          { key: 'id', header: 'ID', render: (r) => <span className="font-mono text-xs">{r.id.slice(0, 8)}…</span> },
          { key: 'pair', header: 'Pair', render: (r) => `${r.from}/${r.to}` },
          {
            key: 'from',
            header: 'From',
            render: (r) => formatCurrency(r.fromAmount, r.from)
          },
          {
            key: 'to',
            header: 'To',
            render: (r) => formatCurrency(r.toAmount, r.to)
          },
          { key: 'rate', header: 'Rate', render: (r) => r.rate },
          { key: 'date', header: 'Date', render: (r) => formatDate(r.date) }
        ]}
        rows={history}
        emptyTitle="No conversions"
        emptyDescription="FX conversions appear when you convert between currencies."
      />
    </div>
  )
}
