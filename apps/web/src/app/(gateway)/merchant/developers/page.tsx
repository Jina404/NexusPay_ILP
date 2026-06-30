'use client'

import { useState } from 'react'
import { PageHeader } from '@/components/page-header'
import { SectionTabs } from '@/components/merchant/section-tabs'
import { DataTable } from '@/components/merchant/data-table'
import { StatusBadge } from '@/components/merchant/status-badge'
import { Button } from '@/components/ui/button'
import { apiKeys, webhooks, apiLogs } from '@/lib/merchant-mock-data'
import { formatDate } from '@/lib/utils'
import { Copy } from 'lucide-react'

const tabs = [
  { id: 'keys', label: 'API Keys' },
  { id: 'webhooks', label: 'Webhooks' },
  { id: 'logs', label: 'Logs' },
  { id: 'docs', label: 'Documentation' }
]

export default function MerchantDevelopersPage() {
  const [tab, setTab] = useState('keys')

  return (
    <div>
      <PageHeader
        title="Developers"
        description="API keys, webhooks, request logs, and integration documentation."
      />

      <SectionTabs tabs={tabs} active={tab} onChange={setTab} />

      {tab === 'keys' ? (
        <div className="space-y-4">
          <DataTable
            columns={[
              { key: 'name', header: 'Name', render: (r) => r.name },
              { key: 'prefix', header: 'Key prefix', render: (r) => <span className="font-mono text-xs">{r.prefix}••••••••</span> },
              { key: 'created', header: 'Created', render: (r) => formatDate(r.createdAt) },
              { key: 'last', header: 'Last used', render: (r) => (r.lastUsed ? formatDate(r.lastUsed) : 'Never') },
              {
                key: 'actions',
                header: '',
                render: () => (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      <Copy className="h-3.5 w-3.5 mr-1" /> Copy
                    </Button>
                    <Button size="sm" variant="outline">Regenerate</Button>
                  </div>
                )
              }
            ]}
            rows={apiKeys}
          />
        </div>
      ) : null}

      {tab === 'webhooks' ? (
        <DataTable
          columns={[
            { key: 'url', header: 'Endpoint', render: (r) => <span className="font-mono text-xs">{r.url}</span> },
            { key: 'events', header: 'Events', render: (r) => r.events.join(', ') },
            { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
            { key: 'last', header: 'Last delivery', render: (r) => formatDate(r.lastDelivery) }
          ]}
          rows={webhooks}
        />
      ) : null}

      {tab === 'logs' ? (
        <DataTable
          columns={[
            { key: 'method', header: 'Method', render: (r) => <span className="font-mono text-xs">{r.method}</span> },
            { key: 'path', header: 'Path', render: (r) => <span className="font-mono text-xs">{r.path}</span> },
            {
              key: 'status',
              header: 'Status',
              render: (r) => (
                <span className={r.status >= 400 ? 'text-red-600' : 'text-accent'}>{r.status}</span>
              )
            },
            { key: 'time', header: 'Timestamp', render: (r) => formatDate(r.timestamp) }
          ]}
          rows={apiLogs}
        />
      ) : null}

      {tab === 'docs' ? (
        <div className="rounded-lg border border-border bg-surface p-6 space-y-6">
          <div>
            <h3 className="font-display font-semibold mb-2">Quick start</h3>
            <ol className="text-sm text-muted space-y-2 list-decimal list-inside">
              <li>Register your merchant via <code className="text-xs bg-background border px-1 rounded">POST /merchants/register</code></li>
              <li>Create a checkout session via <code className="text-xs bg-background border px-1 rounded">POST /checkout</code></li>
              <li>Redirect customers to <code className="text-xs bg-background border px-1 rounded">/pay/[reference]</code></li>
              <li>Listen for webhooks on payment completion</li>
            </ol>
          </div>
          <div>
            <h3 className="font-display font-semibold mb-2">Key endpoints</h3>
            <ul className="text-sm font-mono space-y-1 text-muted">
              <li>POST /checkout</li>
              <li>GET /gateway/payments/reference/:ref</li>
              <li>POST /payouts</li>
              <li>POST /refunds</li>
              <li>POST /settlements/initiate</li>
              <li>GET /rates?base=KES</li>
              <li>POST /convert</li>
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  )
}
