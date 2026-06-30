import { createWriteStream } from 'node:fs'
import { mkdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { FastifyBaseLogger } from 'fastify'
import PDFDocument from 'pdfkit'

export interface InvoiceRow {
  id: string
  payment_id: string
  merchant_id: string
  invoice_number: string
  payer_phone: string | null
  amount: number
  currency: string
  mpesa_receipt: string | null
  line_items: unknown[]
  pdf_path: string | null
  created_at: string
}

export class InvoiceService {
  private readonly invoiceDir: string

  constructor(
    private readonly db: SupabaseClient,
    private readonly log: FastifyBaseLogger
  ) {
    this.invoiceDir = join(tmpdir(), 'nexuspay-invoices')
  }

  async generateForPayment(paymentId: string): Promise<InvoiceRow | null> {
    const { data: existing } = await this.db
      .from('payment_invoices')
      .select('*')
      .eq('payment_id', paymentId)
      .maybeSingle()
    if (existing) return existing as InvoiceRow

    const { data: payment } = await this.db
      .from('payments')
      .select('*, merchants(business_name)')
      .eq('id', paymentId)
      .eq('status', 'completed')
      .maybeSingle()
    if (!payment) return null

    const metadata = (payment.metadata ?? {}) as Record<string, unknown>
    const merchantName =
      (payment.merchants as { business_name?: string } | null)?.business_name ?? 'Merchant'
    const invoiceNumber = await this.nextInvoiceNumber()
    const mpesaReceipt = (metadata.mpesa_receipt as string | undefined) ?? null
    const payerPhone = (metadata.payer_phone as string | undefined) ?? payment.customer_phone

    const lineItems = [
      {
        description: (metadata.linkTitle as string) ?? 'Payment',
        amount: Number(payment.amount) / 100,
        currency: payment.currency
      }
    ]

    const { data: invoice, error } = await this.db
      .from('payment_invoices')
      .insert({
        payment_id: paymentId,
        merchant_id: payment.merchant_id,
        invoice_number: invoiceNumber,
        payer_phone: payerPhone,
        amount: payment.amount,
        currency: payment.currency,
        mpesa_receipt: mpesaReceipt,
        line_items: lineItems
      })
      .select('*')
      .single()
    if (error) {
      this.log.error({ error, paymentId }, 'Failed to create invoice record')
      return null
    }

    const pdfPath = await this.renderPdf({
      invoiceNumber,
      merchantName,
      payerPhone,
      amount: Number(payment.amount) / 100,
      currency: payment.currency as string,
      mpesaReceipt,
      checkoutReference: payment.checkout_reference as string,
      createdAt: payment.created_at as string,
      lineItems
    })

    await this.db
      .from('payment_invoices')
      .update({ pdf_path: pdfPath })
      .eq('id', invoice.id)

    return { ...invoice, pdf_path: pdfPath } as InvoiceRow
  }

  async getByPaymentId(paymentId: string): Promise<InvoiceRow | null> {
    const { data } = await this.db
      .from('payment_invoices')
      .select('*')
      .eq('payment_id', paymentId)
      .maybeSingle()
    return (data as InvoiceRow) ?? null
  }

  async getByCheckoutReference(ref: string): Promise<InvoiceRow | null> {
    const { data: payment } = await this.db
      .from('payments')
      .select('id')
      .eq('checkout_reference', ref)
      .maybeSingle()
    if (!payment) return null
    return this.getByPaymentId(payment.id)
  }

  async listForMerchant(merchantId: string): Promise<InvoiceRow[]> {
    const { data } = await this.db
      .from('payment_invoices')
      .select('*')
      .eq('merchant_id', merchantId)
      .order('created_at', { ascending: false })
      .limit(200)
    return (data as InvoiceRow[]) ?? []
  }

  async readPdf(invoice: InvoiceRow): Promise<Buffer> {
    if (invoice.pdf_path) {
      try {
        return await readFile(invoice.pdf_path)
      } catch {
        /* regenerate below */
      }
    }
    const payment = await this.db
      .from('payments')
      .select('*, merchants(business_name)')
      .eq('id', invoice.payment_id)
      .single()
    if (payment.error || !payment.data) throw new Error('Payment not found')

    const metadata = (payment.data.metadata ?? {}) as Record<string, unknown>
    const merchantName =
      (payment.data.merchants as { business_name?: string } | null)?.business_name ?? 'Merchant'
    const lineItems = (invoice.line_items ?? []) as Array<{
      description: string
      amount: number
      currency: string
    }>

    const pdfPath = await this.renderPdf({
      invoiceNumber: invoice.invoice_number,
      merchantName,
      payerPhone: invoice.payer_phone,
      amount: Number(invoice.amount) / 100,
      currency: invoice.currency,
      mpesaReceipt: invoice.mpesa_receipt,
      checkoutReference: payment.data.checkout_reference as string,
      createdAt: invoice.created_at,
      lineItems
    })

    await this.db.from('payment_invoices').update({ pdf_path: pdfPath }).eq('id', invoice.id)
    return readFile(pdfPath)
  }

  private async nextInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear()
    const prefix = `NP-${year}-`
    const { count } = await this.db
      .from('payment_invoices')
      .select('id', { count: 'exact', head: true })
      .like('invoice_number', `${prefix}%`)
    const seq = String((count ?? 0) + 1).padStart(6, '0')
    return `${prefix}${seq}`
  }

  private async renderPdf(input: {
    invoiceNumber: string
    merchantName: string
    payerPhone: string | null
    amount: number
    currency: string
    mpesaReceipt: string | null
    checkoutReference: string
    createdAt: string
    lineItems: Array<{ description: string; amount: number; currency: string }>
  }): Promise<string> {
    await mkdir(this.invoiceDir, { recursive: true })
    const filePath = join(this.invoiceDir, `${input.invoiceNumber}.pdf`)

    await new Promise<void>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 })
      const stream = createWriteStream(filePath)
      doc.pipe(stream)

      doc.fontSize(20).text('NexusPay Receipt', { align: 'center' })
      doc.moveDown()
      doc.fontSize(12).text(`Invoice: ${input.invoiceNumber}`)
      doc.text(`Merchant: ${input.merchantName}`)
      doc.text(`Reference: ${input.checkoutReference}`)
      doc.text(`Date: ${new Date(input.createdAt).toLocaleString()}`)
      if (input.payerPhone) doc.text(`Payer phone: ${input.payerPhone}`)
      if (input.mpesaReceipt) doc.text(`M-Pesa receipt: ${input.mpesaReceipt}`)
      doc.moveDown()
      doc.text('Items:')
      for (const item of input.lineItems) {
        doc.text(`  ${item.description} — ${item.amount} ${item.currency}`)
      }
      doc.moveDown()
      doc.fontSize(14).text(`Total: ${input.amount} ${input.currency}`, { align: 'right' })
      doc.end()

      stream.on('finish', () => resolve())
      stream.on('error', reject)
    })

    return filePath
  }
}
