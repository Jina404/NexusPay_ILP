import type { FastifyRequest } from 'fastify'
import type { MerchantService } from '../modules/merchants/service.js'

export function extractApiKey(request: FastifyRequest): string | null {
  const header = request.headers.authorization
  if (header?.startsWith('Bearer ')) return header.slice(7)
  const custom = request.headers['x-nexuspay-api-key']
  if (typeof custom === 'string') return custom
  return null
}

export async function requireMerchant(
  request: FastifyRequest,
  reply: { code: (n: number) => { send: (b: unknown) => unknown } },
  merchants: MerchantService
): Promise<boolean> {
  const apiKey = extractApiKey(request)
  if (!apiKey) {
    reply.code(401).send({ error: 'API key required' })
    return false
  }
  const auth = await merchants.authenticateApiKey(apiKey)
  if (!auth) {
    reply.code(401).send({ error: 'Invalid API key' })
    return false
  }
  request.merchantId = auth.merchantId
  return true
}
