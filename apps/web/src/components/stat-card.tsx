import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'

export function StatCard({
  label,
  value,
  hint,
  className
}: {
  label: string
  value: string
  hint?: string
  className?: string
}) {
  return (
    <Card className={cn(className)}>
      <CardContent className="p-5">
        <p className="text-sm text-muted">{label}</p>
        <p className="font-display text-2xl font-bold mt-1">{value}</p>
        {hint ? <p className="text-xs text-muted mt-1">{hint}</p> : null}
      </CardContent>
    </Card>
  )
}
