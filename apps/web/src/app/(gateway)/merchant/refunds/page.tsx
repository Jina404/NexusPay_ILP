'use client'

import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/page-header'
import { DataTable } from '@/components/merchant/data-table'
import { StatusBadge } from '@/components/merchant/status-badge'
import { DataError, LoadingState } from '@/components/merchant/api-key-banner'
import { merchantApi } from '@/lib/merchant-api'
import type { RefundRow } from '@/lib/merchant-types'
import { formatCurrency, formatDate } from '@/lib/utils'

export default function MerchantRefundsPage() {
  const [rows, setRows] = useState<RefundRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const data = await merchantApi.getRefunds()
      if (!data) setError('API key not configured')
      else setRows(data)
      setLoading(false)
    }
    void load()
  }, [])

  if (loading) return <LoadingState />

  return (
    <div>
      <PageHeader
        title="Refunds"
        description="Refund requests for completed payments."
      />
      <DataError message={error ?? ''} />

      <DataTable
        columns={[
          { key: 'id', header: 'Refund ID', render: (r) => <span className="font-mono text-xs">{r.id.slice(0, 8)}…</span> },
          { key: 'payment', header: 'Payment', render: (r) => <span className="font-mono text-xs">{r.paymentId.slice(0, 8)}…</span> },
          { key: 'customer', header: 'Customer', render: (r) => r.customer },
          { key: 'amount', header: 'Amount', render: (r) => formatCurrency(r.amount, r.currency) },
          { key: 'reason', header: 'Reason', render: (r) => r.reason || '—' },
          { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
          { key: 'date', header: 'Date', render: (r) => formatDate(r.date) }
        ]}
        rows={rows}
        emptyTitle="No refunds"
        emptyDescription="Refunds appear when you issue a refund against a payment."
      />
    </div>
  )
}
