import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import type { AppConfig } from '../config.js'
import { createSupabase } from '../db.js'
import { requireMerchant } from '../lib/merchant-auth.js'
import { MerchantService } from '../modules/merchants/service.js'
import { MpesaProvider } from '../modules/providers/mpesa-provider.js'
import { InvoiceService } from '../modules/invoices/service.js'

const b2cSchema = z.object({
  phone: z.string().min(9),
  amount: z.number().positive(),
  remarks: z.string().optional()
})

const b2bSchema = z.object({
  receiverShortcode: z.string().min(1),
  amount: z.number().positive(),
  accountReference: z.string().min(1),
  remarks: z.string().optional()
})

const reversalSchema = z.object({
  transactionId: z.string().min(1),
  amount: z.number().positive(),
  receiverParty: z.string().min(1),
  remarks: z.string().optional()
})

const transactionStatusSchema = z.object({
  transactionId: z.string().min(1),
  remarks: z.string().optional()
})

const qrSchema = z.object({
  merchantName: z.string().min(1),
  refNo: z.string().min(1),
  amount: z.number().positive(),
  trxCode: z.enum(['BG', 'PB', 'SM', 'SB']).optional()
})

async function storeCallback(
  db: ReturnType<typeof createSupabase>,
  input: {
    callbackType: string
    gatewayPaymentId?: string
    checkoutRequestId?: string
    merchantRequestId?: string
    resultCode: number
    resultDesc?: string
    mpesaReceipt?: string
    rawPayload: unknown
  }
) {
  await db.from('mpesa_callbacks').insert({
    callback_type: input.callbackType,
    gateway_payment_id: input.gatewayPaymentId ?? null,
    checkout_request_id: input.checkoutRequestId ?? `async-${Date.now()}`,
    merchant_request_id: input.merchantRequestId ?? null,
    result_code: input.resultCode,
    result_desc: input.resultDesc ?? null,
    mpesa_receipt_number: input.mpesaReceipt ?? null,
    raw_payload: input.rawPayload
  })
}

