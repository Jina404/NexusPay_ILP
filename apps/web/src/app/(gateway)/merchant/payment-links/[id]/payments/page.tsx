'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { PageHeader } from '@/components/page-header'
import { DataTable } from '@/components/merchant/data-table'
import { StatusBadge } from '@/components/merchant/status-badge'
import { merchantApi } from '@/lib/merchant-api'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ArrowLeft } from 'lucide-react'

interface LinkPayment {
  id: string
  payer_phone: string
  amount: number
  currency: string
  status: string
  created_at: string
}

export default function PaymentLinkPaymentsPage() {
  const params = useParams()
  const id = params.id as string
  const [rows, setRows] = useState<LinkPayment[]>([])

  useEffect(() => {
    async function load() {
      const data = await merchantApi.getPaymentLinkPayments(id)
      if (data) setRows(data as LinkPayment[])
    }
    void load()
  }, [id])

  return (
    <div>
      <Link
        href="/merchant/payment-links"
        className="inline-flex items-center gap-1 text-sm text-accent mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> Back to payment links
      </Link>

      <PageHeader
        title="Link payments"
        description="Payments collected through this payment link."
      />

      <DataTable
        columns={[
          { key: 'phone', header: 'Payer phone', render: (r) => r.payer_phone },
          {
            key: 'amount',
            header: 'Amount',
            render: (r) => formatCurrency(r.amount / 100, r.currency)
          },
          { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
          { key: 'date', header: 'Date', render: (r) => formatDate(r.created_at) }
        ]}
        rows={rows}
        emptyTitle="No payments yet"
        emptyDescription="Payments made through this link will appear here."
      />
    </div>
  )
}
