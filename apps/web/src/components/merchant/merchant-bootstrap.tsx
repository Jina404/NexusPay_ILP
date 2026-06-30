'use client'

import { useEffect, useState } from 'react'
import { LoadingState } from '@/components/merchant/merchant-page-state'
import { merchantApi } from '@/lib/merchant-api'

export function MerchantSessionProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    void merchantApi.bootstrap().finally(() => setReady(true))
  }, [])

  if (!ready) return <LoadingState label="Preparing your dashboard…" />
  return <>{children}</>
}
