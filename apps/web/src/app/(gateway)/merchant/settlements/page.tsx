'use client'

import { useEffect, useMemo, useState } from 'react'
import { PageHeader } from '@/components/page-header'
import { DataTable } from '@/components/merchant/data-table'
import { StatusBadge } from '@/components/merchant/status-badge'
import { DataError, LoadingState } from '@/components/merchant/merchant-page-state'
import { merchantApi } from '@/lib/merchant-api'
import type { SettlementRow } from '@/lib/merchant-types'
import { formatCurrency, formatDate } from '@/lib/utils'

export default function MerchantSettlementsPage() {
  const [rows, setRows] = useState<SettlementRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const data = await merchantApi.getSettlements()
      if (data) setRows(data)
      setLoading(false)
    }
    void load()
  }, [])

  const summary = useMemo(() => {
    const local = rows.filter((s) => s.method === 'local')
    const crossBorder = rows.filter((s) => s.method === 'cross_border')
    const ilp = rows.filter((s) => s.method === 'ilp')
    return {
      local: { count: local.length, amount: local.reduce((s, r) => s + r.amount, 0) },
      crossBorder: { count: crossBorder.length, amount: crossBorder.reduce((s, r) => s + r.amount, 0) },
      ilp: { count: ilp.length, pending: ilp.filter((s) => s.status === 'pending').length }
    }
  }, [rows])

  if (loading) return <LoadingState />

  return (
    <div>
      <PageHeader
        title="Settlements"
        description="Local, cross-border, and ILP settlement status across currencies."
      />
      <DataError message={error ?? ''} />

      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <div className="rounded-lg border border-border bg-surface p-5">
          <p className="text-sm text-muted">Local settlements</p>
          <p className="font-display text-2xl font-bold mt-1">{summary.local.count}</p>
          <p className="text-xs text-muted mt-1">{formatCurrency(summary.local.amount)} total</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-5">
          <p className="text-sm text-muted">Cross-border</p>
          <p className="font-display text-2xl font-bold mt-1">{summary.crossBorder.count}</p>
          <p className="text-xs text-muted mt-1">{formatCurrency(summary.crossBorder.amount)} total</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-5">
          <p className="text-sm text-muted">ILP pipeline</p>
          <p className="font-display text-2xl font-bold mt-1">{summary.ilp.count}</p>
          <p className="text-xs text-muted mt-1">{summary.ilp.pending} pending</p>
        </div>
      </div>

      <DataTable
        columns={[
          { key: 'id', header: 'Settlement ID', render: (r) => <span className="font-mono text-xs">{r.id.slice(0, 8)}…</span> },
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
        rows={rows}
        emptyTitle="No settlements"
        emptyDescription="Settlements appear when you initiate a payout to your bank or wallet."
      />
    </div>
  )
}
