'use client'

import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/page-header'
import { DataTable, type Column } from '@/components/merchant/data-table'
import { merchantApi } from '@/lib/merchant-api'
import { formatCurrency } from '@/lib/utils'
import { getApiUrl } from '@/lib/supabase'
import { Download } from 'lucide-react'

interface InvoiceRow {
  id: string
  payment_id: string
  invoice_number: string
  payer_phone: string | null
  amount: number
  currency: string
  mpesa_receipt: string | null
  created_at: string
}

export default function MerchantInvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data, error: err } = await merchantApi.getInvoices()
      if (err) setError(err)
      else setInvoices((data as InvoiceRow[]) ?? [])
      setLoading(false)
    }
    void load()
  }, [])

  const columns: Column<InvoiceRow>[] = [
    {
      key: 'invoice_number',
      header: 'Invoice #',
      render: (row) => <span className="font-mono text-xs">{row.invoice_number}</span>
    },
    {
      key: 'payer_phone',
      header: 'Customer',
      render: (row) => row.payer_phone ?? '—'
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (row) => formatCurrency(row.amount / 100, row.currency)
    },
    {
      key: 'mpesa_receipt',
      header: 'M-Pesa receipt',
      render: (row) => row.mpesa_receipt ?? '—'
    },
    {
      key: 'created_at',
      header: 'Date',
      render: (row) => new Date(row.created_at).toLocaleDateString()
    },
    {
      key: 'download',
      header: '',
      render: (row) => (
        <a
          href={`${getApiUrl()}/payments/${row.payment_id}/invoice.pdf`}
          download
          className="inline-flex items-center justify-center rounded-md p-2 hover:bg-background"
        >
          <Download className="h-4 w-4" />
        </a>
      )
    }
  ]

  return (
    <div>
      <PageHeader
        title="Invoices"
        description="Downloadable receipts for completed M-Pesa payments."
      />
      {loading ? (
        <p className="text-muted text-sm">Loading invoices…</p>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : (
        <DataTable
          columns={columns}
          rows={invoices}
          emptyTitle="No invoices yet"
          emptyDescription="Receipts are generated automatically when customers complete M-Pesa payments."
        />
      )}
    </div>
  )
}
