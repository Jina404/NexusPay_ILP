'use client'

import { useState } from 'react'
import { PageHeader } from '@/components/page-header'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const sections = [
  { id: 'profile', label: 'Business profile' },
  { id: 'team', label: 'Team members' },
  { id: 'roles', label: 'Roles & permissions' },
  { id: 'settlement', label: 'Settlement preferences' },
  { id: 'security', label: 'Security' },
  { id: 'notifications', label: 'Notifications' }
] as const

export default function MerchantSettingsPage() {
  const [section, setSection] = useState<string>('profile')
  const [businessName, setBusinessName] = useState('NexusPay Demo Merchant')
  const [email, setEmail] = useState('merchant@example.com')
  const [settlementCurrency, setSettlementCurrency] = useState('KES')
  const [twoFactor, setTwoFactor] = useState(false)
  const [emailAlerts, setEmailAlerts] = useState(true)

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Business profile, team, settlement preferences, and security."
      />

      <div className="flex flex-col lg:flex-row gap-8">
        <nav className="lg:w-48 shrink-0 space-y-1">
          {sections.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSection(s.id)}
              className={cn(
                'w-full text-left px-3 py-2 rounded-md text-sm transition-colors',
                section === s.id
                  ? 'bg-accent/10 text-accent font-medium'
                  : 'text-muted hover:text-foreground hover:bg-background'
              )}
            >
              {s.label}
            </button>
          ))}
        </nav>

        <div className="flex-1 rounded-lg border border-border bg-surface p-6">
          {section === 'profile' ? (
            <div className="space-y-4 max-w-md">
              <h3 className="font-display font-semibold text-lg">Business profile</h3>
              <div>
                <label className="text-sm text-muted block mb-1">Business name</label>
                <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
              </div>
              <div>
                <label className="text-sm text-muted block mb-1">Email</label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <Button>Save changes</Button>
            </div>
          ) : null}

          {section === 'team' ? (
            <div>
              <h3 className="font-display font-semibold text-lg mb-4">Team members</h3>
              <p className="text-sm text-muted mb-4">Invite team members to manage your merchant account.</p>
              <Button variant="outline" disabled>Invite member</Button>
            </div>
          ) : null}

          {section === 'roles' ? (
            <div>
              <h3 className="font-display font-semibold text-lg mb-4">Roles & permissions</h3>
              <ul className="text-sm space-y-2 text-muted">
                <li><strong className="text-foreground">Owner</strong> — Full access</li>
                <li><strong className="text-foreground">Admin</strong> — Payments, payouts, settings</li>
                <li><strong className="text-foreground">Viewer</strong> — Read-only dashboard access</li>
              </ul>
            </div>
          ) : null}

          {section === 'settlement' ? (
            <div className="space-y-4 max-w-md">
              <h3 className="font-display font-semibold text-lg">Settlement preferences</h3>
              <div>
                <label className="text-sm text-muted block mb-1">Default settlement currency</label>
                <select
                  value={settlementCurrency}
                  onChange={(e) => setSettlementCurrency(e.target.value)}
                  className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm"
                >
                  <option value="KES">KES</option>
                  <option value="UGX">UGX</option>
                  <option value="USD">USD</option>
                  <option value="SSP">SSP</option>
                </select>
              </div>
              <Button>Save preferences</Button>
            </div>
          ) : null}

          {section === 'security' ? (
            <div className="space-y-4 max-w-md">
              <h3 className="font-display font-semibold text-lg">Security</h3>
              <label className="flex items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={twoFactor}
                  onChange={(e) => setTwoFactor(e.target.checked)}
                  className="rounded border-border"
                />
                Enable two-factor authentication
              </label>
              <Button variant="outline">Change password</Button>
            </div>
          ) : null}

          {section === 'notifications' ? (
            <div className="space-y-4 max-w-md">
              <h3 className="font-display font-semibold text-lg">Notifications</h3>
              <label className="flex items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={emailAlerts}
                  onChange={(e) => setEmailAlerts(e.target.checked)}
                  className="rounded border-border"
                />
                Email alerts for payments and settlements
              </label>
              <Button>Save preferences</Button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
