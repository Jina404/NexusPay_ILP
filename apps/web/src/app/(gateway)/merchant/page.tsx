'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { PageHeader } from '@/components/page-header'
import { MetricGrid } from '@/components/merchant/metric-grid'
import { BarChartPlaceholder, DonutChartPlaceholder } from '@/components/merchant/chart-placeholder'
import { DataTable } from '@/components/merchant/data-table'
import { AlertList } from '@/components/merchant/alert-list'
import { StatusBadge } from '@/components/merchant/status-badge'
import {
  dashboardMetrics as mockMetrics,
  volumeSeries,
  revenueSeries,
  currencyDistribution,
  transactions as mockTransactions,
  alerts,
  settlementSummary
} from '@/lib/merchant-mock-data'
import { merchantApi } from '@/lib/merchant-api'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ArrowRight } from 'lucide-react'

export default function MerchantDashboardPage() {
  const [metrics, setMetrics] = useState(mockMetrics)
  const [recentTx, setRecentTx] = useState(mockTransactions.slice(0, 5))

  useEffect(() => {
    async function load() {
      const [stats, tx] = await Promise.all([
        merchantApi.getStats(),
        merchantApi.getTransactions()
      ])
      if (stats) {
        setMetrics({
          totalVolume: stats.totalVolume,
          totalRevenue: stats.totalRevenue,
          successfulPayments: stats.successfulPayments,
          failedPayments: stats.failedPayments,
          pendingSettlements: stats.pendingSettlements,
          walletBalanceTotal: stats.walletBalanceTotal
        })
      }
      if (tx && tx.length > 0) {
        setRecentTx(
          tx.slice(0, 5).map((row) => {
            const r = row as {
              id: string
              type: string
              counterparty: string
              amount: number
              currency: string
              status: string
              date: string
            }
            return {
              id: r.id,
              type: r.type as 'payment' | 'payout' | 'refund' | 'settlement' | 'fx',
              counterparty: r.counterparty,
              amount: r.amount,
              currency: r.currency,
              status: r.status,
              date: r.date
            }
          })
        )
      }
    }
    void load()
  }, [])

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Overview of payments, revenue, and settlement health across all currencies."
      />

      <MetricGrid
        className="mb-8"
        metrics={[
          { label: 'Total volume', value: formatCurrency(metrics.totalVolume), hint: 'All time' },
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

      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <BarChartPlaceholder
            title="Payment volume"
            subtitle="Last 7 days (KES thousands)"
            data={volumeSeries}
          />
        </div>
        <DonutChartPlaceholder title="Currency distribution" data={currencyDistribution} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <BarChartPlaceholder
          title="Revenue"
          subtitle="Platform fees (KES thousands)"
          data={revenueSeries}
        />
        <div className="rounded-lg border border-border bg-surface p-6">
          <h3 className="font-display font-semibold text-base mb-4">Settlement status</h3>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="rounded-md bg-background border border-border p-3">
              <p className="text-xs text-muted">Local</p>
              <p className="font-display font-bold text-lg mt-1">{settlementSummary.local.count}</p>
              <p className="text-xs text-muted">{formatCurrency(settlementSummary.local.amount)}</p>
            </div>
            <div className="rounded-md bg-background border border-border p-3">
              <p className="text-xs text-muted">Cross-border</p>
              <p className="font-display font-bold text-lg mt-1">{settlementSummary.crossBorder.count}</p>
              <p className="text-xs text-muted">{formatCurrency(settlementSummary.crossBorder.amount)}</p>
            </div>
            <div className="rounded-md bg-background border border-border p-3">
              <p className="text-xs text-muted">ILP</p>
              <p className="font-display font-bold text-lg mt-1">{settlementSummary.ilp.count}</p>
              <p className="text-xs text-muted">{settlementSummary.ilp.status}</p>
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

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-lg">Recent transactions</h2>
            <Link href="/merchant/transactions" className="text-sm text-accent hover:underline">
              View all
            </Link>
          </div>
          <DataTable
            columns={[
              { key: 'id', header: 'ID', render: (r) => <span className="font-mono text-xs">{r.id}</span> },
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
          />
        </div>
        <div className="rounded-lg border border-border bg-surface p-6">
          <h2 className="font-display font-semibold text-lg mb-4">Alerts</h2>
          <AlertList alerts={alerts} />
        </div>
      </div>
    </div>
  )
}
