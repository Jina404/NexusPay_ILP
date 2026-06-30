'use client'

import { PageHeader } from '@/components/page-header'
import { DataTable } from '@/components/merchant/data-table'
import { exchangeRates, conversionHistory } from '@/lib/merchant-mock-data'
import { formatCurrency, formatDate } from '@/lib/utils'

export default function MerchantExchangeRatesPage() {
  return (
    <div>
      <PageHeader
        title="Exchange Rates"
        description="Live FX rates, conversion history, and spreads for multi-currency settlement."
      />

      <h2 className="font-display font-semibold text-lg mb-4">Live rates</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {exchangeRates.map((r) => (
          <div key={r.pair} className="rounded-lg border border-border bg-surface p-5">
            <p className="text-sm text-muted">{r.pair}</p>
            <p className="font-display text-2xl font-bold mt-1">{r.rate}</p>
            <p className="text-xs text-muted mt-1">Spread: {r.spread}%</p>
            <p className="text-xs text-muted">Updated {formatDate(r.updatedAt)}</p>
          </div>
        ))}
      </div>

      <h2 className="font-display font-semibold text-lg mb-4">Conversion history</h2>
      <DataTable
        columns={[
          { key: 'id', header: 'ID', render: (r) => <span className="font-mono text-xs">{r.id}</span> },
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
        rows={conversionHistory}
      />
    </div>
  )
}
