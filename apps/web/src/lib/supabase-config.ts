export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
  return (
    url.length > 0 &&
    key.length > 0 &&
    !url.includes('your-project') &&
    key !== 'your-anon-key' &&
    key !== 'public-anon-key-placeholder'
  )
}

export const SUPABASE_SETUP_HINT =
  'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in apps/web/.env.local (from your Supabase project → Settings → API).'
