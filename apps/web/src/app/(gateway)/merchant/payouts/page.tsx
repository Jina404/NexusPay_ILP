'use client'

import { useMemo, useState } from 'react'
import { PageHeader } from '@/components/page-header'
import { SectionTabs } from '@/components/merchant/section-tabs'
import { DataTable } from '@/components/merchant/data-table'
import { StatusBadge } from '@/components/merchant/status-badge'
import { Button } from '@/components/ui/button'
import { payouts } from '@/lib/merchant-mock-data'
import { formatCurrency, formatDate } from '@/lib/utils'

const tabs = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'completed', label: 'Completed' },
  { id: 'failed', label: 'Failed' }
]

export default function MerchantPayoutsPage() {
  const [tab, setTab] = useState('all')
  const [showModal, setShowModal] = useState(false)

  const filtered = useMemo(() => {
    if (tab === 'all') return payouts
    return payouts.filter((p) => p.status === tab)
  }, [tab])

  return (
    <div>
      <PageHeader
        title="Payouts"
        description="Pay suppliers, freelancers, and vendors via bank, M-Pesa, or Airtel."
        action={
          <Button onClick={() => setShowModal(true)}>New payout</Button>
        }
      />

      <SectionTabs tabs={tabs} active={tab} onChange={setTab} />

      <DataTable
        columns={[
          { key: 'id', header: 'Payout ID', render: (r) => <span className="font-mono text-xs">{r.id}</span> },
          { key: 'recipient', header: 'Recipient', render: (r) => r.recipient },
          { key: 'amount', header: 'Amount', render: (r) => formatCurrency(r.amount, r.currency) },
          { key: 'method', header: 'Method', render: (r) => <span className="capitalize">{r.method}</span> },
          { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
          { key: 'date', header: 'Date', render: (r) => formatDate(r.date) }
        ]}
        rows={filtered}
      />

      {showModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg border border-border bg-surface p-6">
            <h3 className="font-display font-semibold text-lg mb-4">New payout</h3>
            <p className="text-sm text-muted mb-6">Payout creation will be available when connected to the API.</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button disabled>Submit</Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
