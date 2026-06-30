import type { FastifyInstance } from 'fastify'
import {
  registerMerchantSchema,
  gatewayCheckoutSchema,
  createPayoutSchema,
  createRefundSchema,
  escrowCreateSchema,
  escrowReleaseSchema,
  escrowRefundSchema,
  settlementInitiateSchema,
  fxConvertSchema
} from '@nexuspay/shared'
import { parseStkCallback, type StkCallbackBody } from '@nexuspay/mpesa'
import type { AppConfig } from '../config.js'
import { createSupabase } from '../db.js'
import { MerchantService } from '../modules/merchants/service.js'
import { CheckoutEngine } from '../modules/checkout/service.js'
import { PayoutEngine } from '../modules/payouts/service.js'
import { RefundEngine } from '../modules/refunds/service.js'
import { EscrowEngine } from '../modules/escrow/service.js'
import { SettlementEngine } from '../modules/settlement/service.js'
import { FxEngine } from '../modules/fx/service.js'
import { PaymentLinkService } from '../modules/payment-links/service.js'
import { OrderService } from '../orders.js'

export async function registerGatewayRoutes(app: FastifyInstance, config: AppConfig) {
  const db = createSupabase(config)
  const merchants = new MerchantService(db)
  const checkout = new CheckoutEngine(db, config, app.log)
  const payouts = new PayoutEngine(db, config, app.log)
  const refunds = new RefundEngine(db, config, app.log)
  const escrow = new EscrowEngine(db)
  const settlement = new SettlementEngine(db, config, app.log)
  const fx = new FxEngine(db, config)
  const paymentLinks = new PaymentLinkService(db, config, app.log)
  const orderService = new OrderService(config, app.log)

  app.post('/merchants/register', async (request, reply) => {
    const parsed = registerMerchantSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() })
    try {
      const result = await merchants.register(parsed.data)
      return result
    } catch (err) {
      return reply.code(400).send({ error: err instanceof Error ? err.message : 'Failed' })
    }
  })

  app.get('/merchants/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const merchant = await merchants.getById(id)
    if (!merchant) return reply.code(404).send({ error: 'Not found' })
    return merchant
  })

  app.post('/merchants/:id/api-key/regenerate', async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      const apiKey = await merchants.regenerateApiKey(id)
      return { apiKey }
    } catch (err) {
      return reply.code(400).send({ error: err instanceof Error ? err.message : 'Failed' })
    }
  })

  app.post('/checkout', async (request, reply) => {
    const parsed = gatewayCheckoutSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() })
    try {
      const result = await checkout.checkout(parsed.data)
      return result
    } catch (err) {
      return reply.code(400).send({ error: err instanceof Error ? err.message : 'Checkout failed' })
    }
  })

  app.get('/gateway/payments/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { data } = await db.from('payments').select('*').eq('id', id).maybeSingle()
    if (!data) return reply.code(404).send({ error: 'Not found' })
    return data
  })

  app.get('/gateway/payments/reference/:ref', async (request, reply) => {
    const { ref } = request.params as { ref: string }
    const { data } = await db.from('payments').select('*').eq('checkout_reference', ref).maybeSingle()
    if (!data) return reply.code(404).send({ error: 'Not found' })
    return data
  })

  app.post('/providers/mpesa/callback', async (request, reply) => {
    const body = request.body as StkCallbackBody
    const parsed = parseStkCallback(body)

    app.log.info(
      {
        checkoutRequestId: parsed.checkoutRequestId,
        resultCode: parsed.resultCode,
        resultDesc: parsed.resultDesc,
        receipt: parsed.mpesaReceiptNumber ? '[redacted]' : undefined
      },
      'M-Pesa STK callback received'
    )

    try {
      const { data: attempt } = await db
        .from('payment_attempts')
        .select('payment_id')
        .eq('provider_reference', parsed.checkoutRequestId)
        .maybeSingle()

      await db.from('mpesa_callbacks').insert({
        callback_type: 'stk',
        gateway_payment_id: attempt?.payment_id ?? null,
        checkout_request_id: parsed.checkoutRequestId,
        merchant_request_id: parsed.merchantRequestId,
        result_code: parsed.resultCode,
        result_desc: parsed.resultDesc,
        mpesa_receipt_number: parsed.mpesaReceiptNumber ?? null,
        raw_payload: body
      })

      if (attempt?.payment_id) {
        const mpesa = checkout.getProviderRegistry().get('mpesa')
        const verified = await mpesa.verifyPayment({
          paymentId: attempt.payment_id,
          providerReference: parsed.checkoutRequestId,
          rawPayload: request.body
        })
        const payment = await checkout.completePayment(attempt.payment_id, verified)
        await paymentLinks.syncPaymentStatus(payment.id, payment.status)
        await orderService.syncGatewayPayment(payment.id, payment.status)
        return { ResultCode: 0, ResultDesc: 'Accepted', paymentId: payment.id }
      }

      return { ResultCode: 0, ResultDesc: 'Accepted' }
    } catch (err) {
      app.log.error(err)
      return { ResultCode: 1, ResultDesc: 'Rejected' }
    }
  })

  app.post('/payouts', async (request, reply) => {
    const parsed = createPayoutSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() })
    try {
      return await payouts.createPayout(parsed.data)
    } catch (err) {
      return reply.code(400).send({ error: err instanceof Error ? err.message : 'Payout failed' })
    }
  })

  app.post('/refunds', async (request, reply) => {
    const parsed = createRefundSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() })
    try {
      return await refunds.createRefund(parsed.data)
    } catch (err) {
      return reply.code(400).send({ error: err instanceof Error ? err.message : 'Refund failed' })
    }
  })

  app.post('/escrow/create', async (request, reply) => {
    const parsed = escrowCreateSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() })
    try {
      return await escrow.createFromPayment(parsed.data.paymentId)
    } catch (err) {
      return reply.code(400).send({ error: err instanceof Error ? err.message : 'Failed' })
    }
  })

  app.post('/escrow/release', async (request, reply) => {
    const parsed = escrowReleaseSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() })
    try {
      return await escrow.release(parsed.data.escrowId)
    } catch (err) {
      return reply.code(400).send({ error: err instanceof Error ? err.message : 'Failed' })
    }
  })

  app.post('/escrow/refund', async (request, reply) => {
    const parsed = escrowRefundSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() })
    try {
      return await escrow.refund(parsed.data.escrowId, parsed.data.reason)
    } catch (err) {
      return reply.code(400).send({ error: err instanceof Error ? err.message : 'Failed' })
    }
  })

  app.post('/settlements/initiate', async (request, reply) => {
    const parsed = settlementInitiateSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() })
    try {
      return await settlement.initiateSettlement(
        parsed.data.merchantId,
        parsed.data.currency,
        parsed.data.destinationCurrency
      )
    } catch (err) {
      return reply.code(400).send({ error: err instanceof Error ? err.message : 'Failed' })
    }
  })

  app.get('/currencies', async (_request, reply) => {
    try {
      return await fx.listCurrencies()
    } catch (err) {
      return reply.code(500).send({ error: err instanceof Error ? err.message : 'Failed' })
    }
  })

  app.get('/rates', async (request, reply) => {
    const base = (request.query as { base?: string }).base ?? 'KES'
    try {
      return await fx.getRates(base)
    } catch (err) {
      return reply.code(500).send({ error: err instanceof Error ? err.message : 'Failed' })
    }
  })

  app.post('/convert', async (request, reply) => {
    const parsed = fxConvertSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() })
    try {
      return await fx.convert(parsed.data)
    } catch (err) {
      return reply.code(400).send({ error: err instanceof Error ? err.message : 'Failed' })
    }
  })
}
