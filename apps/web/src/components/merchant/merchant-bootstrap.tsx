'use client'

import { useEffect, useState } from 'react'
import { DataError, LoadingState } from '@/components/merchant/merchant-page-state'
import { merchantApi } from '@/lib/merchant-api'

export function MerchantSessionProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function prepare() {
      const result = await merchantApi.bootstrap()
      if (result.error) {
        setError(result.error)
      } else {
        setReady(true)
      }
    }
    void prepare()
  }, [])

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <DataError message={error} />
        <p className="text-sm text-muted mt-2">
          Try refreshing the page. If this continues, sign out and sign in again, or contact support.
        </p>
      </div>
    )
  }

  if (!ready) return <LoadingState label="Preparing your dashboard…" />
  return <>{children}</>
}
