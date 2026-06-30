'use client'

import { useMemo, useState } from 'react'
import { PageHeader } from '@/components/page-header'
import { SectionTabs } from '@/components/merchant/section-tabs'
import { FilterBar } from '@/components/merchant/filter-bar'
import { DataTable } from '@/components/merchant/data-table'
import { StatusBadge } from '@/components/merchant/status-badge'
import { payments } from '@/lib/merchant-mock-data'
import { formatCurrency, formatDate } from '@/lib/utils'

const tabs = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'completed', label: 'Successful' },
  { id: 'failed', label: 'Failed' },
  { id: 'abandoned', label: 'Abandoned' }
]

export default function MerchantPaymentsPage() {
  const [tab, setTab] = useState('all')
  const [currency, setCurrency] = useState('')
  const [method, setMethod] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const filtered = useMemo(() => {
    return payments.filter((p) => {
      if (tab !== 'all' && p.status !== tab) return false
      if (currency && p.currency !== currency) return false
      if (method && p.method !== method) return false
      if (dateFrom && p.date < `${dateFrom}T00:00:00Z`) return false
      if (dateTo && p.date > `${dateTo}T23:59:59Z`) return false
      return true
    })
  }, [tab, currency, method, dateFrom, dateTo])

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: payments.length }
    for (const p of payments) {
      c[p.status] = (c[p.status] ?? 0) + 1
    }
    return c
  }, [])

  return (
    <div>
      <PageHeader
        title="Payments"
        description="Incoming payments across all currencies and payment methods."
      />

      <SectionTabs
        tabs={tabs.map((t) => ({ ...t, count: counts[t.id] ?? (t.id === 'all' ? counts.all : 0) }))}
        active={tab}
        onChange={setTab}
      />

      <FilterBar
        currency={currency}
        onCurrencyChange={setCurrency}
        method={method}
        onMethodChange={setMethod}
        dateFrom={dateFrom}
        onDateFromChange={setDateFrom}
        dateTo={dateTo}
        onDateToChange={setDateTo}
      />

      <DataTable
        columns={[
          { key: 'id', header: 'Payment ID', render: (r) => <span className="font-mono text-xs">{r.id}</span> },
          { key: 'customer', header: 'Customer', render: (r) => r.customer },
          { key: 'amount', header: 'Amount', render: (r) => formatCurrency(r.amount, r.currency) },
          { key: 'currency', header: 'Currency', render: (r) => r.currency },
          { key: 'method', header: 'Method', render: (r) => <span className="capitalize">{r.method}</span> },
          { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
          { key: 'date', header: 'Date', render: (r) => formatDate(r.date) }
        ]}
        rows={filtered}
        emptyTitle="No payments found"
        emptyDescription="Try adjusting your filters or check back later."
      />
    </div>
  )
}
