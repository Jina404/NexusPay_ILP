'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient, getApiUrl } from '@/lib/supabase'
import { tryDevSignIn, isDevAuthEnabled, DEV_CREDENTIALS } from '@/lib/dev-auth'
import { isSupabaseConfigured, SUPABASE_SETUP_HINT } from '@/lib/supabase-config'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { NexusPayLogo } from '@/components/nexuspay-logo'

export default function LoginPage() {
  const searchParams = useSearchParams()
  const [email, setEmail] = useState(isDevAuthEnabled() ? DEV_CREDENTIALS.email : '')
  const [password, setPassword] = useState(isDevAuthEnabled() ? DEV_CREDENTIALS.password : '')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const configured = isSupabaseConfigured()

  useEffect(() => {
    if (searchParams.get('error') === 'auth_callback_failed') {
      setError('Email confirmation failed. Try signing in or request a new link.')
    }
  }, [searchParams])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (tryDevSignIn(email, password)) {
      setLoading(false)
      router.push('/merchant')
      return
    }

    if (!configured) {
      setError(SUPABASE_SETUP_HINT)
      setLoading(false)
      return
    }

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    })
    setLoading(false)
    if (authError) {
      setError(authError.message)
      return
    }

    const {
      data: { session }
    } = await supabase.auth.getSession()
    if (session?.access_token) {
      try {
        await fetch(`${getApiUrl()}/merchants/me/bootstrap`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: '{}'
        })
      } catch {
        /* dashboard bootstrap runs again on /merchant load */
      }
    }

    router.refresh()
    router.push('/merchant')
  }

  return (
    <div className="min-h-screen min-h-[100dvh] flex items-center justify-center container-pad py-8">
      <Card className="w-full max-w-sm">
        <CardHeader className="p-4 pb-2 text-center gap-0.5">
          <NexusPayLogo
            href="/"
            size="sm"
            className="justify-center"
            wordmarkClassName="text-lg text-accent"
          />
          <CardTitle className="mt-2 text-base">Sign in</CardTitle>
          <p className="text-xs text-muted">Use the email and password from your account</p>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {!configured && !isDevAuthEnabled() ? (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2 mb-3 leading-snug">
              {SUPABASE_SETUP_HINT}
            </p>
          ) : null}

          <form onSubmit={onSubmit} className="space-y-3">
            <div>
              <Label className="text-xs">Email</Label>
              <Input
                className="mt-1 h-9"
                type="email"
                autoComplete="email"
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
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error ? <p className="text-xs text-red-600">{error}</p> : null}
            <Button type="submit" className="w-full h-9 text-sm" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <p className="text-xs text-muted text-center mt-4">
            New here?{' '}
            <Link href="/signup" className="text-accent font-medium">
              Create account
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
