'use client'

import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/page-header'
import { SectionTabs } from '@/components/merchant/section-tabs'
import { DataTable } from '@/components/merchant/data-table'
import { DataError, LoadingState } from '@/components/merchant/api-key-banner'
import { merchantApi } from '@/lib/merchant-api'
import type { ApiKeyRow } from '@/lib/merchant-types'
import { formatDate } from '@/lib/utils'
import { getApiUrl } from '@/lib/supabase'

const tabs = [
  { id: 'keys', label: 'API Keys' },
  { id: 'docs', label: 'Documentation' }
]

export default function MerchantDevelopersPage() {
  const [tab, setTab] = useState('keys')
  const [keys, setKeys] = useState<ApiKeyRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const data = await merchantApi.getApiKeys()
      if (!data) setError('API key not configured')
      else setKeys(data)
      setLoading(false)
    }
    void load()
  }, [])

  return (
    <div>
      <PageHeader
        title="Developers"
        description="API keys and integration documentation."
      />

      <SectionTabs tabs={tabs} active={tab} onChange={setTab} />

      {tab === 'keys' ? (
        <div className="space-y-4">
          {loading ? <LoadingState /> : null}
          <DataError message={error ?? ''} />
          {!loading ? (
            <DataTable
              columns={[
                { key: 'name', header: 'Name', render: (r) => r.name },
                {
                  key: 'prefix',
                  header: 'Key prefix',
                  render: (r) => <span className="font-mono text-xs">{r.prefix}••••••••</span>
                },
                { key: 'created', header: 'Created', render: (r) => formatDate(r.createdAt) },
                {
                  key: 'last',
                  header: 'Last used',
                  render: (r) => (r.lastUsed ? formatDate(r.lastUsed) : 'Never')
                }
              ]}
              rows={keys}
              emptyTitle="No API keys"
              emptyDescription="Register a merchant via POST /merchants/register to receive an API key."
            />
          ) : null}
        </div>
      ) : null}

      {tab === 'docs' ? (
        <div className="rounded-lg border border-border bg-surface p-6 space-y-6">
          <div>
            <h3 className="font-display font-semibold mb-2">Quick start</h3>
            <ol className="text-sm text-muted space-y-2 list-decimal list-inside">
              <li>
                Register your merchant via{' '}
                <code className="text-xs bg-background border px-1 rounded">POST /merchants/register</code>
              </li>
              <li>Save the API key using the banner at the top of the dashboard</li>
              <li>
                Create a payment link via{' '}
                <code className="text-xs bg-background border px-1 rounded">POST /payment-links</code>
              </li>
              <li>Share the hosted checkout URL with customers</li>
            </ol>
          </div>
          <div>
            <h3 className="font-display font-semibold mb-2">API base URL</h3>
            <p className="text-sm font-mono text-muted">{getApiUrl()}</p>
          </div>
          <div>
            <h3 className="font-display font-semibold mb-2">Key endpoints</h3>
            <ul className="text-sm font-mono space-y-1 text-muted">
              <li>POST /payment-links</li>
              <li>POST /pay/:publicId/checkout</li>
              <li>GET /gateway/payments/reference/:ref</li>
              <li>POST /payouts</li>
              <li>POST /refunds</li>
              <li>GET /merchants/me/stats</li>
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  )
}
