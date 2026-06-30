'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getStoredApiKey, setStoredApiKey } from '@/lib/merchant-api'

export function ApiKeyBanner() {
  const [key, setKey] = useState('')
  const [saved, setSaved] = useState(() => Boolean(getStoredApiKey()))
  const [showInput, setShowInput] = useState(false)

  if (saved) return null

  return (
    <div className="mb-6 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4">
      <p className="text-sm font-medium mb-1">API key required</p>
      <p className="text-sm text-muted mb-3">
        Connect your merchant API key to load real payments, transactions, and balances from the
        database. Get one from{' '}
        <code className="text-xs bg-background border px-1 rounded">POST /merchants/register</code>{' '}
        or Developers → API Keys.
      </p>
      {showInput ? (
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="np_live_..."
            className="font-mono text-sm"
          />
          <Button
            onClick={() => {
              const trimmed = key.trim()
              if (!trimmed) return
              setStoredApiKey(trimmed)
              setSaved(true)
              window.location.reload()
            }}
          >
            Save key
          </Button>
        </div>
      ) : (
        <Button size="sm" variant="outline" onClick={() => setShowInput(true)}>
          Enter API key
        </Button>
      )}
    </div>
  )
}

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return <p className="text-sm text-muted py-8 text-center">{label}</p>
}

export function DataError({ message }: { message: string }) {
  if (message === 'API key not configured') return null
  return <p className="text-sm text-red-600 py-4">{message}</p>
}
