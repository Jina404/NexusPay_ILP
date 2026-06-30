'use client'

import { Input } from '@/components/ui/input'

export interface FilterBarProps {
  currency?: string
  onCurrencyChange?: (v: string) => void
  method?: string
  onMethodChange?: (v: string) => void
  dateFrom?: string
  onDateFromChange?: (v: string) => void
  dateTo?: string
  onDateToChange?: (v: string) => void
  currencies?: string[]
  methods?: string[]
}

export function FilterBar({
  currency,
  onCurrencyChange,
  method,
  onMethodChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  currencies = ['', 'KES', 'UGX', 'USD', 'SSP'],
  methods = ['', 'mpesa', 'bank', 'airtel', 'card']
}: FilterBarProps) {
  return (
    <div className="flex flex-wrap gap-3 mb-6">
      {onCurrencyChange ? (
        <select
          value={currency ?? ''}
          onChange={(e) => onCurrencyChange(e.target.value)}
          className="h-10 rounded-md border border-border bg-background px-3 text-sm"
        >
          <option value="">All currencies</option>
          {currencies.filter(Boolean).map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      ) : null}
      {onMethodChange ? (
        <select
          value={method ?? ''}
          onChange={(e) => onMethodChange(e.target.value)}
          className="h-10 rounded-md border border-border bg-background px-3 text-sm capitalize"
        >
          <option value="">All methods</option>
          {methods.filter(Boolean).map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      ) : null}
      {onDateFromChange ? (
        <Input
          type="date"
          value={dateFrom ?? ''}
          onChange={(e) => onDateFromChange(e.target.value)}
          className="w-auto"
        />
      ) : null}
      {onDateToChange ? (
        <Input
          type="date"
          value={dateTo ?? ''}
          onChange={(e) => onDateToChange(e.target.value)}
          className="w-auto"
        />
      ) : null}
    </div>
  )
}
