'use client'

import { useEffect, useMemo, useState } from 'react'
import { PageHeader } from '@/components/page-header'
import { SectionTabs } from '@/components/merchant/section-tabs'
import { DataTable } from '@/components/merchant/data-table'
import { StatusBadge } from '@/components/merchant/status-badge'
import { Button } from '@/components/ui/button'
import { DataError, LoadingState } from '@/components/merchant/api-key-banner'
import { merchantApi } from '@/lib/merchant-api'
import type { PayoutRow } from '@/lib/merchant-types'
import { formatCurrency, formatDate } from '@/lib/utils'

const tabs = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'processing', label: 'Processing' },
  { id: 'completed', label: 'Completed' },
  { id: 'failed', label: 'Failed' }
]

export default function MerchantPayoutsPage() {
  const [rows, setRows] = useState<PayoutRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState('all')
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    async function load() {
      const data = await merchantApi.getPayouts()
      if (!data) setError('API key not configured')
      else setRows(data)
      setLoading(false)
    }
    void load()
  }, [])

  const filtered = useMemo(() => {
    if (tab === 'all') return rows
    return rows.filter((p) => p.status === tab)
  }, [rows, tab])

  if (loading) return <LoadingState />

  return (
    <div>
      <PageHeader
        title="Payouts"
        description="Pay suppliers, freelancers, and vendors via bank, M-Pesa, or Airtel."
        action={
          <Button onClick={() => setShowModal(true)}>New payout</Button>
        }
      />
      <DataError message={error ?? ''} />

      <SectionTabs tabs={tabs} active={tab} onChange={setTab} />

      <DataTable
        columns={[
          { key: 'id', header: 'Payout ID', render: (r) => <span className="font-mono text-xs">{r.id.slice(0, 8)}…</span> },
          { key: 'recipient', header: 'Recipient', render: (r) => r.recipient },
          { key: 'amount', header: 'Amount', render: (r) => formatCurrency(r.amount, r.currency) },
          { key: 'method', header: 'Method', render: (r) => <span className="capitalize">{r.method}</span> },
          { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
          { key: 'date', header: 'Date', render: (r) => formatDate(r.date) }
        ]}
        rows={filtered}
        emptyTitle="No payouts"
        emptyDescription="Outbound payouts will appear here."
      />

      {showModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg border border-border bg-surface p-6">
            <h3 className="font-display font-semibold text-lg mb-4">New payout</h3>
            <p className="text-sm text-muted mb-6">
              Use <code className="text-xs bg-background border px-1 rounded">POST /payouts</code> via the API or
              Developers docs to create payouts programmatically.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowModal(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
