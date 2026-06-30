import { Coins, Shield, Zap, Activity } from 'lucide-react'

const items = [
  {
    icon: Coins,
    title: 'Multi-Currency',
    desc: 'Local & global'
  },
  {
    icon: Shield,
    title: 'Secure & Compliant',
    desc: 'PCI DSS, KYC/AML'
  },
  {
    icon: Zap,
    title: 'Interledger Powered',
    desc: 'Fast, low-cost settlement'
  },
  {
    icon: Activity,
    title: '99.9% Uptime',
    desc: 'Reliable & scalable'
  }
]

export function LandingFeatureBar() {
  return (
    <section className="relative border-t border-border bg-surface/70 backdrop-blur-sm py-6 sm:py-8 text-foreground">
      <div className="mx-auto max-w-7xl container-pad">
        <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
          {items.map((item) => {
            const Icon = item.icon
            return (
              <div key={item.title} className="flex items-center gap-3">
                <Icon className="h-5 w-5 shrink-0 text-accent" />
                <div>
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                  <p className="text-xs text-muted">{item.desc}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
