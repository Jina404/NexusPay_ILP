import { Suspense } from 'react'
import LoginPage from './login-page'

export default function Page() {
  return (
    <Suspense fallback={<p className="p-8 text-muted">Loading…</p>}>
      <LoginPage />
    </Suspense>
  )
}
