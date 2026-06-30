const streams = [
  {
    title: 'Transaction fees',
    detail: '0.8–1.5% on processed volume through the platform'
  },
  {
    title: 'Enterprise APIs',
    detail: 'Monthly SaaS for high-volume platforms and marketplaces'
  },
  {
    title: 'Settlement services',
    detail: 'FX and cross-border settlement where applicable'
  },
  {
    title: 'Premium analytics',
    detail: 'Merchant dashboard insights, reporting, and API access tiers'
  }
]

export function LandingBusinessModel() {
  return (
    <section id="business-model" className="section-pad scroll-mt-14 sm:scroll-mt-16 bg-surface/50 border-t border-border">
      <div className="mx-auto max-w-7xl container-pad">
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
          <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            Business model
          </h2>
          <p className="text-muted mt-3 sm:mt-4 text-base sm:text-lg">
            Multiple revenue streams on top of payment infrastructure.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {streams.map((s) => (
            <div key={s.title} className="rounded-xl border border-border bg-surface p-5">
              <h3 className="font-display font-semibold text-foreground">{s.title}</h3>
              <p className="text-sm text-muted mt-2 leading-relaxed">{s.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
