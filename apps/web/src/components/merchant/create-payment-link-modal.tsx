'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { CreatePaymentLinkInput, PaymentLinkRow } from '@/lib/merchant-api'

export function CreatePaymentLinkModal({
  open,
  onClose,
  onSubmit,
  initial
}: {
  open: boolean
  onClose: () => void
  onSubmit: (input: CreatePaymentLinkInput) => Promise<void>
  initial?: PaymentLinkRow | null
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [allowCustomAmount, setAllowCustomAmount] = useState(false)
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('KES')
  const [expiresAt, setExpiresAt] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setTitle(initial?.title ?? '')
    setDescription(initial?.description ?? '')
    setAllowCustomAmount(initial?.link_type === 'open')
    setAmount(
      initial?.amount !== null && initial?.amount !== undefined
        ? String(initial.amount / 100)
        : ''
    )
    setCurrency(initial?.currency ?? 'KES')
    setExpiresAt(initial?.expires_at ? initial.expires_at.slice(0, 10) : '')
    setError(null)
  }, [open, initial])

  if (!open) return null

  const linkType = allowCustomAmount ? 'open' : 'fixed'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const parsedAmount = Number(amount)
    if (!allowCustomAmount && (!amount || parsedAmount <= 0)) {
      setError('Enter the amount customers should pay')
      setLoading(false)
      return
    }

    try {
      await onSubmit({
        title,
        description: description || undefined,
        linkType,
        amount: allowCustomAmount ? undefined : parsedAmount,
        currency,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-lg border border-border bg-surface p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="font-display font-semibold text-lg mb-1">
          {initial ? 'Edit payment link' : 'Create payment link'}
        </h3>
        <p className="text-sm text-muted mb-4">
          Set the amount your customer will be asked to pay when they open the link.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-muted block mb-1">Title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div>
            <label className="text-sm text-muted block mb-1">Description</label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-muted block mb-1">
                {allowCustomAmount ? 'Suggested amount (optional)' : 'Amount to collect'}
              </label>
              <Input
                type="number"
                min="1"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={allowCustomAmount ? 'Leave blank for any amount' : 'e.g. 5000'}
                required={!allowCustomAmount}
              />
            </div>
            <div>
              <label className="text-sm text-muted block mb-1">Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                disabled={Boolean(initial)}
                className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm"
              >
                <option value="KES">KES</option>
                <option value="UGX">UGX</option>
                <option value="USD">USD</option>
                <option value="SSP">SSP</option>
              </select>
            </div>
          </div>

          {!initial ? (
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={allowCustomAmount}
                onChange={(e) => setAllowCustomAmount(e.target.checked)}
                className="mt-1 rounded border-border"
              />
              <span>
                <span className="text-foreground">Let customer enter their own amount</span>
                <span className="block text-xs text-muted mt-0.5">
                  Off by default — customer pays the exact amount you set above.
                </span>
              </span>
            </label>
          ) : null}

          <div>
            <label className="text-sm text-muted block mb-1">Expiration date (optional)</label>
            <Input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {initial ? 'Save' : 'Generate link'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
