'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { getApiUrl } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NexusPayLogo } from '@/components/nexuspay-logo'
import { Download } from 'lucide-react'

interface PaymentInfo {
  id: string
  checkout_reference: string
  amount: number
  currency: string
  status: string
  payment_method: string
  metadata?: { mpesa_receipt?: string }
}

interface PaymentLinkInfo {
  link: {
    publicId: string
    title: string
    description: string | null
    linkType: 'fixed' | 'open'
    amount: number | null
    currency: string
    status: string
  }
  merchant: { name: string }
}

type PageMode = 'loading' | 'link' | 'payment' | 'not_found'

export default function HostedCheckoutPage() {
  const { reference: token } = useParams<{ reference: string }>()
  const [mode, setMode] = useState<PageMode>('loading')
  const [linkInfo, setLinkInfo] = useState<PaymentLinkInfo | null>(null)
  const [payment, setPayment] = useState<PaymentInfo | null>(null)
  const [phone, setPhone] = useState('')
  const [amount, setAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checkoutRef, setCheckoutRef] = useState<string | null>(null)
  const [customerMessage, setCustomerMessage] = useState<string | null>(null)

  useEffect(() => {
    async function resolve() {
      try {
        const linkRes = await fetch(`${getApiUrl()}/pay/${token}`)
        if (linkRes.ok) {
          const data = (await linkRes.json()) as PaymentLinkInfo
          setLinkInfo(data)
          if (data.link.linkType === 'open' && data.link.amount !== null) {
            setAmount(String(data.link.amount))
          }
          setMode('link')
          return
        }

        const payRes = await fetch(`${getApiUrl()}/gateway/payments/reference/${token}`)
        if (payRes.ok) {
          const data = (await payRes.json()) as PaymentInfo
          setPayment(data)
          setCheckoutRef(data.checkout_reference)
          setMode('payment')
          return
        }

        setMode('not_found')
      } catch {
        setMode('not_found')
      }
    }
    void resolve()
  }, [token])

  useEffect(() => {
    if (mode !== 'payment' || !checkoutRef) return
    if (payment?.status === 'completed' || payment?.status === 'failed') return

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${getApiUrl()}/gateway/payments/reference/${checkoutRef}`)
        if (res.ok) {
          const data = (await res.json()) as PaymentInfo
          setPayment(data)
        }
      } catch {
        /* ignore */
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [mode, checkoutRef, payment?.status])

  async function handlePay(e: React.FormEvent) {
    e.preventDefault()
    if (!linkInfo) return
    setSubmitting(true)
    setError(null)

    try {
      const body: { phone: string; amount?: number } = { phone }
      if (linkInfo.link.linkType === 'open') {
        body.amount = Number(amount)
      }

      const res = await fetch(`${getApiUrl()}/pay/${token}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Payment failed')
        return
      }

      setCheckoutRef(data.checkoutReference)
      setCustomerMessage(
        data.customerMessage ??
          'Check your phone — enter your M-Pesa PIN to complete payment.'
      )
      setMode('payment')

      const payRes = await fetch(
        `${getApiUrl()}/gateway/payments/reference/${data.checkoutReference}`
      )
      if (payRes.ok) {
        setPayment((await payRes.json()) as PaymentInfo)
      } else {
        setPayment({
          id: data.paymentId,
          checkout_reference: data.checkoutReference,
          amount: 0,
          currency: linkInfo.link.currency,
          status: data.status,
          payment_method: 'mpesa'
        })
      }
    } catch {
      setError('Could not start payment. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (mode === 'loading') {
    return <p className="p-8 text-muted text-center">Loading…</p>
  }

  if (mode === 'not_found') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <p className="text-muted">Payment link or session not found.</p>
      </div>
    )
  }

  if (mode === 'link' && linkInfo) {
    const { link, merchant } = linkInfo
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-lg border border-border bg-surface p-8">
          <NexusPayLogo
            href={null}
            size="md"
            className="justify-center mb-2"
            wordmarkClassName="text-xl text-accent"
          />
          <p className="text-center text-sm text-muted mb-1">{merchant.name}</p>
          <h1 className="font-display text-xl font-bold text-center mb-1">{link.title}</h1>
          {link.description ? (
            <p className="text-sm text-muted text-center mb-6">{link.description}</p>
          ) : (
            <div className="mb-6" />
          )}

          {link.linkType === 'fixed' && link.amount !== null ? (
            <div className="rounded-lg border border-border bg-background p-4 mb-6 text-center">
              <p className="text-xs text-muted uppercase tracking-wide mb-1">Amount to pay</p>
              <p className="text-3xl font-bold">
                {formatCurrency(link.amount, link.currency)}
              </p>
            </div>
          ) : null}

          <form onSubmit={handlePay} className="space-y-4">
            {link.linkType === 'open' ? (
              <div>
                <label className="text-sm text-muted block mb-1">Amount ({link.currency})</label>
                <Input
                  type="number"
                  min="10"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount"
                  required
                />
              </div>
            ) : link.linkType === 'fixed' && link.amount !== null ? (
              <div>
                <label className="text-sm text-muted block mb-1">Amount</label>
                <Input
                  type="text"
                  value={formatCurrency(link.amount, link.currency)}
                  readOnly
                  className="bg-background font-medium"
                />
              </div>
            ) : null}
            <div>
              <label className="text-sm text-muted block mb-1">M-Pesa phone number</label>
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="07XX XXX XXX"
                required
              />
            </div>
            <p className="text-xs text-muted">
              You will receive an M-Pesa prompt on your phone. Enter your PIN only — do not send
              money manually.
            </p>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting
                ? 'Sending STK Push…'
                : link.linkType === 'fixed' && link.amount !== null
                  ? `Pay ${formatCurrency(link.amount, link.currency)}`
                  : 'Pay now'}
            </Button>
          </form>
        </div>
      </div>
    )
  }

  const invoiceUrl = checkoutRef
    ? `${getApiUrl()}/gateway/payments/reference/${checkoutRef}/invoice.pdf`
    : null

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-surface p-8 text-center">
        <NexusPayLogo
          href={null}
          size="md"
          className="justify-center mb-2"
          wordmarkClassName="text-xl text-accent"
        />
        <p className="text-muted text-sm mb-6">Secure checkout</p>
        {payment ? (
          <>
            {payment.amount > 0 ? (
              <p className="text-3xl font-bold mb-1">
                {formatCurrency(payment.amount / 100, payment.currency)}
              </p>
            ) : null}
            <p className="text-sm text-muted mb-4 font-mono">{payment.checkout_reference}</p>
            <p className="capitalize text-sm mb-6">
              Status: <span className="font-medium">{payment.status}</span>
            </p>
            {payment.status === 'processing' || payment.status === 'pending' ? (
              <div className="rounded-lg border border-accent/30 bg-accent/5 p-4 mb-4">
                <p className="text-sm font-medium text-accent mb-1">Check your phone</p>
                <p className="text-sm text-muted">
                  {customerMessage ??
                    'Enter your M-Pesa PIN on the STK prompt to complete payment.'}
                </p>
              </div>
            ) : null}
            {payment.status === 'completed' ? (
              <div className="space-y-4">
                <p className="text-accent font-medium">Payment successful</p>
                {payment.metadata?.mpesa_receipt ? (
                  <p className="text-xs text-muted">
                    M-Pesa receipt: {payment.metadata.mpesa_receipt}
                  </p>
                ) : null}
                {invoiceUrl ? (
                  <a
                    href={invoiceUrl}
                    download
                    className="inline-flex w-full items-center justify-center rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-background"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download receipt
                  </a>
                ) : null}
              </div>
            ) : null}
            {payment.status === 'failed' ? (
              <p className="text-red-600 font-medium">Payment failed or timed out</p>
            ) : null}
          </>
        ) : (
          <p className="text-muted">Waiting for payment session…</p>
        )}
      </div>
    </div>
  )
}
