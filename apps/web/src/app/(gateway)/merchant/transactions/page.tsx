'use client'

import { useEffect, useMemo, useState } from 'react'
import { PageHeader } from '@/components/page-header'
import { DataTable } from '@/components/merchant/data-table'
import { StatusBadge } from '@/components/merchant/status-badge'
import { DataError, LoadingState } from '@/components/merchant/api-key-banner'
import { merchantApi } from '@/lib/merchant-api'
import type { TransactionRow } from '@/lib/merchant-types'
import { formatCurrency, formatDate, cn } from '@/lib/utils'

const typeFilters = ['all', 'payment', 'payout', 'refund', 'settlement', 'fx'] as const

export default function MerchantTransactionsPage() {
  const [rows, setRows] = useState<TransactionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState<string>('all')

  useEffect(() => {
    async function load() {
      const data = await merchantApi.getTransactions()
      if (!data) setError('API key not configured')
      else setRows(data)
      setLoading(false)
    }
    void load()
  }, [])

  const filtered = useMemo(() => {
    if (typeFilter === 'all') return rows
    return rows.filter((t) => t.type === typeFilter)
  }, [rows, typeFilter])

  if (loading) return <LoadingState />

  return (
    <div>
      <PageHeader
        title="Transactions"
        description="Master ledger of all money movement — payments, payouts, refunds, settlements, and FX."
      />
      <DataError message={error ?? ''} />

      <div className="flex flex-wrap gap-2 mb-6">
        {typeFilters.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setTypeFilter(f)}
            className={cn(
              'px-3 py-1.5 rounded-full text-sm border transition-colors capitalize',
              typeFilter === f
                ? 'bg-accent/10 text-accent border-accent/30 font-medium'
                : 'border-border text-muted hover:text-foreground'
            )}
          >
            {f === 'fx' ? 'FX' : f}
          </button>
        ))}
      </div>

      <DataTable
        columns={[
          { key: 'id', header: 'ID', render: (r) => <span className="font-mono text-xs">{r.id.slice(0, 8)}…</span> },
          { key: 'type', header: 'Type', render: (r) => <span className="capitalize">{r.type}</span> },
          { key: 'counterparty', header: 'Counterparty', render: (r) => r.counterparty },
          { key: 'amount', header: 'Amount', render: (r) => formatCurrency(r.amount, r.currency) },
          { key: 'currency', header: 'Currency', render: (r) => r.currency },
          { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
          { key: 'date', header: 'Date', render: (r) => formatDate(r.date) }
        ]}
        rows={filtered}
        emptyTitle="No transactions"
        emptyDescription="Transactions will appear here as money moves through your account."
      />
    </div>
  )
}
