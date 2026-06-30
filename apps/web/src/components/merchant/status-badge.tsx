import { cn } from '@/lib/utils'

const statusStyles: Record<string, string> = {
  completed: 'bg-accent/10 text-accent border-accent/20',
  successful: 'bg-accent/10 text-accent border-accent/20',
  active: 'bg-accent/10 text-accent border-accent/20',
  released: 'bg-accent/10 text-accent border-accent/20',
  pending: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
  processing: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
  pending_release: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
  held: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
  failed: 'bg-red-500/10 text-red-700 border-red-500/20',
  rejected: 'bg-red-500/10 text-red-700 border-red-500/20',
  abandoned: 'bg-zinc-500/10 text-zinc-600 border-zinc-500/20',
  refunded: 'bg-zinc-500/10 text-zinc-600 border-zinc-500/20'
}

export function StatusBadge({ status }: { status: string }) {
  const key = status.toLowerCase().replace(/\s+/g, '_')
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize',
        statusStyles[key] ?? 'bg-background text-muted border-border'
      )}
    >
      {status.replace(/_/g, ' ')}
    </span>
  )
}
