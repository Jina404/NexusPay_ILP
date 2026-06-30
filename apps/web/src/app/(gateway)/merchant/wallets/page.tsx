'use client'

import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/page-header'
import { StatCard } from '@/components/stat-card'
import { DataError, LoadingState } from '@/components/merchant/api-key-banner'
import { merchantApi } from '@/lib/merchant-api'
import type { WalletRow } from '@/lib/merchant-types'
import { formatCurrency } from '@/lib/utils'

export default function MerchantWalletsPage() {
  const [wallets, setWallets] = useState<WalletRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const data = await merchantApi.getWallets()
      if (!data) setError('API key not configured')
      else setWallets(data)
      setLoading(false)
    }
    void load()
  }, [])

  const totals = wallets.reduce(
    (acc, w) => ({
      available: acc.available + w.available,
      pending: acc.pending + w.pending,
      reserved: acc.reserved + w.reserved
    }),
    { available: 0, pending: 0, reserved: 0 }
  )

  if (loading) return <LoadingState />

  return (
    <div>
      <PageHeader
        title="Wallets"
        description="Multi-currency balances — available, pending, and reserved funds."
      />
      <DataError message={error ?? ''} />

      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <StatCard label="Total available" value={formatCurrency(totals.available)} />
        <StatCard label="Total pending" value={formatCurrency(totals.pending)} />
        <StatCard label="Total reserved" value={formatCurrency(totals.reserved)} />
      </div>

      {wallets.length === 0 ? (
        <p className="text-sm text-muted">No wallet balances yet. Complete a payment to credit your wallet.</p>
      ) : (
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
      )}
    </div>
  )
}
