import type { FastifyInstance } from 'fastify'
import {
  createPaymentLinkSchema,
  updatePaymentLinkSchema,
  paymentLinkCheckoutSchema
} from '@nexuspay/shared'
import type { AppConfig } from '../config.js'
import { createSupabase } from '../db.js'
import { requireMerchant } from '../lib/merchant-auth.js'
import { MerchantService } from '../modules/merchants/service.js'
import { PaymentLinkService } from '../modules/payment-links/service.js'

export async function registerPaymentLinkRoutes(
  app: FastifyInstance,
  config: AppConfig
) {
  const db = createSupabase(config)
  const merchants = new MerchantService(db)
  const paymentLinks = new PaymentLinkService(db, config, app.log)

  app.post('/payment-links', async (request, reply) => {
    if (!(await requireMerchant(request, reply, merchants, db))) return
    const parsed = createPaymentLinkSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() })
    try {
      const result = await paymentLinks.create(request.merchantId!, parsed.data)
      return {
        id: result.id,
        publicId: result.publicId,
        paymentUrl: result.paymentUrl
      }
    } catch (err) {
      return reply.code(400).send({ error: err instanceof Error ? err.message : 'Failed' })
    }
  })

  app.get('/payment-links', async (request, reply) => {
    if (!(await requireMerchant(request, reply, merchants, db))) return
    try {
      return await paymentLinks.list(request.merchantId!)
    } catch (err) {
      return reply.code(500).send({ error: err instanceof Error ? err.message : 'Failed' })
    }
  })

  app.get('/payment-links/stats', async (request, reply) => {
    if (!(await requireMerchant(request, reply, merchants, db))) return
    const range = (request.query as { range?: string }).range
    const rangeDays = range === '30d' ? 30 : 7
    try {
      return await paymentLinks.getStats(request.merchantId!, rangeDays)
    } catch (err) {
      return reply.code(500).send({ error: err instanceof Error ? err.message : 'Failed' })
    }
  })

  app.get('/payment-links/:id', async (request, reply) => {
    if (!(await requireMerchant(request, reply, merchants, db))) return
    const { id } = request.params as { id: string }
    try {
      const link = await paymentLinks.getById(request.merchantId!, id)
      if (!link) return reply.code(404).send({ error: 'Not found' })
      return link
    } catch (err) {
      return reply.code(500).send({ error: err instanceof Error ? err.message : 'Failed' })
    }
  })

  app.patch('/payment-links/:id', async (request, reply) => {
    if (!(await requireMerchant(request, reply, merchants, db))) return
    const { id } = request.params as { id: string }
    const parsed = updatePaymentLinkSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() })
    try {
      return await paymentLinks.update(request.merchantId!, id, parsed.data)
    } catch (err) {
      return reply.code(400).send({ error: err instanceof Error ? err.message : 'Failed' })
    }
  })

  app.post('/payment-links/:id/disable', async (request, reply) => {
    if (!(await requireMerchant(request, reply, merchants, db))) return
    const { id } = request.params as { id: string }
    try {
      return await paymentLinks.disable(request.merchantId!, id)
    } catch (err) {
      return reply.code(400).send({ error: err instanceof Error ? err.message : 'Failed' })
    }
  })

  app.get('/payment-links/:id/payments', async (request, reply) => {
    if (!(await requireMerchant(request, reply, merchants, db))) return
    const { id } = request.params as { id: string }
    try {
      return await paymentLinks.listPayments(request.merchantId!, id)
    } catch (err) {
      return reply.code(400).send({ error: err instanceof Error ? err.message : 'Failed' })
    }
  })

  app.get('/pay/:publicId', async (request, reply) => {
    const { publicId } = request.params as { publicId: string }
    try {
      const data = await paymentLinks.getByPublicId(publicId)
      if (!data) return reply.code(404).send({ error: 'Payment link not found' })
      if (data.link.status !== 'active') {
        return reply.code(403).send({ error: `Payment link is ${data.link.status}` })
      }
      return data
    } catch (err) {
      return reply.code(500).send({ error: err instanceof Error ? err.message : 'Failed' })
    }
  })

  app.post('/pay/:publicId/checkout', async (request, reply) => {
    const { publicId } = request.params as { publicId: string }
    const parsed = paymentLinkCheckoutSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() })
    try {
      return await paymentLinks.checkout(publicId, parsed.data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Checkout failed'
      const code = message.includes('disabled') || message.includes('expired') ? 403 : 400
      return reply.code(code).send({ error: message })
    }
  })
}
