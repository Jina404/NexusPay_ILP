import { StatCard } from '@/components/stat-card'
import { cn } from '@/lib/utils'

export function MetricGrid({
  metrics,
  className
}: {
  metrics: { label: string; value: string; hint?: string }[]
  className?: string
}) {
  return (
    <div className={cn('grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4', className)}>
      {metrics.map((m) => (
        <StatCard key={m.label} label={m.label} value={m.value} hint={m.hint} />
      ))}
    </div>
  )
}
