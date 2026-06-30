'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/page-header'
import { DataTable } from '@/components/merchant/data-table'
import { DataError, LoadingState } from '@/components/merchant/api-key-banner'
import { merchantApi } from '@/lib/merchant-api'
import type { CustomerRow } from '@/lib/merchant-types'
import { formatCurrency, formatDate } from '@/lib/utils'

export default function MerchantCustomersPage() {
  const router = useRouter()
  const [rows, setRows] = useState<CustomerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const data = await merchantApi.getCustomers()
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
        title="Customers"
        description="Customer profiles, transaction history, and lifetime value."
      />
      <DataError message={error ?? ''} />

      <DataTable
        columns={[
          { key: 'name', header: 'Customer', render: (r) => r.name },
          { key: 'email', header: 'Email', render: (r) => r.email || '—' },
          { key: 'phone', header: 'Phone', render: (r) => r.phone || '—' },
          { key: 'transactions', header: 'Transactions', render: (r) => r.transactions },
          {
            key: 'ltv',
            header: 'Lifetime value',
            render: (r) => formatCurrency(r.lifetimeValue)
          },
          {
            key: 'last',
            header: 'Last activity',
            render: (r) => (r.lastActivity ? formatDate(r.lastActivity) : '—')
          }
        ]}
        rows={rows}
        onRowClick={(r) => router.push(`/merchant/customers/${r.id}`)}
        emptyTitle="No customers"
        emptyDescription="Customers are created when someone pays via checkout or a payment link."
      />
    </div>
  )
}
