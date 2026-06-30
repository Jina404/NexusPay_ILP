'use client'

import { useState } from 'react'
import { PageHeader } from '@/components/page-header'
import { DataTable } from '@/components/merchant/data-table'
import { StatusBadge } from '@/components/merchant/status-badge'
import { Button } from '@/components/ui/button'
import { refunds as initialRefunds } from '@/lib/merchant-mock-data'
import type { RefundRow } from '@/lib/merchant-mock-data'
import { formatCurrency, formatDate } from '@/lib/utils'

export default function MerchantRefundsPage() {
  const [refunds, setRefunds] = useState<RefundRow[]>(initialRefunds)

  function approve(id: string) {
    setRefunds((rows) =>
      rows.map((r) => (r.id === id ? { ...r, status: 'completed' as const } : r))
    )
  }

  function reject(id: string) {
    setRefunds((rows) =>
      rows.map((r) => (r.id === id ? { ...r, status: 'rejected' as const } : r))
    )
  }

  return (
    <div>
      <PageHeader
        title="Refunds"
        description="Manage refund requests — approve or reject pending refunds."
      />

      <DataTable
        columns={[
          { key: 'id', header: 'Refund ID', render: (r) => <span className="font-mono text-xs">{r.id}</span> },
          { key: 'payment', header: 'Payment', render: (r) => <span className="font-mono text-xs">{r.paymentId}</span> },
          { key: 'customer', header: 'Customer', render: (r) => r.customer },
          { key: 'amount', header: 'Amount', render: (r) => formatCurrency(r.amount, r.currency) },
          { key: 'reason', header: 'Reason', render: (r) => r.reason },
          { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
          { key: 'date', header: 'Date', render: (r) => formatDate(r.date) },
          {
            key: 'actions',
            header: '',
            render: (r) =>
              r.status === 'pending' ? (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => approve(r.id)}>
                    Approve
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => reject(r.id)}>
                    Reject
                  </Button>
                </div>
              ) : null
          }
        ]}
        rows={refunds}
      />
    </div>
  )
}
