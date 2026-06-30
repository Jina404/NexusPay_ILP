import type { SupabaseClient, User } from '@supabase/supabase-js'
import { getDevUser } from '@/lib/dev-auth'

export async function getAuthUser(supabase: SupabaseClient): Promise<User | null> {
  const devUser = getDevUser()
  if (devUser) {
    return {
      id: devUser.id,
      email: devUser.email,
      app_metadata: {},
      user_metadata: {
        role: devUser.role,
        business_name: devUser.businessName
      },
      aud: 'authenticated',
      created_at: new Date().toISOString()
    } as User
  }

  const { data } = await supabase.auth.getUser()
  return data.user
}
