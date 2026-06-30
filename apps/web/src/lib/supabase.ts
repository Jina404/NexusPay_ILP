import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

let browserClient: SupabaseClient | undefined

export function createClient() {
  if (browserClient) return browserClient

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://localhost:54321'
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'public-anon-key-placeholder'

  browserClient = createBrowserClient(url, key)
  return browserClient
}

export function getApiUrl() {
  return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'
}
