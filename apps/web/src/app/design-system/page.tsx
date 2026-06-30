import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input, Label } from '@/components/ui/input'
import { CountryBadge } from '@/components/country-badge'
import { StatCard } from '@/components/stat-card'
import { PageHeader } from '@/components/page-header'
import { EmptyState } from '@/components/empty-state'
import { notFound } from 'next/navigation'

export default function DesignSystemPage() {
  if (process.env.NODE_ENV === 'production') notFound()

  return (
    <div className="min-h-screen bg-background p-8 space-y-12 max-w-5xl mx-auto">
      <PageHeader
        title="NexusPay Design System"
        description="Fintech payment gateway tokens and components (dev only)"
      />

      <section className="space-y-4">
        <h2 className="font-display text-xl font-semibold">Buttons & badges</h2>
        <div className="flex flex-wrap gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="warm">Warm accent</Button>
          <Badge>Default</Badge>
          <Badge variant="warm">Warm</Badge>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-xl font-semibold">Countries</h2>
        <div className="flex flex-wrap gap-4">
          <CountryBadge code="KE" showName />
          <CountryBadge code="UG" showName />
          <CountryBadge code="TZ" showName />
        </div>
      </section>

      <section className="grid sm:grid-cols-3 gap-4">
        <StatCard label="Volume" value="Ksh 1.2M" hint="+12% this month" />
        <StatCard label="Transactions" value="124" />
        <StatCard label="Settlements" value="Ksh 340K" />
      </section>

      <section className="grid sm:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Merchant form</CardTitle>
          </CardHeader>
          <CardContent>
            <Label>Business name</Label>
            <Input placeholder="Your company Ltd" className="mt-1.5" />
          </CardContent>
        </Card>
        <EmptyState
          title="No transactions yet"
          description="Create a checkout session to start accepting payments."
          actionLabel="Go to dashboard"
        />
      </section>
    </div>
  )
}
