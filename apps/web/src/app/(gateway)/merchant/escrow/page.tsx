'use client'

import { useEffect, useMemo, useState } from 'react'
import { PageHeader } from '@/components/page-header'
import { SectionTabs } from '@/components/merchant/section-tabs'
import { DataTable } from '@/components/merchant/data-table'
import { StatusBadge } from '@/components/merchant/status-badge'
import { DataError, LoadingState } from '@/components/merchant/merchant-page-state'
import { merchantApi } from '@/lib/merchant-api'
import type { EscrowRow } from '@/lib/merchant-types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ArrowRight } from 'lucide-react'

const tabs = [
  { id: 'held', label: 'Held' },
  { id: 'pending_release', label: 'Pending release' },
  { id: 'completed', label: 'Completed' }
]

export default function MerchantEscrowPage() {
  const [rows, setRows] = useState<EscrowRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState('held')

  useEffect(() => {
    async function load() {
      const data = await merchantApi.getEscrows()
      if (data) setRows(data)
      setLoading(false)
    }
    void load()
  }, [])

  const filtered = useMemo(() => {
    if (tab === 'held') return rows.filter((e) => e.status === 'held')
    if (tab === 'pending_release') return rows.filter((e) => e.status === 'pending_release')
    return rows.filter((e) => e.status === 'released' || e.status === 'refunded')
  }, [rows, tab])

  if (loading) return <LoadingState />

  return (
    <div>
      <PageHeader
        title="Escrow"
        description="Track held funds for marketplaces and freelancers — Held → Released → Refunded."
      />
      <DataError message={error ?? ''} />

      <div className="flex items-center gap-2 text-sm text-muted mb-6 p-4 rounded-lg border border-border bg-surface">
        <StatusBadge status="held" />
        <ArrowRight className="h-4 w-4" />
        <StatusBadge status="released" />
        <ArrowRight className="h-4 w-4" />
        <StatusBadge status="refunded" />
      </div>

      <SectionTabs tabs={tabs} active={tab} onChange={setTab} />

      <DataTable
        columns={[
          { key: 'id', header: 'Escrow ID', render: (r) => <span className="font-mono text-xs">{r.id.slice(0, 8)}…</span> },
          {
            key: 'payment',
            header: 'Payment',
            render: (r) => <span className="font-mono text-xs">{r.paymentId.slice(0, 8)}…</span>
          },
          { key: 'amount', header: 'Amount', render: (r) => formatCurrency(r.amount, r.currency) },
          { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
          { key: 'created', header: 'Created', render: (r) => formatDate(r.createdAt) }
        ]}
        rows={filtered}
        emptyTitle="No escrow records"
        emptyDescription="Escrow is created when checkout uses the useEscrow option."
      />
    </div>
  )
}
