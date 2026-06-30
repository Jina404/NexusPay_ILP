'use client'

import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/page-header'
import { LoadingState } from '@/components/merchant/merchant-page-state'
import { merchantApi } from '@/lib/merchant-api'
import { cn } from '@/lib/utils'

export default function MerchantSettingsPage() {
  const [businessName, setBusinessName] = useState('')
  const [email, setEmail] = useState('')
  const [settlementCurrency, setSettlementCurrency] = useState('KES')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const merchant = await merchantApi.getMe()
      if (merchant) {
        setBusinessName(String(merchant.business_name ?? ''))
        setEmail(String(merchant.email ?? ''))
        setSettlementCurrency(String(merchant.settlement_currency ?? 'KES'))
      }
      setLoading(false)
    }
    void load()
  }, [])

  if (loading) return <LoadingState />

  return (
    <div>
      <PageHeader title="Settings" description="Business profile and account preferences." />

      <div className="rounded-lg border border-border bg-surface p-6 max-w-md">
        <h3 className="font-display font-semibold text-lg mb-4">Business profile</h3>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-muted block mb-1">Business name</label>
            <input
              value={businessName}
              readOnly
              className={cn(
                'flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm'
              )}
            />
          </div>
          <div>
            <label className="text-sm text-muted block mb-1">Email</label>
            <input
              type="email"
              value={email}
              readOnly
              className={cn(
                'flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm'
              )}
            />
          </div>
          <div>
            <label className="text-sm text-muted block mb-1">Settlement currency</label>
            <input
              value={settlementCurrency}
              readOnly
              className={cn(
                'flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm'
              )}
            />
          </div>
        </div>
        <p className="text-xs text-muted mt-4">
          API keys for integrations are managed under Developers → API Keys.
        </p>
      </div>
    </div>
  )
}
