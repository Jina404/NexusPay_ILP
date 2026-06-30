'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { PageHeader } from '@/components/page-header'
import { MetricGrid } from '@/components/merchant/metric-grid'
import { BarChartPlaceholder, DonutChartPlaceholder } from '@/components/merchant/chart-placeholder'
import { DataTable } from '@/components/merchant/data-table'
import { StatusBadge } from '@/components/merchant/status-badge'
import { DataError, LoadingState } from '@/components/merchant/api-key-banner'
import { merchantApi } from '@/lib/merchant-api'
import type { DashboardCharts, DashboardMetrics, TransactionRow } from '@/lib/merchant-types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ArrowRight } from 'lucide-react'

const emptyMetrics: DashboardMetrics = {
  totalVolume: 0,
  totalRevenue: 0,
  successfulPayments: 0,
  failedPayments: 0,
  pendingSettlements: 0,
  walletBalanceTotal: 0
}

const emptyCharts: DashboardCharts = {
  volumeSeries: [],
  revenueSeries: [],
  currencyDistribution: []
}

export default function MerchantDashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics>(emptyMetrics)
  const [charts, setCharts] = useState<DashboardCharts>(emptyCharts)
  const [recentTx, setRecentTx] = useState<TransactionRow[]>([])
  const [settlementCounts, setSettlementCounts] = useState({ pending: 0, completed: 0, failed: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      const [stats, tx, chartData, settlements] = await Promise.all([
        merchantApi.getStats(),
        merchantApi.getTransactions(),
        merchantApi.getDashboardCharts(),
        merchantApi.getSettlements()
      ])
      if (stats) setMetrics(stats)
      if (tx) setRecentTx(tx.slice(0, 5))
      if (chartData) setCharts(chartData)
      if (settlements) {
        setSettlementCounts({
          pending: settlements.filter((s) => s.status === 'pending' || s.status === 'processing').length,
          completed: settlements.filter((s) => s.status === 'completed').length,
          failed: settlements.filter((s) => s.status === 'failed').length
        })
      }
      if (!stats && !tx) setError('API key not configured')
      setLoading(false)
    }
    void load()
  }, [])

  if (loading) return <LoadingState />

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Overview of payments, revenue, and settlement health across all currencies."
      />
      <DataError message={error ?? ''} />

      <MetricGrid
        className="mb-8"
        metrics={[
          { label: 'Total volume', value: formatCurrency(metrics.totalVolume), hint: 'Completed payments' },
          { label: 'Total revenue', value: formatCurrency(metrics.totalRevenue), hint: 'Platform fees' },
          { label: 'Successful payments', value: String(metrics.successfulPayments) },
          { label: 'Failed payments', value: String(metrics.failedPayments) },
          { label: 'Pending settlements', value: String(metrics.pendingSettlements) },
          {
            label: 'Wallet balances',
            value: formatCurrency(metrics.walletBalanceTotal),
            hint: 'All currencies'
          }
        ]}
      />

      {charts.volumeSeries.length > 0 ? (
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <BarChartPlaceholder
              title="Payment volume"
              subtitle="Last 7 days"
              data={charts.volumeSeries}
            />
          </div>
          {charts.currencyDistribution.length > 0 ? (
            <DonutChartPlaceholder title="Currency distribution" data={charts.currencyDistribution} />
          ) : null}
        </div>
      ) : null}

      {charts.revenueSeries.length > 0 ? (
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <BarChartPlaceholder title="Revenue" subtitle="Platform fees (last 7 days)" data={charts.revenueSeries} />
          <div className="rounded-lg border border-border bg-surface p-6">
            <h3 className="font-display font-semibold text-base mb-4">Settlement status</h3>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="rounded-md bg-background border border-border p-3">
                <p className="text-xs text-muted">Pending</p>
                <p className="font-display font-bold text-lg mt-1">{settlementCounts.pending}</p>
              </div>
              <div className="rounded-md bg-background border border-border p-3">
                <p className="text-xs text-muted">Completed</p>
                <p className="font-display font-bold text-lg mt-1">{settlementCounts.completed}</p>
              </div>
              <div className="rounded-md bg-background border border-border p-3">
                <p className="text-xs text-muted">Failed</p>
                <p className="font-display font-bold text-lg mt-1">{settlementCounts.failed}</p>
              </div>
            </div>
            <Link
              href="/merchant/settlements"
              className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
            >
              View settlements <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      ) : null}

      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-lg">Recent transactions</h2>
          <Link href="/merchant/transactions" className="text-sm text-accent hover:underline">
            View all
          </Link>
        </div>
        <DataTable
          columns={[
            { key: 'id', header: 'ID', render: (r) => <span className="font-mono text-xs">{r.id.slice(0, 8)}…</span> },
            { key: 'type', header: 'Type', render: (r) => <span className="capitalize">{r.type}</span> },
            { key: 'counterparty', header: 'Counterparty', render: (r) => r.counterparty },
            {
              key: 'amount',
              header: 'Amount',
              render: (r) => formatCurrency(r.amount, r.currency)
            },
            { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
            { key: 'date', header: 'Date', render: (r) => formatDate(r.date) }
          ]}
          rows={recentTx}
          emptyTitle="No transactions yet"
          emptyDescription="Transactions appear here when customers pay or you move money."
        />
      </div>
    </div>
  )
}
