'use client'

import { PageHeader } from '@/components/page-header'
import { StatCard } from '@/components/stat-card'
import { wallets } from '@/lib/merchant-mock-data'
import { formatCurrency } from '@/lib/utils'

export default function MerchantWalletsPage() {
  const totals = wallets.reduce(
    (acc, w) => ({
      available: acc.available + (w.currency === 'KES' ? w.available : 0),
      pending: acc.pending + (w.currency === 'KES' ? w.pending : 0),
      reserved: acc.reserved + (w.currency === 'KES' ? w.reserved : 0)
    }),
    { available: 0, pending: 0, reserved: 0 }
  )

  return (
    <div>
      <PageHeader
        title="Wallets"
        description="Multi-currency balances — available, pending, and reserved funds."
      />

      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <StatCard label="KES available (summary)" value={formatCurrency(totals.available)} />
        <StatCard label="KES pending" value={formatCurrency(totals.pending)} />
        <StatCard label="KES reserved" value={formatCurrency(totals.reserved)} />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {wallets.map((w) => (
          <div key={w.currency} className="rounded-lg border border-border bg-surface p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold text-lg">{w.currency} Wallet</h3>
              <span className="text-xs font-medium uppercase tracking-wide text-muted">{w.currency}</span>
            </div>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Available balance</dt>
                <dd className="font-medium">{formatCurrency(w.available, w.currency)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Pending balance</dt>
                <dd className="font-medium">{formatCurrency(w.pending, w.currency)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Reserved balance</dt>
                <dd className="font-medium">{formatCurrency(w.reserved, w.currency)}</dd>
              </div>
            </dl>
          </div>
        ))}
      </div>
    </div>
  )
}
