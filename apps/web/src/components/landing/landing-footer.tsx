import Link from 'next/link'
import { NexusPayLogo } from '@/components/nexuspay-logo'

export function LandingFooter() {
  return (
    <footer className="border-t border-border/80 bg-surface/70 backdrop-blur-sm py-10 sm:py-12 safe-bottom">
      <div className="mx-auto max-w-7xl container-pad">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
          <NexusPayLogo href="/" size="sm" wordmarkClassName="text-lg text-foreground" />
          <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3 sm:gap-6 text-sm text-muted">
            <Link href="/merchant" className="hover:text-foreground transition-colors">
              Merchant dashboard
            </Link>
            <Link href="/login" className="hover:text-foreground transition-colors">
              Sign in
            </Link>
            <Link href="/signup" className="hover:text-foreground transition-colors">
              Create account
            </Link>
          </nav>
        </div>
        <p className="text-center text-xs text-muted mt-6 sm:mt-8 px-4 max-w-2xl mx-auto">
          The internet connected information. Interledger connects value. NexusPay connects
          people — building the infrastructure that lets local payment systems participate in the
          global digital economy.
        </p>
      </div>
    </footer>
  )
}
