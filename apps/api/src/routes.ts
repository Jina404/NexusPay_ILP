import type { FastifyInstance } from 'fastify'
import { checkoutSchema, createAccountSchema, orderCheckoutSchema } from '@nexuspay/shared'
import { parseStkCallback, type StkCallbackBody } from '@nexuspay/mpesa'
import type { AppConfig } from './config.js'
import { verifyWebhookSignature } from './lib/webhook-signature.js'
import { PaymentService, WebhookService } from './services.js'
import { OrderService } from './orders.js'
import { registerGatewayRoutes } from './routes/gateway.js'
import { registerMerchantDashboardRoutes } from './routes/merchant-dashboard.js'
import { registerPaymentLinkRoutes } from './routes/payment-links.js'
import { registerDarajaRoutes } from './routes/daraja.js'
import type { RafikiWebhook } from '@nexuspay/shared'

export async function registerRoutes(
  app: FastifyInstance,
  config: AppConfig
) {
  const webhookService = new WebhookService(config, app.log)
  const paymentService = new PaymentService(config, app.log)
  const orderService = new OrderService(config, app.log)

  await registerGatewayRoutes(app, config)
  await registerMerchantDashboardRoutes(app, config)
  await registerPaymentLinkRoutes(app, config)
  await registerDarajaRoutes(app, config)

  app.get('/health', async () => ({ status: 'ok', product: 'nexuspay-gateway' }))

  app.post('/webhooks', async (request, reply) => {
    const signature = request.headers['rafiki-signature'] as string | undefined
    if (signature) {
      const valid = verifyWebhookSignature(
        signature,
        request.body,
        config.RAFIKI_WEBHOOK_SIGNATURE_VERSION,
        config.RAFIKI_WEBHOOK_SECRET
      )
      if (!valid) {
        return reply.code(401).send({ error: 'Invalid webhook signature' })
      }
    }

    const event = request.body as RafikiWebhook
    await webhookService.handle(event)
    return { received: true }
  })

  app.post('/payments/checkout', async (request, reply) => {
    const parsed = checkoutSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() })
    }
    try {
      const payment = await paymentService.checkout(parsed.data)
      return payment
    } catch (err) {
      app.log.error(err)
      return reply.code(400).send({
        error: err instanceof Error ? err.message : 'Checkout failed'
      })
    }
  })

  app.get('/payments/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const payment = await paymentService.payments.getById(id)
    if (!payment) return reply.code(404).send({ error: 'Not found' })
    return payment
  })

  app.post('/accounts', async (request, reply) => {
    const parsed = createAccountSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() })
    }
    try {
      const account = await paymentService.createAccount({
        userId: parsed.data.userId,
        role: parsed.data.role,
        country: parsed.data.country,
        phone: parsed.data.phone,
        businessName: parsed.data.businessName,
        businessRegistrationNumber: parsed.data.businessRegistrationNumber,
        walletPath: parsed.data.walletPath
      })
      return account
    } catch (err) {
      app.log.error(err)
      return reply.code(400).send({
        error: err instanceof Error ? err.message : 'Account creation failed'
      })
    }
  })

  app.post('/mpesa/callback', async (request, reply) => {
    const parsed = parseStkCallback(request.body as StkCallbackBody)
    try {
      const payment = await paymentService.handleMpesaCallback(parsed)
      if (payment?.id) {
        await orderService.syncPaymentStatus(payment.id, payment.status)
      }
      return { ResultCode: 0, ResultDesc: 'Accepted', paymentId: payment?.id }
    } catch (err) {
      app.log.error(err)
      return { ResultCode: 1, ResultDesc: 'Rejected' }
    }
  })

  app.post('/orders/checkout', async (request, reply) => {
    const parsed = orderCheckoutSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() })
    }
    try {
      const order = await orderService.checkout(parsed.data)
      return order
    } catch (err) {
      app.log.error(err)
      return reply.code(400).send({
        error: err instanceof Error ? err.message : 'Order checkout failed'
      })
    }
  })

  app.get('/orders/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const order = await orderService.getById(id)
    if (!order) return reply.code(404).send({ error: 'Not found' })
    return order
  })

  app.patch('/orders/:id/deliver', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { buyerId } = request.body as { buyerId: string }
    if (!buyerId) return reply.code(400).send({ error: 'buyerId required' })
    try {
      const order = await orderService.confirmDelivery(id, buyerId)
      return order
    } catch (err) {
      return reply.code(400).send({
        error: err instanceof Error ? err.message : 'Failed'
      })
    }
  })

  app.patch('/orders/:id/shipment', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { sellerId, status } = request.body as {
      sellerId: string
      status: 'shipped' | 'delivered'
    }
    if (!sellerId || !status) {
      return reply.code(400).send({ error: 'sellerId and status required' })
    }
    try {
      const order = await orderService.advanceShipment(id, sellerId, status)
      return order
    } catch (err) {
      return reply.code(400).send({
        error: err instanceof Error ? err.message : 'Failed'
      })
    }
  })
}
