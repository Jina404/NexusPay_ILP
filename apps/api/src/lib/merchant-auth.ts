import type { FastifyRequest } from 'fastify'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { MerchantService } from '../modules/merchants/service.js'
import { API_KEY_PREFIX } from '../modules/merchants/service.js'

declare module 'fastify' {
  interface FastifyRequest {
    merchantId?: string
    userId?: string
  }
}

export function extractBearerToken(request: FastifyRequest): string | null {
  const header = request.headers.authorization
  if (header?.startsWith('Bearer ')) return header.slice(7).trim()
  const custom = request.headers['x-nexuspay-api-key']
  if (typeof custom === 'string') return custom.trim()
  return null
}

/** @deprecated Use extractBearerToken */
export function extractApiKey(request: FastifyRequest): string | null {
  return extractBearerToken(request)
}

export async function requireUser(
  request: FastifyRequest,
  reply: { code: (n: number) => { send: (b: unknown) => unknown } },
  supabase: SupabaseClient
): Promise<{ id: string; email?: string } | null> {
  const token = extractBearerToken(request)
  if (!token || token.startsWith(API_KEY_PREFIX)) {
    reply.code(401).send({ error: 'Session required' })
    return null
  }

  const {
    data: { user },
    error
  } = await supabase.auth.getUser(token)
  if (error || !user) {
    reply.code(401).send({ error: 'Invalid session' })
    return null
  }

  request.userId = user.id
  return { id: user.id, email: user.email }
}

export async function requireMerchant(
  request: FastifyRequest,
  reply: { code: (n: number) => { send: (b: unknown) => unknown } },
  merchants: MerchantService,
  supabase: SupabaseClient
): Promise<boolean> {
  const token = extractBearerToken(request)
  if (!token) {
    reply.code(401).send({ error: 'Authentication required' })
    return false
  }

  if (token.startsWith(API_KEY_PREFIX)) {
    const auth = await merchants.authenticateApiKey(token)
    if (!auth) {
      reply.code(401).send({ error: 'Invalid API key' })
      return false
    }
    request.merchantId = auth.merchantId
    return true
  }

  const {
    data: { user },
    error
  } = await supabase.auth.getUser(token)
  if (error || !user) {
    reply.code(401).send({ error: 'Invalid session' })
    return false
  }

  const merchant = await merchants.getByUserId(user.id)
  if (!merchant) {
    reply.code(403).send({ error: 'No merchant account linked to this user' })
    return false
  }

  request.merchantId = merchant.id
  request.userId = user.id
  return true
}
