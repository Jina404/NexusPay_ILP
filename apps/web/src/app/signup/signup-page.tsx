'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient, getApiUrl } from '@/lib/supabase'
import { isSupabaseConfigured, SUPABASE_SETUP_HINT } from '@/lib/supabase-config'
import { Button } from '@/components/ui/button'
import { Input, Label, Select } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { COUNTRIES, type CountryCode } from '@/lib/utils'
import { NexusPayLogo } from '@/components/nexuspay-logo'

const MERCHANT_ROLE = 'seller' as const

export default function SignupPage() {
  const router = useRouter()
  const [country, setCountry] = useState<CountryCode>('KE')
  const [businessName, setBusinessName] = useState('')
  const [regNumber, setRegNumber] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()
  const configured = isSupabaseConfigured()

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    if (!configured) {
      setError(SUPABASE_SETUP_HINT)
      setLoading(false)
      return
    }

    const selected = COUNTRIES.find((c) => c.code === country)
    if (!selected?.live) {
      setError('Only Kenya is live at launch. Other markets coming soon.')
      setLoading(false)
      return
    }

    const { data, error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/merchant`,
        data: {
          role: MERCHANT_ROLE,
          country,
          phone,
          business_name: businessName,
          business_registration_number: regNumber
        }
      }
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    if (!data.user) {
      setError('Signup failed. Please try again.')
      setLoading(false)
      return
    }

    await supabase.from('profiles').upsert({
      id: data.user.id,
      role: MERCHANT_ROLE,
      country,
      phone,
      business_name: businessName,
      business_registration_number: regNumber
    })

    if (!data.session) {
      setSuccess('Account created. Check your email to confirm your address, then sign in.')
      setLoading(false)
      return
    }

    try {
      const walletPath = `accounts/${data.user.id.slice(0, 8)}`
      await fetch(`${getApiUrl()}/accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: data.user.id,
          role: MERCHANT_ROLE,
          country,
          phone,
          businessName,
          businessRegistrationNumber: regNumber,
          walletPath
        })
      })
    } catch {
      /* wallet provisioning is optional during onboarding */
    }

    if (data.session?.access_token) {
      try {
        await fetch(`${getApiUrl()}/merchants/me/bootstrap`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${data.session.access_token}`,
            'Content-Type': 'application/json'
          }
        })
      } catch {
        /* merchant bootstrap runs again on dashboard load */
      }
    }

    router.refresh()
    router.push('/merchant')
  }

  return (
    <div className="min-h-screen min-h-[100dvh] flex items-center justify-center container-pad py-6 sm:py-8">
      <Card className="w-full max-w-sm">
        <CardHeader className="p-4 pb-2 gap-0.5">
          <NexusPayLogo href="/" size="sm" wordmarkClassName="text-lg text-accent" />
          <CardTitle className="mt-2 text-base">Create account</CardTitle>
          <p className="text-xs text-muted">Start accepting payments with NexusPay</p>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {!configured ? (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2 mb-3 leading-snug">
              {SUPABASE_SETUP_HINT}
            </p>
          ) : null}
          <form onSubmit={onSubmit} className="space-y-3">
            <div>
              <Label className="text-xs">Country</Label>
              <Select
                className="mt-1 h-9"
                value={country}
                onChange={(e) => setCountry(e.target.value as CountryCode)}
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code} disabled={!c.live}>
                    {c.name} {!c.live ? '(Soon)' : ''}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label className="text-xs">Business name</Label>
              <Input
                className="mt-1 h-9"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                required
              />
            </div>
            <div>
              <Label className="text-xs">Registration number</Label>
              <Input className="mt-1 h-9" value={regNumber} onChange={(e) => setRegNumber(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Phone</Label>
              <Input
                className="mt-1 h-9"
                placeholder="2547XXXXXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>
            <div>
              <Label className="text-xs">Email</Label>
              <Input
                className="mt-1 h-9"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <Label className="text-xs">Password</Label>
              <Input
                className="mt-1 h-9"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>

            {error ? <p className="text-xs text-red-600">{error}</p> : null}
            {success ? <p className="text-xs text-accent">{success}</p> : null}
            <Button type="submit" className="w-full h-9 text-sm" disabled={loading || !configured}>
              {loading ? 'Creating account…' : 'Create account'}
            </Button>
          </form>
          <p className="text-xs text-muted text-center mt-4">
            Already have an account?{' '}
            <Link href="/login" className="text-accent font-medium">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
