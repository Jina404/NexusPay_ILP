import {
  CreditCard,
  Globe,
  ArrowLeftRight,
  Send,
  Shield,
  Code2
} from 'lucide-react'

const features = [
  {
    icon: CreditCard,
    title: 'Accept Payments',
    desc: 'M-Pesa, Airtel Money, Cards, and Bank transfers — all in one integration.'
  },
  {
    icon: Globe,
    title: 'Multi-Currency',
    desc: 'Hold, convert, and settle in KES, UGX, TZS, USD, EUR, and more.'
  },
  {
    icon: ArrowLeftRight,
    title: 'Global Settlement',
    desc: 'Interledger Protocol for fast, low-cost cross-border settlements.'
  },
  {
    icon: Send,
    title: 'Payouts',
    desc: 'Pay vendors, partners, and freelancers to bank, M-Pesa, or Airtel wallets.'
  },
  {
    icon: Shield,
    title: 'Escrow & Compliance',
    desc: 'Secure fund holds, KYC-ready flows, and audit trails for B2B payments.'
  },
  {
    icon: Code2,
    title: 'Developer Friendly',
    desc: 'Powerful APIs, webhooks, and SDKs to integrate in minutes.'
  }
]

export function LandingFeaturesGrid() {
  return (
    <section id="features" className="section-pad scroll-mt-14 sm:scroll-mt-16">
      <div className="mx-auto max-w-7xl container-pad">
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
          <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            One Platform. Endless Possibilities.
          </h2>
          <p className="text-muted mt-3 sm:mt-4 text-base sm:text-lg px-2 sm:px-0">
            Everything you need to accept payments, manage money, and grow your business.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {features.map((f) => {
            const Icon = f.icon
            return (
              <div
                key={f.title}
                className="rounded-xl border border-border bg-surface/90 backdrop-blur-sm p-5 sm:p-6 hover:shadow-md transition-shadow"
              >
                <Icon className="h-5 w-5 text-slate-600 mb-4" />
                <h3 className="font-display font-semibold text-lg text-foreground">{f.title}</h3>
                <p className="text-sm text-muted mt-2 leading-relaxed">{f.desc}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
