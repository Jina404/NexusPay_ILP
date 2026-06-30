'use client'

import { PageHeader } from '@/components/page-header'
import { DataTable } from '@/components/merchant/data-table'
import { StatusBadge } from '@/components/merchant/status-badge'
import { settlements, settlementSummary } from '@/lib/merchant-mock-data'
import { formatCurrency, formatDate } from '@/lib/utils'

export default function MerchantSettlementsPage() {
  return (
    <div>
      <PageHeader
        title="Settlements"
        description="Local, cross-border, and ILP settlement status across currencies."
      />

      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <div className="rounded-lg border border-border bg-surface p-5">
          <p className="text-sm text-muted">Local settlements</p>
          <p className="font-display text-2xl font-bold mt-1">{settlementSummary.local.count}</p>
          <p className="text-xs text-muted mt-1">{formatCurrency(settlementSummary.local.amount)} total</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-5">
          <p className="text-sm text-muted">Cross-border</p>
          <p className="font-display text-2xl font-bold mt-1">{settlementSummary.crossBorder.count}</p>
          <p className="text-xs text-muted mt-1">{formatCurrency(settlementSummary.crossBorder.amount)} total</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-5">
          <p className="text-sm text-muted">ILP pipeline</p>
          <p className="font-display text-2xl font-bold mt-1">{settlementSummary.ilp.count}</p>
          <p className="text-xs text-muted mt-1">{settlementSummary.ilp.status}</p>
        </div>
      </div>

      <DataTable
        columns={[
          { key: 'id', header: 'Settlement ID', render: (r) => <span className="font-mono text-xs">{r.id}</span> },
          { key: 'amount', header: 'Amount', render: (r) => formatCurrency(r.amount, r.sourceCurrency) },
          {
            key: 'pair',
            header: 'Route',
            render: (r) => (
              <span>
                {r.sourceCurrency} → {r.destinationCurrency}
              </span>
            )
          },
          { key: 'method', header: 'Method', render: (r) => <span className="capitalize">{r.method.replace('_', ' ')}</span> },
          { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
          { key: 'date', header: 'Date', render: (r) => formatDate(r.date) }
        ]}
        rows={settlements}
      />
    </div>
  )
}
