import type { SupabaseClient } from '@supabase/supabase-js'

export class AuditService {
  constructor(private readonly db: SupabaseClient) {}

  async log(input: {
    actor: string
    action: string
    entityType?: string
    entityId?: string
    payload?: Record<string, unknown>
    ipAddress?: string
  }): Promise<void> {
    const { error } = await this.db.from('audit_logs').insert({
      actor: input.actor,
      action: input.action,
      entity_type: input.entityType ?? null,
      entity_id: input.entityId ?? null,
      payload: input.payload ?? {},
      ip_address: input.ipAddress ?? null
    })
    if (error) throw error
  }
}
