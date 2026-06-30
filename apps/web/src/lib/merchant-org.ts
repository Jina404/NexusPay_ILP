import type { SupabaseClient } from '@supabase/supabase-js'

/** Business name from signup ("Business name" field) or linked merchant record. */
export async function getMerchantOrgName(
  supabase: SupabaseClient
): Promise<string | null> {
  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (!user) return null

  const metaName = user.user_metadata?.business_name
  if (typeof metaName === 'string' && metaName.trim()) {
    return metaName.trim()
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('business_name')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.business_name?.trim()) {
    return profile.business_name.trim()
  }

  return null
}
