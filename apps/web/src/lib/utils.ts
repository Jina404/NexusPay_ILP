import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatKes(amount: number): string {
  return formatCurrency(amount, 'KES')
}

export function formatCurrency(amount: number, currency = 'KES'): string {
  const noDecimals = currency === 'UGX'
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency,
    minimumFractionDigits: noDecimals ? 0 : 0,
    maximumFractionDigits: noDecimals ? 0 : 2
  }).format(amount)
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-KE', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(iso))
}

export const COUNTRIES = [
  { code: 'KE', name: 'Kenya', live: true },
  { code: 'UG', name: 'Uganda', live: false },
  { code: 'TZ', name: 'Tanzania', live: false },
  { code: 'ET', name: 'Ethiopia', live: false },
  { code: 'SD', name: 'Sudan', live: false }
] as const

export type CountryCode = (typeof COUNTRIES)[number]['code']

export const ORDER_STEPS = [
  { key: 'placed', label: 'Order placed' },
  { key: 'payment_received', label: 'Payment received' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'escrow_released', label: 'Escrow released' }
] as const

export const PLATFORM_FEE_RATE = 0.025
