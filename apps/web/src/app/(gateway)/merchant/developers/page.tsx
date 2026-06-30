'use client'

import { useCallback, useEffect, useState } from 'react'
import { PageHeader } from '@/components/page-header'
import { SectionTabs } from '@/components/merchant/section-tabs'
import { DataTable } from '@/components/merchant/data-table'
import { DataError, LoadingState } from '@/components/merchant/merchant-page-state'
import { Button } from '@/components/ui/button'
import { merchantApi } from '@/lib/merchant-api'
import type { ApiKeyRow } from '@/lib/merchant-types'
import { formatDate } from '@/lib/utils'
import { getApiUrl } from '@/lib/supabase'
import { Copy, RefreshCw } from 'lucide-react'

const tabs = [
  { id: 'keys', label: 'API Keys' },
  { id: 'docs', label: 'Documentation' }
]

export default function MerchantDevelopersPage() {
  const [tab, setTab] = useState('keys')
  const [keys, setKeys] = useState<ApiKeyRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [revealedKey, setRevealedKey] = useState<string | null>(null)
  const [regenerating, setRegenerating] = useState(false)
  const [copied, setCopied] = useState(false)

  const loadKeys = useCallback(async () => {
    setLoading(true)
    setError(null)
    const data = await merchantApi.getApiKeys()
    if (!data) setError('Failed to load API keys')
    else setKeys(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    void loadKeys()
  }, [loadKeys])

  async function handleRegenerate() {
    setRegenerating(true)
    setError(null)
    const result = await merchantApi.regenerateApiKey()
    if (result.error || !result.data?.apiKey) {
      setError(result.error ?? 'Failed to regenerate API key')
    } else {
      setRevealedKey(result.data.apiKey)
      await loadKeys()
    }
    setRegenerating(false)
  }

  async function handleCopy(value: string) {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('Could not copy to clipboard')
    }
  }

  const liveKey = keys.find((k) => k.name === 'default' || k.name === 'live') ?? keys[0]

  return (
    <div>
      <PageHeader
        title="Developers"
        description="API keys and integration documentation for server-side integrations."
      />

      <SectionTabs tabs={tabs} active={tab} onChange={setTab} />

      {tab === 'keys' ? (
        <div className="space-y-6">
          {loading ? <LoadingState /> : null}
          <DataError message={error ?? ''} />

          {!loading ? (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-border bg-surface p-5 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-display font-semibold">Live API Key</h3>
                    <span className="text-xs font-medium text-accent bg-accent/10 px-2 py-0.5 rounded">
                      Production
                    </span>
                  </div>
                  <p className="text-sm text-muted">
                    Use this key in your backend to create payment links, process payouts, and call
                    the NexusPay API in production.
                  </p>
                  {revealedKey ? (
                    <div className="space-y-2">
                      <code className="block text-xs font-mono bg-background border rounded-md p-3 break-all">
                        {revealedKey}
                      </code>
                      <p className="text-xs text-amber-700">
                        Copy this key now. It will not be shown again.
                      </p>
                      <Button size="sm" variant="outline" onClick={() => void handleCopy(revealedKey)}>
                        <Copy className="h-3.5 w-3.5 mr-1.5" />
                        {copied ? 'Copied' : 'Copy key'}
                      </Button>
                    </div>
                  ) : liveKey ? (
                    <code className="block text-sm font-mono bg-background border rounded-md px-3 py-2">
                      {liveKey.prefix}••••••••••••••••
                    </code>
                  ) : (
                    <p className="text-sm text-muted">No live key yet. Regenerate to create one.</p>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={regenerating}
                    onClick={() => void handleRegenerate()}
                  >
                    <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${regenerating ? 'animate-spin' : ''}`} />
                    {regenerating ? 'Regenerating…' : 'Regenerate key'}
                  </Button>
                </div>

                <div className="rounded-lg border border-border bg-surface p-5 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-display font-semibold">Test API Key</h3>
                    <span className="text-xs font-medium text-muted bg-background border px-2 py-0.5 rounded">
                      Sandbox
                    </span>
                  </div>
                  <p className="text-sm text-muted">
                    Use the same live key against the sandbox API base URL while M-Pesa is in sandbox
                    mode. Separate test keys can be added in a future release.
                  </p>
                  <code className="block text-sm font-mono bg-background border rounded-md px-3 py-2 text-muted">
                    {liveKey ? `${liveKey.prefix}••••••••••••••••` : 'np_test_••••••••••••••••'}
                  </code>
                  <p className="text-xs text-muted">
                    Point requests to your sandbox environment and Daraja sandbox credentials.
                  </p>
                </div>
              </div>

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
                emptyDescription="Regenerate a key to start integrating with the NexusPay API."
              />
            </>
          ) : null}
        </div>
      ) : null}

      {tab === 'docs' ? (
        <div className="rounded-lg border border-border bg-surface p-6 space-y-6">
          <div>
            <h3 className="font-display font-semibold mb-2">Quick start</h3>
            <ol className="text-sm text-muted space-y-2 list-decimal list-inside">
              <li>Sign in to the merchant dashboard with your email and password</li>
              <li>Copy your API key from the API Keys tab above</li>
              <li>
                Create a payment link via{' '}
                <code className="text-xs bg-background border px-1 rounded">POST /payment-links</code>{' '}
                with{' '}
                <code className="text-xs bg-background border px-1 rounded">
                  Authorization: Bearer np_live_…
                </code>
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
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  )
}
