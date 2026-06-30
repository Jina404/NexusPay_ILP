import { Suspense } from 'react'
import SignupPage from './signup-page'

export default function Page() {
  return (
    <Suspense fallback={<p className="p-8 text-muted">Loading…</p>}>
      <SignupPage />
    </Suspense>
  )
}
