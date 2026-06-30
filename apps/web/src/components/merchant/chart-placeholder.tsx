export function BarChartPlaceholder({
  title,
  subtitle,
  data,
  valueSuffix = ''
}: {
  title: string
  subtitle?: string
  data: { label: string; value: number }[]
  valueSuffix?: string
}) {
  const max = Math.max(...data.map((d) => d.value), 1)

  return (
    <div className="rounded-lg border border-border bg-surface p-6">
      <h3 className="font-display font-semibold text-base">{title}</h3>
      {subtitle ? <p className="text-sm text-muted mt-1 mb-4">{subtitle}</p> : <div className="mb-4" />}
      <div className="flex items-end gap-2 h-40">
        {data.map((d) => (
          <div key={d.label} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full bg-accent/80 rounded-t transition-all"
              style={{ height: `${(d.value / max) * 100}%` }}
              title={`${d.label}: ${d.value}${valueSuffix}`}
            />
            <span className="text-[10px] text-muted">{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function DonutChartPlaceholder({
  title,
  data
}: {
  title: string
  data: { currency: string; percent: number }[]
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-6">
      <h3 className="font-display font-semibold text-base mb-4">{title}</h3>
      <div className="space-y-3">
        {data.map((d) => (
          <div key={d.currency}>
            <div className="flex justify-between text-sm mb-1">
              <span>{d.currency}</span>
              <span className="text-muted">{d.percent}%</span>
            </div>
            <div className="h-2 rounded-full bg-background overflow-hidden">
              <div
                className="h-full bg-accent rounded-full"
                style={{ width: `${d.percent}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
