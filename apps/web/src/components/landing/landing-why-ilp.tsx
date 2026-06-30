import { Check } from 'lucide-react'

const benefits = [
  'Request payments and generate quotes across financial systems',
  'Settle across different rails without rebuilding integrations',
  'Communicate using wallet addresses and Open Payments standards',
  'Notify merchants in real time with webhooks',
  'Add new local payment providers through one interoperable layer'
]

export function LandingWhyIlp() {
  return (
    <section id="why-interledger" className="section-pad scroll-mt-14 sm:scroll-mt-16 bg-surface/50 border-t border-border">
      <div className="mx-auto max-w-7xl container-pad">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-foreground">
              Why Interledger?
            </h2>
            <p className="text-muted mt-4 text-base sm:text-lg leading-relaxed">
              Interledger is the technology that makes NexusPay possible. Rather than integrating
              separately with every payment network, Open Payments gives us one interoperable layer
              for cross-border value transfer.
            </p>
            <p className="text-muted mt-4 text-sm leading-relaxed">
              We don&apos;t replace payment providers — we connect them. That is how local fintechs
              participate in global commerce.
            </p>
          </div>
          <ul className="space-y-3">
            {benefits.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-foreground">
                <Check className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
