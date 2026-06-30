const competitors = ['Stripe', 'Flutterwave', 'PayPal', 'Visa']

export function LandingWhyWin() {
  return (
    <section id="why-win" className="section-pad scroll-mt-14 sm:scroll-mt-16 border-t border-border">
      <div className="mx-auto max-w-7xl container-pad">
        <div className="rounded-2xl border border-border bg-surface p-8 sm:p-10 lg:p-12">
          <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Why we&apos;ll win
          </h2>
          <p className="text-muted mt-4 max-w-3xl text-base sm:text-lg leading-relaxed">
            Incumbents built infrastructure around cards, banks, and traditional payment rails.
            NexusPay connects <strong className="text-foreground font-medium">local payment ecosystems</strong>{' '}
            — M-Pesa, mobile money, and Open Payments — so global platforms meet customers where
            they already pay.
          </p>
          <p className="text-foreground font-medium mt-6">
            We don&apos;t replace payment providers. We connect them.
          </p>
          <div className="flex flex-wrap gap-2 mt-6">
            {competitors.map((c) => (
              <span
                key={c}
                className="rounded-full border border-border bg-background px-3 py-1 text-xs text-muted"
              >
                vs {c}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
