export const DEV_CREDENTIALS = {
  email: 'test@gmail.com',
  password: 'admin'
} as const

export const DEV_USER = {
  id: '00000000-0000-0000-0000-000000000001',
  email: DEV_CREDENTIALS.email,
  phone: '+254700000000',
  role: 'seller' as const,
  businessName: 'Nexus Wholesale Ltd'
}

const STORAGE_KEY = 'nexuspay_dev_session'

export function isDevAuthEnabled() {
  return process.env.NODE_ENV === 'development'
}

export function tryDevSignIn(email: string, password: string): boolean {
  if (!isDevAuthEnabled() || typeof window === 'undefined') return false
  const normalized = email.trim().toLowerCase()
  if (
    normalized === DEV_CREDENTIALS.email &&
    password === DEV_CREDENTIALS.password
  ) {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ user: DEV_USER, signedInAt: Date.now() })
    )
    return true
  }
  return false
}

export function getDevUser() {
  if (!isDevAuthEnabled() || typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const session = JSON.parse(raw) as { user: typeof DEV_USER }
    return session.user ?? null
  } catch {
    return null
  }
}

export function signOutDev() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
}

export function isDevSignedIn() {
  return !!getDevUser()
}
