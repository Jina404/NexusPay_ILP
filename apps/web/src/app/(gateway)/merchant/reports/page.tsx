'use client'

import { useState } from 'react'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'

const reportTypes = [
  { id: 'payments', title: 'Payments', description: 'All incoming payment activity' },
  { id: 'settlements', title: 'Settlements', description: 'Local and cross-border settlement records' },
  { id: 'payouts', title: 'Payouts', description: 'Outbound transfers to vendors and suppliers' },
  { id: 'taxes', title: 'Taxes', description: 'Tax summaries for accounting' }
]

const formats = ['CSV', 'PDF', 'Excel'] as const

export default function MerchantReportsPage() {
  const [toast, setToast] = useState<string | null>(null)

  function exportReport(type: string, format: string) {
    setToast(`${type} report (${format}) — export coming soon`)
    setTimeout(() => setToast(null), 3000)
  }

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Export payments, settlements, payouts, and tax data."
      />

      <div className="grid sm:grid-cols-2 gap-4">
        {reportTypes.map((report) => (
          <div key={report.id} className="rounded-lg border border-border bg-surface p-6">
            <h3 className="font-display font-semibold text-lg">{report.title}</h3>
            <p className="text-sm text-muted mt-1 mb-4">{report.description}</p>
            <div className="flex flex-wrap gap-2">
              {formats.map((f) => (
                <Button
                  key={f}
                  size="sm"
                  variant="outline"
                  onClick={() => exportReport(report.title, f)}
                >
                  Export {f}
                </Button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {toast ? (
        <div className="fixed bottom-6 right-6 rounded-lg border border-border bg-surface px-4 py-3 text-sm shadow-lg">
          {toast}
        </div>
      ) : null}
    </div>
  )
}
