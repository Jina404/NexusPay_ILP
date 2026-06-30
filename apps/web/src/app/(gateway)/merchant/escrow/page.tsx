'use client'

import { useMemo, useState } from 'react'
import { PageHeader } from '@/components/page-header'
import { SectionTabs } from '@/components/merchant/section-tabs'
import { DataTable } from '@/components/merchant/data-table'
import { StatusBadge } from '@/components/merchant/status-badge'
import { escrows } from '@/lib/merchant-mock-data'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ArrowRight } from 'lucide-react'

const tabs = [
  { id: 'active', label: 'Active' },
  { id: 'pending_release', label: 'Pending release' },
  { id: 'completed', label: 'Completed' }
]

export default function MerchantEscrowPage() {
  const [tab, setTab] = useState('active')

  const filtered = useMemo(() => {
    if (tab === 'active') return escrows.filter((e) => e.status === 'held')
    if (tab === 'pending_release') return escrows.filter((e) => e.status === 'pending_release')
    return escrows.filter((e) => e.status === 'released' || e.status === 'refunded')
  }, [tab])

  return (
    <div>
      <PageHeader
        title="Escrow"
        description="Track held funds for marketplaces and freelancers — Held → Released → Refunded."
      />

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
          { key: 'id', header: 'Escrow ID', render: (r) => <span className="font-mono text-xs">{r.id}</span> },
          {
            key: 'parties',
            header: 'Parties',
            render: (r) => (
              <span>
                {r.buyer} → {r.seller}
              </span>
            )
          },
          { key: 'amount', header: 'Amount', render: (r) => formatCurrency(r.amount, r.currency) },
          { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
          { key: 'created', header: 'Created', render: (r) => formatDate(r.createdAt) }
        ]}
        rows={filtered}
      />
    </div>
  )
}
