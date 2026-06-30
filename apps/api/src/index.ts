import { randomUUID } from 'node:crypto'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import { loadConfig } from './config.js'
import { createSupabase } from './db.js'
import { registerRoutes } from './routes.js'
import { PaymentService, WebhookService } from './services.js'
import { MpesaWatcher } from './modules/mpesa/watcher.js'

async function startTimeoutWatcher(config: ReturnType<typeof loadConfig>) {
  const paymentService = new PaymentService(
    config,
    console as unknown as import('fastify').FastifyBaseLogger
  )
  const webhookService = new WebhookService(
    config,
    console as unknown as import('fastify').FastifyBaseLogger
  )

  setInterval(async () => {
    try {
      const stale = await paymentService.payments.findStaleAwaitingMpesa(
        config.STK_TIMEOUT_MS
      )
      for (const payment of stale) {
        if (!payment.outgoing_payment_id) continue
        await webhookService.rafiki.cancelOutgoingPayment(
          payment.outgoing_payment_id,
          'M-Pesa STK Push timed out.'
        )
        await paymentService.payments.update(payment.id, { status: 'failed' })
      }
    } catch (err) {
      console.error('STK timeout watcher error', err)
    }
  }, 30_000)
}

async function main() {
  const config = loadConfig()
  const app = Fastify({
    logger: {
      level: config.LOG_LEVEL,
      transport:
        config.NODE_ENV === 'development'
          ? { target: 'pino-pretty' }
          : undefined
    },
    genReqId: () => randomUUID()
  })

  await app.register(cors, { origin: true })
  await app.register(rateLimit, {
    max: 120,
    timeWindow: '1 minute'
  })

  await registerRoutes(app, config)
  await startTimeoutWatcher(config)

  const mpesaWatcher = new MpesaWatcher(createSupabase(config), config, app.log)
  mpesaWatcher.start()

  await app.listen({ port: config.PORT, host: '0.0.0.0' })
  app.log.info(`NexusPay API listening on ${config.PORT}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
