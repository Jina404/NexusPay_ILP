export function getBrandLogoUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_BRAND_LOGO_URL?.trim()
  if (fromEnv) return fromEnv

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '')
  if (supabaseUrl && !supabaseUrl.includes('your-project')) {
    return `${supabaseUrl}/storage/v1/object/public/brand-assets/logo/logo.png`
  }

  return '/logo.png'
}
