const tiers = [
  {
    phase: 'Initial market',
    items: ['Cross-border marketplaces', 'Agricultural trade', 'SMEs and wholesalers']
  },
  {
    phase: 'Next',
    items: ['Freelance platforms', 'SaaS billing', 'Education', 'Creator economy']
  },
  {
    phase: 'Future',
    items: ['Payroll', 'NGO disbursements', 'B2B payments', 'Government payments']
  }
]

export function LandingMarket() {
  return (
    <section id="market" className="section-pad scroll-mt-14 sm:scroll-mt-16 border-t border-border">
      <div className="mx-auto max-w-7xl container-pad">
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
          <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            We start with cross-border digital commerce
          </h2>
          <p className="text-muted mt-3 sm:mt-4 text-base sm:text-lg">
            Payment Gateway is our first product — the infrastructure scales far beyond it.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {tiers.map((tier) => (
            <div
              key={tier.phase}
              className="rounded-xl border border-border bg-surface/90 p-6"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-accent mb-4">
                {tier.phase}
              </p>
              <ul className="space-y-2">
                {tier.items.map((item) => (
                  <li key={item} className="text-sm text-foreground">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
