import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { LandingHeroGlobe } from '@/components/landing/landing-hero-globe-lazy'

function DashboardMockup() {
  return (
    <div className="rounded-xl border border-border bg-surface shadow-xl shadow-slate-900/10 p-3 sm:p-4 w-full">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <span className="text-xs font-medium text-muted">Overview</span>
        <span className="text-[10px] text-muted">Last 30 days</span>
      </div>
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mb-3 sm:mb-4">
        {[
          { label: 'Total Volume', value: 'KES 2.45M' },
          { label: 'Payments', value: '1,245' },
          { label: 'Settled', value: 'USD 18.6K' }
        ].map((s) => (
          <div key={s.label} className="rounded-lg bg-background p-1.5 sm:p-2 min-w-0">
            <p className="text-[9px] sm:text-[10px] text-muted truncate">{s.label}</p>
            <p className="text-[11px] sm:text-xs font-semibold text-foreground mt-0.5 truncate">{s.value}</p>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-muted mb-2">Payment volume</p>
      <div className="flex items-end gap-1 h-12 sm:h-16">
        {[35, 55, 40, 70, 50, 85, 60, 90, 75, 95].map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-sm bg-accent/80"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    </div>
  )
}

function PhoneMockup() {
  const methods = [
    { name: 'M-Pesa', active: true },
    { name: 'Airtel Money', active: false },
    { name: 'Card', active: false },
    { name: 'Bank Transfer', active: false }
  ]

  return (
    <div className="rounded-2xl border-4 border-slate-200 bg-white shadow-xl shadow-slate-900/10 w-40 sm:w-44 mx-auto shrink-0 overflow-hidden">
      <div className="bg-background px-3 py-2 text-center">
        <div className="mx-auto h-1 w-8 rounded-full bg-border" />
      </div>
      <div className="p-3 space-y-2">
        <p className="text-[10px] text-muted text-center">Pay Merchant</p>
        <p className="text-base sm:text-lg font-bold text-center text-foreground">KES 12,950</p>
        <p className="text-[9px] text-muted text-center mb-3">~ USD 100.00</p>
        {methods.map((m) => (
          <div
            key={m.name}
            className={`rounded-md border px-2 py-1.5 text-[10px] font-medium ${
              m.active ? 'border-accent bg-accent/5 text-accent' : 'border-border text-muted'
            }`}
          >
            {m.name}
          </div>
        ))}
        <div className="rounded-md bg-accent text-white text-center text-[10px] font-medium py-2 mt-2">
          Pay now
        </div>
      </div>
    </div>
  )
}

export function LandingHero() {
  return (
    <section className="relative overflow-hidden hero-canvas text-foreground">
      <LandingHeroGlobe />

      <div className="relative z-10 mx-auto max-w-7xl container-pad pt-8 pb-10 sm:pt-12 sm:pb-12 lg:pt-20 lg:pb-16">
        <div className="flex flex-col lg:grid lg:grid-cols-2 gap-8 lg:gap-10 items-center">
          <div className="relative w-full text-center sm:text-left">
            <h1 className="font-display text-[1.75rem] leading-[1.15] xs:text-3xl sm:text-4xl md:text-5xl lg:text-[3.25rem] font-bold tracking-tight text-foreground">
              Local payments.{' '}
              <span className="text-gradient-hero">Global commerce.</span>
            </h1>
            <p className="mt-4 sm:mt-6 text-base sm:text-lg text-muted max-w-xl mx-auto sm:mx-0 leading-relaxed">
              NexusPay is an Open Payments infrastructure platform. We enable digital platforms
              to accept cross-border payments from local payment systems — M-Pesa, mobile money,
              and more — through a single API.
            </p>
            <p className="mt-3 text-sm text-muted max-w-xl mx-auto sm:mx-0">
              Payment Gateway is our first product. Tomorrow: payroll, escrow, marketplace payouts,
              and B2B settlements on the same layer.
            </p>
            <div className="flex flex-col xs:flex-row flex-wrap gap-3 sm:gap-4 mt-8 sm:mt-10 justify-center sm:justify-start">
              <Link
                href="/signup"
                className="inline-flex h-12 w-full xs:w-auto items-center justify-center gap-2 rounded-lg bg-accent px-6 text-sm font-medium text-white hover:bg-accent/90 transition-colors"
              >
                Start for Free <ArrowUpRight className="h-4 w-4" />
              </Link>
              <a
                href="#contact"
                className="inline-flex h-12 w-full xs:w-auto items-center justify-center rounded-lg border border-border bg-surface/80 px-6 text-sm font-medium text-foreground hover:bg-surface transition-colors"
              >
                Contact Sales
              </a>
            </div>
          </div>

          <div className="relative z-10 w-full max-w-sm mx-auto lg:max-w-none lg:mx-0">
            <div className="flex flex-col items-center gap-5 sm:gap-6 lg:flex-row lg:items-end lg:justify-end">
              <div className="w-full hidden md:block lg:max-w-md">
                <DashboardMockup />
              </div>
              <PhoneMockup />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
