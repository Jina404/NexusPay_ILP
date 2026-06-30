'use client'

import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Input, Label } from '@/components/ui/input'
import { Smartphone, CreditCard, Building2 } from 'lucide-react'

const METHODS = [
  { id: 'mpesa', label: 'M-Pesa', icon: Smartphone, live: true },
  { id: 'mtn', label: 'MTN Mobile Money', icon: Smartphone, live: false },
  { id: 'airtel', label: 'Airtel Money', icon: Smartphone, live: false },
  { id: 'bank', label: 'Bank transfer', icon: Building2, live: false },
  { id: 'card', label: 'Card', icon: CreditCard, live: false }
] as const

export function PaymentMethodPicker({
  selected,
  onSelect,
  phone,
  onPhoneChange
}: {
  selected: string
  onSelect: (id: string) => void
  phone: string
  onPhoneChange: (v: string) => void
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2">
        {METHODS.map((m) => {
          const Icon = m.icon
          const active = selected === m.id
          return (
            <button
              key={m.id}
              type="button"
              disabled={!m.live}
              onClick={() => m.live && onSelect(m.id)}
              className={cn(
                'flex items-center gap-3 rounded-lg border p-4 text-left transition-colors',
                active ? 'border-accent bg-accent/5' : 'border-border bg-surface',
                !m.live && 'opacity-50 cursor-not-allowed'
              )}
            >
              <Icon className="h-5 w-5 text-accent" />
              <div className="flex-1">
                <p className="text-sm font-medium">{m.label}</p>
                {!m.live ? (
                  <Badge variant="secondary" className="mt-1">
                    Coming soon
                  </Badge>
                ) : null}
              </div>
            </button>
          )
        })}
      </div>
      {selected === 'mpesa' ? (
        <div>
          <Label htmlFor="mpesa-phone">M-Pesa phone number</Label>
          <Input
            id="mpesa-phone"
            placeholder="2547XXXXXXXX"
            value={phone}
            onChange={(e) => onPhoneChange(e.target.value)}
            className="mt-1.5"
          />
        </div>
      ) : null}
    </div>
  )
}
