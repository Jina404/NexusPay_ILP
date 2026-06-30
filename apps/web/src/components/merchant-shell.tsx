'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  CreditCard,
  ArrowLeftRight,
  Users,
  Wallet,
  Banknote,
  Send,
  Shield,
  TrendingUp,
  Code2,
  FileBarChart,
  Settings,
  Menu,
  X,
  ChevronDown,
  Link2,
  FileText,
  ShoppingCart,
  Undo2
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { NexusPayLogo } from '@/components/nexuspay-logo'
import { createClient } from '@/lib/supabase'
import { getMerchantOrgName } from '@/lib/merchant-org'
import type { LucideIcon } from 'lucide-react'

type NavLeaf = { href: string; label: string; icon: LucideIcon }
type NavItem = NavLeaf & { children?: NavLeaf[] }
type NavGroup = { label: string; items: NavItem[] }

const paymentsChildren: NavLeaf[] = [
  { href: '/merchant/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { href: '/merchant/checkout', label: 'Checkout', icon: ShoppingCart },
  { href: '/merchant/payment-links', label: 'Payment Links', icon: Link2 },
  { href: '/merchant/invoices', label: 'Invoices', icon: FileText },
  { href: '/merchant/refunds', label: 'Refunds', icon: Undo2 }
]

const navGroups: NavGroup[] = [
  {
    label: 'OVERVIEW',
    items: [{ href: '/merchant', label: 'Dashboard', icon: LayoutDashboard }]
  },
  {
    label: 'PAYMENTS',
    items: [
      { href: '/merchant/payments', label: 'Payments', icon: CreditCard, children: paymentsChildren },
      { href: '/merchant/customers', label: 'Customers', icon: Users }
    ]
  },
  {
    label: 'MONEY MOVEMENT',
    items: [
      { href: '/merchant/wallets', label: 'Wallets', icon: Wallet },
      { href: '/merchant/settlements', label: 'Settlements', icon: Banknote },
      { href: '/merchant/payouts', label: 'Payouts', icon: Send },
      { href: '/merchant/escrow', label: 'Escrow', icon: Shield },
      { href: '/merchant/exchange-rates', label: 'Exchange Rates', icon: TrendingUp }
    ]
  },
  {
    label: 'DEVELOPERS',
    items: [
      { href: '/merchant/developers', label: 'Developers', icon: Code2 },
      { href: '/merchant/reports', label: 'Reports', icon: FileBarChart }
    ]
  },
  {
    label: 'ACCOUNT',
    items: [{ href: '/merchant/settings', label: 'Settings', icon: Settings }]
  }
]

function isActive(pathname: string, href: string) {
  if (href === '/merchant') return pathname === '/merchant'
  return pathname === href || pathname.startsWith(`${href}/`)
}

function isPaymentsGroupActive(pathname: string) {
  return (
    isActive(pathname, '/merchant/payments') ||
    paymentsChildren.some((c) => isActive(pathname, c.href))
  )
}

function NavItemRow({
  item,
  pathname,
  onNavigate,
  expanded,
  onToggle
}: {
  item: NavItem
  pathname: string
  onNavigate?: () => void
  expanded?: boolean
  onToggle?: () => void
}) {
  const Icon = item.icon
  const hasChildren = Boolean(item.children?.length)
  const active =
    hasChildren && item.href === '/merchant/payments'
      ? isPaymentsGroupActive(pathname)
      : isActive(pathname, item.href)

  if (hasChildren) {
    return (
      <div>
        <div className="flex items-center gap-0.5">
          <Link
            href={item.href}
            onClick={onNavigate}
            className={cn(
              'flex flex-1 min-h-10 items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
              active
                ? 'bg-accent/10 text-accent font-medium'
                : 'text-muted hover:bg-background hover:text-foreground'
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
          <button
            type="button"
            onClick={onToggle}
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-background hover:text-foreground"
            aria-label={expanded ? 'Collapse submenu' : 'Expand submenu'}
            aria-expanded={expanded}
          >
            <ChevronDown
              className={cn('h-4 w-4 transition-transform', expanded && 'rotate-180')}
            />
          </button>
        </div>
        {expanded ? (
          <div className="ml-4 mt-0.5 space-y-0.5 border-l border-border pl-2">
            {item.children!.map((child) => {
              const ChildIcon = child.icon
              const childActive = isActive(pathname, child.href)
              return (
                <Link
                  key={child.href}
                  href={child.href}
                  onClick={onNavigate}
                  className={cn(
                    'flex min-h-9 items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors',
                    childActive
                      ? 'bg-accent/10 text-accent font-medium'
                      : 'text-muted hover:bg-background hover:text-foreground'
                  )}
                >
                  <ChildIcon className="h-3.5 w-3.5 shrink-0" />
                  {child.label}
                </Link>
              )
            })}
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        'flex min-h-10 items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
        active
          ? 'bg-accent/10 text-accent font-medium'
          : 'text-muted hover:bg-background hover:text-foreground'
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {item.label}
    </Link>
  )
}

function NavLinks({
  pathname,
  onNavigate
}: {
  pathname: string
  onNavigate?: () => void
}) {
  const [paymentsOpen, setPaymentsOpen] = useState(isPaymentsGroupActive(pathname))

  useEffect(() => {
    if (isPaymentsGroupActive(pathname)) setPaymentsOpen(true)
  }, [pathname])

  return (
    <>
      {navGroups.map((group) => (
        <div key={group.label} className="mb-4 last:mb-0">
          <p className="px-3 mb-1.5 text-[10px] font-semibold tracking-wider text-muted uppercase">
            {group.label}
          </p>
          <div className="space-y-0.5">
            {group.items.map((item) => (
              <NavItemRow
                key={item.href}
                item={item}
                pathname={pathname}
                onNavigate={onNavigate}
                expanded={item.children ? paymentsOpen : undefined}
                onToggle={item.children ? () => setPaymentsOpen((o) => !o) : undefined}
              />
            ))}
          </div>
        </div>
      ))}
    </>
  )
}

export function MerchantShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [orgName, setOrgName] = useState<string | null>(null)
  const [orgLoading, setOrgLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    async function loadOrgName() {
      const name = await getMerchantOrgName(supabase)
      setOrgName(name)
      setOrgLoading(false)
    }

    void loadOrgName()

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(() => {
      void loadOrgName()
    })

    return () => subscription.unsubscribe()
  }, [])

  const orgLabel = orgLoading ? null : orgName

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <header className="md:hidden sticky top-0 z-50 border-b border-border bg-surface safe-top container-pad h-14 flex items-center justify-between">
        <NexusPayLogo href="/merchant" size="sm" wordmarkClassName="text-lg text-accent" />
        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center rounded-lg border border-border"
          onClick={() => setOpen(!open)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      {open ? (
        <div className="md:hidden border-b border-border bg-surface container-pad py-3 max-h-[calc(100dvh-3.5rem)] overflow-y-auto">
          {orgLabel ? (
            <p className="px-3 mb-2 text-sm font-medium text-foreground truncate" title={orgLabel}>
              {orgLabel}
            </p>
          ) : null}
          <NavLinks pathname={pathname} onNavigate={() => setOpen(false)} />
        </div>
      ) : null}

      <aside className="hidden md:flex md:w-60 lg:w-64 shrink-0 flex-col border-r border-border bg-surface/90 backdrop-blur-md">
        <div className="p-5 border-b border-border">
          <NexusPayLogo href="/" size="md" wordmarkClassName="text-xl text-accent" />
          {orgLabel ? (
            <p
              className="text-sm font-medium text-foreground mt-2 truncate"
              title={orgLabel}
            >
              {orgLabel}
            </p>
          ) : orgLoading ? (
            <p className="text-xs text-muted mt-2">Loading…</p>
          ) : null}
        </div>
        <nav className="flex-1 p-4 overflow-y-auto">
          <NavLinks pathname={pathname} />
        </nav>
      </aside>

      <main className="flex-1 min-w-0">
        <div className="mx-auto max-w-7xl container-pad py-6 sm:py-8">{children}</div>
      </main>
    </div>
  )
}
