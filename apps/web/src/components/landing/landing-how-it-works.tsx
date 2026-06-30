import { ArrowRight } from 'lucide-react'

const steps = [
  { label: 'Buyer', detail: 'Kenya' },
  { label: 'M-Pesa', detail: 'Local rail' },
  { label: 'NexusPay', detail: 'One API' },
  { label: 'Open Payments', detail: 'Interledger' },
  { label: 'Merchant', detail: 'Uganda' },
  { label: 'Settlement', detail: 'Instant' }
]

export function LandingHowItWorks() {
  return (
    <section id="how-it-works" className="section-pad scroll-mt-14 sm:scroll-mt-16 border-t border-border">
      <div className="mx-auto max-w-7xl container-pad">
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
          <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            How it works
          </h2>
          <p className="text-muted mt-3 sm:mt-4 text-base sm:text-lg">
            No cards. No correspondent banking. No manual currency exchange. Just one API.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-center gap-3 sm:gap-2">
          {steps.map((step, i) => (
            <div key={step.label} className="flex items-center gap-2">
              <div className="rounded-lg border border-border bg-surface px-4 py-3 text-center min-w-[7rem]">
                <p className="text-sm font-semibold text-foreground">{step.label}</p>
                <p className="text-xs text-muted mt-0.5">{step.detail}</p>
              </div>
              {i < steps.length - 1 ? (
                <ArrowRight className="hidden sm:block h-4 w-4 text-muted shrink-0" />
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
