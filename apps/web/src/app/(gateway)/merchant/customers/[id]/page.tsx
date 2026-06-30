'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { PageHeader } from '@/components/page-header'
import { DataTable } from '@/components/merchant/data-table'
import { StatusBadge } from '@/components/merchant/status-badge'
import { getCustomerById, getCustomerTransactions } from '@/lib/merchant-mock-data'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ArrowLeft } from 'lucide-react'

export default function CustomerDetailPage() {
  const params = useParams()
  const id = params.id as string
  const customer = getCustomerById(id)
  const history = getCustomerTransactions(id)

  if (!customer) {
    return (
      <div>
        <Link href="/merchant/customers" className="inline-flex items-center gap-1 text-sm text-accent mb-4">
          <ArrowLeft className="h-4 w-4" /> Back to customers
        </Link>
        <p className="text-muted">Customer not found.</p>
      </div>
    )
  }

  return (
    <div>
      <Link href="/merchant/customers" className="inline-flex items-center gap-1 text-sm text-accent mb-4">
        <ArrowLeft className="h-4 w-4" /> Back to customers
      </Link>

      <PageHeader
        title={customer.name}
        description={`${customer.email} · ${customer.phone}`}
      />

      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-sm text-muted">Transactions</p>
          <p className="font-display text-2xl font-bold mt-1">{customer.transactions}</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-sm text-muted">Lifetime value</p>
          <p className="font-display text-2xl font-bold mt-1">{formatCurrency(customer.lifetimeValue)}</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-sm text-muted">Last activity</p>
          <p className="font-display text-lg font-bold mt-1">{formatDate(customer.lastActivity)}</p>
        </div>
      </div>

      <h2 className="font-display font-semibold text-lg mb-4">Transaction history</h2>
      <DataTable
        columns={[
          { key: 'id', header: 'ID', render: (r) => <span className="font-mono text-xs">{r.id}</span> },
          { key: 'type', header: 'Type', render: (r) => <span className="capitalize">{r.type}</span> },
          { key: 'amount', header: 'Amount', render: (r) => formatCurrency(r.amount, r.currency) },
          { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
          { key: 'date', header: 'Date', render: (r) => formatDate(r.date) }
        ]}
        rows={history}
        emptyTitle="No transactions"
        emptyDescription="This customer has no recorded transactions yet."
      />
    </div>
  )
}
