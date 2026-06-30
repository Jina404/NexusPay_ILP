'use client'

import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/page-header'
import { DataTable } from '@/components/merchant/data-table'
import { customers } from '@/lib/merchant-mock-data'
import { formatCurrency, formatDate } from '@/lib/utils'

export default function MerchantCustomersPage() {
  const router = useRouter()

  return (
    <div>
      <PageHeader
        title="Customers"
        description="Customer profiles, transaction history, and lifetime value."
      />

      <DataTable
        columns={[
          { key: 'name', header: 'Customer', render: (r) => r.name },
          { key: 'email', header: 'Email', render: (r) => r.email },
          { key: 'phone', header: 'Phone', render: (r) => r.phone },
          { key: 'transactions', header: 'Transactions', render: (r) => r.transactions },
          {
            key: 'ltv',
            header: 'Lifetime value',
            render: (r) => formatCurrency(r.lifetimeValue)
          },
          { key: 'last', header: 'Last activity', render: (r) => formatDate(r.lastActivity) }
        ]}
        rows={customers}
        onRowClick={(r) => router.push(`/merchant/customers/${r.id}`)}
      />
    </div>
  )
}
