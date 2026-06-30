const painPoints = [
  'Failed transactions at the border',
  'High fees from cards and SWIFT',
  'Slow settlements across currencies',
  'Abandoned purchases when rails do not connect'
]

const rails = [
  { region: 'Kenya', method: 'M-Pesa' },
  { region: 'Uganda', method: 'MTN Mobile Money' },
  { region: 'Tanzania', method: 'Airtel Money' },
  { region: 'India', method: 'UPI' },
  { region: 'Brazil', method: 'PIX' }
]

export function LandingProblem() {
  return (
    <section id="problem" className="section-pad scroll-mt-14 sm:scroll-mt-16 border-t border-border">
      <div className="mx-auto max-w-7xl container-pad">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-foreground">
              Payments work locally. They break at the border.
            </h2>
            <p className="text-muted mt-4 text-base sm:text-lg leading-relaxed">
              Africa has one of the fastest-growing digital economies — yet moving money across
              borders still forces businesses onto cards, banks, and expensive processors.
            </p>
            <p className="text-muted mt-4 text-sm">
              The money exists. The infrastructure doesn&apos;t.
            </p>
          </div>
          <div className="space-y-6">
            <div className="rounded-xl border border-border bg-surface p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-3">
                Local rails that work — inside their country
              </p>
              <ul className="space-y-2">
                {rails.map((r) => (
                  <li key={r.region} className="flex justify-between text-sm">
                    <span className="text-foreground">{r.region}</span>
                    <span className="text-muted">{r.method}</span>
                  </li>
                ))}
              </ul>
            </div>
            <ul className="space-y-2">
              {painPoints.map((p) => (
                <li key={p} className="text-sm text-red-700/90 flex items-center gap-2">
                  <span aria-hidden>✕</span>
                  {p}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
