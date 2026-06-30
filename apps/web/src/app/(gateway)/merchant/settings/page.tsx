'use client'

import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/page-header'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { LoadingState } from '@/components/merchant/api-key-banner'
import { merchantApi, getStoredApiKey, setStoredApiKey } from '@/lib/merchant-api'
import { cn } from '@/lib/utils'

const sections = [
  { id: 'profile', label: 'Business profile' },
  { id: 'security', label: 'Security' }
] as const

export default function MerchantSettingsPage() {
  const [section, setSection] = useState<string>('profile')
  const [businessName, setBusinessName] = useState('')
  const [email, setEmail] = useState('')
  const [settlementCurrency, setSettlementCurrency] = useState('KES')
  const [apiKey, setApiKey] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const merchant = await merchantApi.getMe()
      if (merchant) {
        setBusinessName(String(merchant.business_name ?? ''))
        setEmail(String(merchant.email ?? ''))
        setSettlementCurrency(String(merchant.settlement_currency ?? 'KES'))
      }
      setApiKey(getStoredApiKey() ?? '')
      setLoading(false)
    }
    void load()
  }, [])

  if (loading) return <LoadingState />

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Business profile and API connection."
      />

      <div className="flex flex-col lg:flex-row gap-8">
        <nav className="lg:w-48 shrink-0 space-y-1">
          {sections.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSection(s.id)}
              className={cn(
                'w-full text-left px-3 py-2 rounded-md text-sm transition-colors',
                section === s.id
                  ? 'bg-accent/10 text-accent font-medium'
                  : 'text-muted hover:text-foreground hover:bg-background'
              )}
            >
              {s.label}
            </button>
          ))}
        </nav>

        <div className="flex-1 rounded-lg border border-border bg-surface p-6">
          {section === 'profile' ? (
            <div className="space-y-4 max-w-md">
              <h3 className="font-display font-semibold text-lg">Business profile</h3>
              <div>
                <label className="text-sm text-muted block mb-1">Business name</label>
                <Input value={businessName} readOnly className="bg-background" />
              </div>
              <div>
                <label className="text-sm text-muted block mb-1">Email</label>
                <Input type="email" value={email} readOnly className="bg-background" />
              </div>
              <div>
                <label className="text-sm text-muted block mb-1">Settlement currency</label>
                <Input value={settlementCurrency} readOnly className="bg-background" />
              </div>
            </div>
          ) : null}

          {section === 'security' ? (
            <div className="space-y-4 max-w-md">
              <h3 className="font-display font-semibold text-lg">API key</h3>
              <p className="text-sm text-muted">
                Your API key connects this dashboard to live payment data. It is stored only in your
                browser.
              </p>
              <Input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="np_live_..."
                className="font-mono text-sm"
              />
              <Button
                onClick={() => {
                  const trimmed = apiKey.trim()
                  if (!trimmed) return
                  setStoredApiKey(trimmed)
                  window.location.reload()
                }}
              >
                Save API key
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
