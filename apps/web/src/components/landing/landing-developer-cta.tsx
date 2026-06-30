import Link from 'next/link'
import { ArrowUpRight, Check } from 'lucide-react'

const codeSnippet = `const payment = await nexuspay.checkout.create({
  merchantId: "your-merchant-id",
  amount: 12950,
  currency: "KES",
  paymentMethod: "mpesa",
  customerPhone: "+2547XXXXXXXX",
  callbackUrl: "https://yoursite.com/webhook"
});`

export function LandingDeveloperCta() {
  return (
    <section id="developers" className="section-pad scroll-mt-14 sm:scroll-mt-16">
      <div className="mx-auto max-w-7xl container-pad">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 sm:gap-12 lg:gap-16 items-start">
          <div className="min-w-0">
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Built for platforms
            </h2>
            <p className="text-muted mt-3 sm:mt-4 text-base sm:text-lg leading-relaxed">
              One REST API connects your marketplace, SaaS, or trade platform to local payment
              rails and Open Payments settlement — webhooks and sandbox included.
            </p>
            <pre className="mt-6 sm:mt-8 rounded-xl bg-slate-900 p-4 sm:p-5 overflow-x-auto text-sm leading-relaxed -mx-1 sm:mx-0">
              <code className="text-slate-300 font-mono text-xs sm:text-[13px] whitespace-pre">
                {codeSnippet}
              </code>
            </pre>
            <a
              href="#contact"
              className="inline-flex items-center gap-1.5 mt-5 sm:mt-6 text-sm font-medium text-accent hover:underline min-h-11"
            >
              View API Docs <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>

          <div
            id="contact"
            className="rounded-2xl border border-border bg-surface/90 backdrop-blur-sm p-6 sm:p-8 lg:p-10 scroll-mt-14 sm:scroll-mt-16 shadow-sm min-w-0"
          >
            <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Ready to get started?
            </h2>
            <p className="text-muted mt-3 text-sm sm:text-base">
              Create your account and start accepting payments today.
            </p>
            <ul className="mt-5 sm:mt-6 space-y-3">
              {['No setup fees', 'Quick integration', '24/7 support'].map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-foreground">
                  <Check className="h-4 w-4 text-accent shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="flex flex-col xs:flex-row flex-wrap gap-3 mt-6 sm:mt-8">
              <Link
                href="/signup"
                className="inline-flex min-h-11 w-full xs:w-auto items-center justify-center rounded-lg bg-accent px-5 text-sm font-medium text-white hover:bg-accent/90"
              >
                Create Account
              </Link>
              <a
                href="mailto:sales@nexuspay.africa"
                className="inline-flex min-h-11 w-full xs:w-auto items-center justify-center rounded-lg border border-border px-5 text-sm font-medium hover:bg-background"
              >
                Contact Sales
              </a>
            </div>

            <div className="mt-8 sm:mt-10 flex items-center justify-center">
              <div className="relative">
                <div className="h-20 w-28 sm:h-24 sm:w-32 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xs">KES</span>
                </div>
                <div className="absolute -top-3 -right-4 h-8 w-8 rounded-full bg-amber-400 shadow-md flex items-center justify-center text-[10px] font-bold text-amber-900">
                  UGX
                </div>
                <div className="absolute -bottom-2 -left-3 h-6 w-6 rounded-full bg-emerald-400 shadow-md" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
