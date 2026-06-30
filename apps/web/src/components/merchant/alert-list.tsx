import { AlertTriangle, Info, XCircle } from 'lucide-react'
import type { AlertRow } from '@/lib/merchant-mock-data'
import { cn } from '@/lib/utils'

const icons = {
  warning: AlertTriangle,
  info: Info,
  error: XCircle
}

const styles = {
  warning: 'text-amber-600',
  info: 'text-blue-600',
  error: 'text-red-600'
}

export function AlertList({ alerts }: { alerts: AlertRow[] }) {
  if (alerts.length === 0) return null

  return (
    <ul className="space-y-3">
      {alerts.map((a) => {
        const Icon = icons[a.type]
        return (
          <li key={a.id} className="flex gap-3 text-sm">
            <Icon className={cn('h-4 w-4 shrink-0 mt-0.5', styles[a.type])} />
            <div className="min-w-0">
              <p>{a.message}</p>
              <p className="text-xs text-muted mt-0.5">{a.time}</p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
