import type { LucideIcon } from 'lucide-react'
import { Inbox } from 'lucide-react'

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action
}: {
  icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="rounded-full bg-background border border-border p-4 mb-4">
        <Icon className="h-8 w-8 text-muted" />
      </div>
      <h3 className="font-display font-semibold text-lg">{title}</h3>
      {description ? <p className="text-sm text-muted mt-2 max-w-sm">{description}</p> : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  )
}
