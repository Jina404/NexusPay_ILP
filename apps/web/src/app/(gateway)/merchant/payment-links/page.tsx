'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/page-header'
import { StatCard } from '@/components/stat-card'
import { DataTable } from '@/components/merchant/data-table'
import { StatusBadge } from '@/components/merchant/status-badge'
import { BarChartPlaceholder } from '@/components/merchant/chart-placeholder'
import { CreatePaymentLinkModal } from '@/components/merchant/create-payment-link-modal'
import { Button } from '@/components/ui/button'
import {
  merchantApi,
  type CreatePaymentLinkInput,
  type PaymentLinkRow,
  type PaymentLinkStats
} from '@/lib/merchant-api'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Copy, Plus } from 'lucide-react'

export default function PaymentLinksPage() {
  const router = useRouter()
  const [rows, setRows] = useState<PaymentLinkRow[]>([])
  const [stats, setStats] = useState<PaymentLinkStats | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<PaymentLinkRow | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const load = useCallback(async () => {
    const [links, linkStats] = await Promise.all([
      merchantApi.getPaymentLinks(),
      merchantApi.getPaymentLinkStats('7d')
    ])
    if (links) setRows(links)
    if (linkStats) setStats(linkStats)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  async function handleCreate(input: CreatePaymentLinkInput) {
    const result = await merchantApi.createPaymentLink(input)
    if (result.error || !result.data) {
      throw new Error(result.error ?? 'Failed to create link')
    }
    showToast('Payment link created')
    await load()
  }

  async function handleEdit(input: CreatePaymentLinkInput) {
    if (!editing) return
    const result = await merchantApi.updatePaymentLink(editing.id, {
      title: input.title,
      description: input.description,
      amount: input.amount,
      expiresAt: input.expiresAt
    })
    if (result.error) throw new Error(result.error)
    showToast('Payment link updated')
    setEditing(null)
    await load()
  }

  async function handleDisable(id: string) {
    const result = await merchantApi.disablePaymentLink(id)
    if (result.error) {
      showToast(result.error)
      return
    }
    showToast('Link disabled')
    await load()
  }

  function copyLink(url: string) {
    void navigator.clipboard.writeText(url)
    showToast('Link copied to clipboard')
  }

  const displayStats = stats ?? {
    totalLinks: rows.length,
    activeLinks: rows.filter((r) => r.status === 'active').length,
    totalPayments: rows.reduce((s, r) => s + (r.paymentsCount ?? 0), 0),
    revenueCollected: 0,
    successRate: 0,
    revenueSeries: [],
    paymentsSeries: []
  }

  return (
    <div>
      <PageHeader
        title="Payment Links"
        description="Generate shareable links so buyers can pay via M-Pesa without a website."
        action={
          <Button onClick={() => { setEditing(null); setModalOpen(true) }}>
            <Plus className="h-4 w-4" /> Create link
          </Button>
        }
      />

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total links" value={String(displayStats.totalLinks)} />
        <StatCard label="Active links" value={String(displayStats.activeLinks)} />
        <StatCard label="Total payments" value={String(displayStats.totalPayments)} />
        <StatCard
          label="Revenue collected"
          value={formatCurrency(displayStats.revenueCollected)}
        />
      </div>

      {displayStats.revenueSeries.length > 0 ? (
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <BarChartPlaceholder
            title="Revenue over time"
            subtitle="Last 7 days (KES)"
            data={displayStats.revenueSeries}
          />
          <BarChartPlaceholder
            title="Payments over time"
            subtitle="Last 7 days"
            data={displayStats.paymentsSeries}
          />
        </div>
      ) : null}

      <DataTable
        columns={[
          {
            key: 'id',
            header: 'Link ID',
            render: (r) => (
              <span className="font-mono text-xs">{r.publicId.slice(0, 12)}…</span>
            )
          },
          { key: 'title', header: 'Title', render: (r) => r.title },
          {
            key: 'amount',
            header: 'Amount',
            render: (r) =>
              r.link_type === 'open'
                ? 'Open'
                : r.amount !== null
                  ? formatCurrency(r.amount / 100, r.currency)
                  : '—'
          },
          { key: 'currency', header: 'Currency', render: (r) => r.currency },
          { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
          {
            key: 'count',
            header: 'Payments',
            render: (r) => r.paymentsCount ?? 0
          },
          { key: 'created', header: 'Created', render: (r) => formatDate(r.created_at) },
          {
            key: 'actions',
            header: '',
            render: (r) => (
              <div className="flex flex-wrap gap-1">
                <Button size="sm" variant="outline" onClick={() => copyLink(r.paymentUrl)}>
                  <Copy className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditing(r)
                    setModalOpen(true)
                  }}
                >
                  Edit
                </Button>
                {r.status === 'active' ? (
                  <Button size="sm" variant="outline" onClick={() => handleDisable(r.id)}>
                    Disable
                  </Button>
                ) : null}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => router.push(`/merchant/payment-links/${r.id}/payments`)}
                >
                  Payments
                </Button>
              </div>
            )
          }
        ]}
        rows={rows}
        emptyTitle="No payment links"
        emptyDescription="Create your first payment link to start collecting payments."
      />

      <CreatePaymentLinkModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditing(null)
        }}
        onSubmit={editing ? handleEdit : handleCreate}
        initial={editing}
      />

      {toast ? (
        <div className="fixed bottom-6 right-6 rounded-lg border border-border bg-surface px-4 py-3 text-sm shadow-lg">
          {toast}
        </div>
      ) : null}
    </div>
  )
}