export async function registerDarajaRoutes(app: FastifyInstance, config: AppConfig) {
  const db = createSupabase(config)
  const merchants = new MerchantService(db)
  const mpesa = new MpesaProvider(config, app.log)
  const invoices = new InvoiceService(db, app.log)
  const client = mpesa.getClient()

  app.post('/daraja/b2c', async (request, reply) => {
    if (!(await requireMerchant(request, reply, merchants))) return
    const parsed = b2cSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() })
    try {
      const result = await client.b2cPayment(parsed.data)
      return result
    } catch (err) {
      return reply.code(400).send({ error: err instanceof Error ? err.message : 'B2C failed' })
    }
  })

  app.post('/daraja/b2b', async (request, reply) => {
    if (!(await requireMerchant(request, reply, merchants))) return
    const parsed = b2bSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() })
    try {
      return await client.b2bPayment(parsed.data)
    } catch (err) {
      return reply.code(400).send({ error: err instanceof Error ? err.message : 'B2B failed' })
    }
  })

  app.post('/daraja/reversal', async (request, reply) => {
    if (!(await requireMerchant(request, reply, merchants))) return
    const parsed = reversalSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() })
    try {
      return await client.reversal(parsed.data)
    } catch (err) {
      return reply.code(400).send({ error: err instanceof Error ? err.message : 'Reversal failed' })
    }
  })

  app.post('/daraja/c2b/register', async (request, reply) => {
    if (!(await requireMerchant(request, reply, merchants))) return
    const version = (request.body as { version?: 'v1' | 'v2' }).version ?? 'v2'
    try {
      return await client.c2bRegisterUrl(version)
    } catch (err) {
      return reply.code(400).send({ error: err instanceof Error ? err.message : 'C2B register failed' })
    }
  })

  app.post('/daraja/transaction-status', async (request, reply) => {
    if (!(await requireMerchant(request, reply, merchants))) return
    const parsed = transactionStatusSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() })
    try {
      return await client.transactionStatusQuery(parsed.data)
    } catch (err) {
      return reply.code(400).send({ error: err instanceof Error ? err.message : 'Query failed' })
    }
  })

  app.post('/daraja/account-balance', async (request, reply) => {
    if (!(await requireMerchant(request, reply, merchants))) return
    try {
      return await client.accountBalanceQuery()
    } catch (err) {
      return reply.code(400).send({ error: err instanceof Error ? err.message : 'Balance query failed' })
    }
  })

  app.post('/daraja/qrcode', async (request, reply) => {
    if (!(await requireMerchant(request, reply, merchants))) return
    const parsed = qrSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() })
    try {
      return await client.dynamicQrCode(parsed.data)
    } catch (err) {
      return reply.code(400).send({ error: err instanceof Error ? err.message : 'QR failed' })
    }
  })

  app.post('/providers/mpesa/b2c/result', async (request) => {
    const body = request.body as Record<string, unknown>
    const result = body.Result as Record<string, unknown> | undefined
    const resultCode = Number(result?.ResultCode ?? 0)

    await storeCallback(db, {
      callbackType: 'b2c_result',
      resultCode,
      resultDesc: String(result?.ResultDesc ?? ''),
      rawPayload: body
    })

    const originatorConversationId = String(result?.OriginatorConversationID ?? '')
    if (originatorConversationId) {
      const { data: payouts } = await db
        .from('payouts')
        .select('id')
        .eq('status', 'processing')
        .filter('metadata->>b2cOriginatorConversationId', 'eq', originatorConversationId)

      for (const payout of payouts ?? []) {
        await db
          .from('payouts')
          .update({ status: resultCode === 0 ? 'completed' : 'failed' })
          .eq('id', payout.id)
      }
    }

    return { ResultCode: 0, ResultDesc: 'Accepted' }
  })

  app.post('/providers/mpesa/b2b/result', async (request) => {
    const body = request.body as Record<string, unknown>
    await storeCallback(db, {
      callbackType: 'b2b_result',
      resultCode: Number((body.Result as Record<string, unknown>)?.ResultCode ?? 0),
      resultDesc: String((body.Result as Record<string, unknown>)?.ResultDesc ?? ''),
      rawPayload: body
    })
    return { ResultCode: 0, ResultDesc: 'Accepted' }
  })

  app.post('/providers/mpesa/reversal/result', async (request) => {
    const body = request.body as Record<string, unknown>
    await storeCallback(db, {
      callbackType: 'reversal_result',
      resultCode: Number((body.Result as Record<string, unknown>)?.ResultCode ?? 0),
      resultDesc: String((body.Result as Record<string, unknown>)?.ResultDesc ?? ''),
      rawPayload: body
    })
    return { ResultCode: 0, ResultDesc: 'Accepted' }
  })

  app.post('/providers/mpesa/c2b/validation', async (request) => {
    const body = request.body as Record<string, unknown>
    await storeCallback(db, {
      callbackType: 'c2b_validation',
      resultCode: 0,
      rawPayload: body
    })
    return { ResultCode: 0, ResultDesc: 'Accepted' }
  })

  app.post('/providers/mpesa/c2b/confirmation', async (request) => {
    const body = request.body as Record<string, unknown>
    await storeCallback(db, {
      callbackType: 'c2b_confirmation',
      resultCode: 0,
      mpesaReceipt: String(body.TransID ?? ''),
      rawPayload: body
    })
    return { ResultCode: 0, ResultDesc: 'Success' }
  })

  app.get('/payments/:id/invoice', async (request, reply) => {
    const { id } = request.params as { id: string }
    const invoice = await invoices.getByPaymentId(id)
    if (!invoice) return reply.code(404).send({ error: 'Invoice not found' })
    return invoice
  })

  app.get('/gateway/payments/reference/:ref/invoice.pdf', async (request, reply) => {
    const { ref } = request.params as { ref: string }
    const invoice = await invoices.getByCheckoutReference(ref)
    if (!invoice) return reply.code(404).send({ error: 'Invoice not found' })
    const pdf = await invoices.readPdf(invoice)
    return reply
      .header('Content-Type', 'application/pdf')
      .header('Content-Disposition', `attachment; filename="${invoice.invoice_number}.pdf"`)
      .send(pdf)
  })

  app.get('/payments/:id/invoice.pdf', async (request, reply) => {
    const { id } = request.params as { id: string }
    const invoice = await invoices.getByPaymentId(id)
    if (!invoice) return reply.code(404).send({ error: 'Invoice not found' })
    const pdf = await invoices.readPdf(invoice)
    return reply
      .header('Content-Type', 'application/pdf')
      .header('Content-Disposition', `attachment; filename="${invoice.invoice_number}.pdf"`)
      .send(pdf)
  })

  app.get('/merchants/me/invoices', async (request, reply) => {
    if (!(await requireMerchant(request, reply, merchants))) return
    return invoices.listForMerchant(request.merchantId!)
  })
}
