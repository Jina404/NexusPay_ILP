'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ChevronDown, Menu, X } from 'lucide-react'
import { NexusPayLogo } from '@/components/nexuspay-logo'

const links = [
  { label: 'Platform', href: '#how-it-works', page: false },
  { label: 'Merchants', href: '/merchant', page: true },
  { label: 'Developers', href: '#developers', page: false },
  { label: 'Market', href: '#market', page: false },
  { label: 'Company', href: '#contact', page: false }
]

function NavItem({
  link,
  className,
  onNavigate,
  showChevron = false
}: {
  link: (typeof links)[number]
  className: string
  onNavigate?: () => void
  showChevron?: boolean
}) {
  if (link.page) {
    return (
      <Link href={link.href} className={className} onClick={onNavigate}>
        {link.label}
      </Link>
    )
  }

  return (
    <a href={link.href} className={className} onClick={onNavigate}>
      {link.label}
      {showChevron ? <ChevronDown className="h-3.5 w-3.5 opacity-50 shrink-0" /> : null}
    </a>
  )
}

export function LandingNav() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-surface/90 backdrop-blur-md text-foreground safe-top">
      <div className="mx-auto flex h-14 sm:h-16 max-w-7xl items-center justify-between gap-3 container-pad">
        <NexusPayLogo
          href="/"
          size="lg"
          className="shrink-0"
          wordmarkClassName="text-lg sm:text-xl text-foreground"
        />

        <nav className="hidden lg:flex items-center gap-0.5 min-w-0">
          {links.map((link) => (
            <NavItem
              key={link.label}
              link={link}
              showChevron={!link.page}
              className={
                link.page
                  ? 'rounded-md px-2.5 xl:px-3 py-2 text-sm text-muted hover:text-foreground transition-colors whitespace-nowrap'
                  : 'inline-flex items-center gap-0.5 rounded-md px-2.5 xl:px-3 py-2 text-sm text-muted hover:text-foreground transition-colors whitespace-nowrap'
              }
            />
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-2 shrink-0">
          <Link href="/login" className="text-sm text-muted hover:text-foreground transition-colors px-2 py-2">
            Sign in
          </Link>
          <Link
            href="/signup"
            className="inline-flex h-10 items-center rounded-lg bg-accent px-4 text-sm font-medium text-white hover:bg-accent/90 transition-colors"
          >
            Create Account
          </Link>
        </div>

        <button
          type="button"
          className="lg:hidden -mr-1 flex h-11 w-11 items-center justify-center rounded-lg text-foreground hover:bg-background transition-colors"
          onClick={() => setOpen(!open)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open ? (
        <div className="lg:hidden border-t border-border container-pad py-4 max-h-[calc(100dvh-3.5rem)] overflow-y-auto">
          <div className="space-y-1">
            {links.map((link) => (
              <NavItem
                key={link.label}
                link={link}
                className="flex min-h-11 items-center rounded-md px-3 text-sm text-muted hover:text-foreground hover:bg-background"
                onNavigate={() => setOpen(false)}
              />
            ))}
          </div>

          <div className="pt-4 mt-2 flex flex-col gap-2 border-t border-border">
            <Link
              href="/login"
              className="flex min-h-11 items-center px-3 text-sm text-muted hover:text-foreground"
              onClick={() => setOpen(false)}
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-accent text-sm font-medium text-white mx-0"
              onClick={() => setOpen(false)}
            >
              Create Account
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  )
}
