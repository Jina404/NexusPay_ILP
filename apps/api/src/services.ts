import { randomUUID } from 'node:crypto'
import {
  createRafikiAdminClient,
  type RafikiAdminClient
} from '@nexuspay/rafiki-client'
import {
  formatAmountMinorUnits,
  parseAmount,
  WebhookEventType,
  type RafikiWebhook
} from '@nexuspay/shared'
import { createMpesaClient } from '@nexuspay/mpesa'
import type { FastifyBaseLogger } from 'fastify'
import type { AppConfig } from './config.js'
import {
  LedgerService,
  PaymentRepository,
  recordWebhookEvent,
  createSupabase
} from './db.js'

export class WebhookService {
  readonly rafiki: RafikiAdminClient
  readonly ledger: LedgerService
  readonly payments: PaymentRepository
  readonly mpesa

  constructor(
    private readonly config: AppConfig,
    private readonly log: FastifyBaseLogger
  ) {
    const db = createSupabase(config)
    this.rafiki = createRafikiAdminClient({
      graphqlUrl: config.RAFIKI_GRAPHQL_URL,
      tenantId: config.RAFIKI_TENANT_ID,
      apiSecret: config.RAFIKI_API_SECRET,
      signatureVersion: config.RAFIKI_SIGNATURE_VERSION
    })
    this.ledger = new LedgerService(db)
    this.payments = new PaymentRepository(db)
    this.mpesa = createMpesaClient({
      consumerKey: config.MPESA_CONSUMER_KEY,
      consumerSecret: config.MPESA_CONSUMER_SECRET,
      passkey: config.MPESA_PASSKEY,
      shortcode: config.MPESA_SHORTCODE,
      environment: config.MPESA_ENVIRONMENT,
      callbackUrl: config.MPESA_CALLBACK_URL
    })
    this.db = db
  }

  private readonly db: ReturnType<typeof createSupabase>

  async handle(event: RafikiWebhook): Promise<void> {
    const db = this.db
    const isNew = await recordWebhookEvent(db, event.id, event.type, event)
    if (!isNew) {
      this.log.info({ webhookId: event.id }, 'Duplicate webhook ignored')
      return
    }

    switch (event.type) {
      case WebhookEventType.OutgoingPaymentCreated:
        await this.handleOutgoingPaymentCreated(event)
        break
      case WebhookEventType.OutgoingPaymentCompleted:
      case WebhookEventType.OutgoingPaymentFailed:
        await this.handleOutgoingPaymentCompletedFailed(event)
        break
      case WebhookEventType.IncomingPaymentCompleted:
      case WebhookEventType.IncomingPaymentExpired:
        await this.handleIncomingPaymentCompletedExpired(event)
        break
      case WebhookEventType.WalletAddressNotFound:
        await this.handleWalletAddressNotFound(event)
        break
      case WebhookEventType.IncomingPaymentCreated:
        this.log.info({ paymentId: event.data.id }, 'Incoming payment created')
        break
      default:
        this.log.warn({ type: event.type }, 'Unhandled webhook type')
    }
  }

  private async handleOutgoingPaymentCreated(event: RafikiWebhook): Promise<void> {
    const paymentData = event.data
    const outgoingPaymentId = paymentData.id as string
    const walletAddressId = paymentData.walletAddressId as string

    const payment =
      await this.payments.getByOutgoingPaymentId(outgoingPaymentId)
    if (!payment) {
      this.log.warn({ outgoingPaymentId }, 'No payment record for outgoing payment')
      return
    }

    const buyerAccount = await this.ledger.getAccountByWalletAddressId(
      walletAddressId
    )
    if (!buyerAccount) {
      await this.rafiki.cancelOutgoingPayment(
        outgoingPaymentId,
        'Buyer account not found.'
      )
      await this.payments.update(payment.id, { status: 'failed' })
      return
    }

    const amountKes = Number(payment.amount_value) / 10 ** payment.amount_asset_scale
    const phone = payment.buyer_phone
    if (!phone) {
      await this.rafiki.cancelOutgoingPayment(
        outgoingPaymentId,
        'Buyer phone number missing.'
      )
      await this.payments.update(payment.id, { status: 'failed' })
      return
    }

    const stk = await this.mpesa.stkPush({
      amount: amountKes,
      phone,
      accountReference: payment.id.slice(0, 12),
      transactionDesc: 'NexusPay'
    })

    await this.payments.update(payment.id, {
      status: 'awaiting_mpesa',
      mpesa_checkout_request_id: stk.checkoutRequestId,
      mpesa_merchant_request_id: stk.merchantRequestId
    })

    this.log.info(
      { paymentId: payment.id, checkoutRequestId: stk.checkoutRequestId },
      'STK Push initiated'
    )
  }

  private async handleOutgoingPaymentCompletedFailed(
    event: RafikiWebhook
  ): Promise<void> {
    const paymentData = event.data
    const walletAddressId = paymentData.walletAddressId as string
    const account = await this.ledger.getAccountByWalletAddressId(walletAddressId)
    if (!account) return

    const payment = await this.payments.getByOutgoingPaymentId(
      paymentData.id as string
    )

    if (event.type === WebhookEventType.OutgoingPaymentFailed) {
      const debitAmount = parseAmount(
        paymentData.debitAmount as {
          value: string
          assetCode: string
          assetScale: number
        }
      )
      await this.ledger.voidPendingDebit(account.id, debitAmount.value)
      if (payment) await this.payments.update(payment.id, { status: 'failed' })
      return
    }

    const sentAmount = parseAmount(
      paymentData.sentAmount as {
        value: string
        assetCode: string
        assetScale: number
      }
    )
    await this.ledger.debit(account.id, sentAmount.value, true)
    if (payment && payment.status !== 'completed') {
      await this.payments.update(payment.id, { status: 'funded' })
    }
  }

  private async handleIncomingPaymentCompletedExpired(
    event: RafikiWebhook
  ): Promise<void> {
    const paymentData = event.data
    const walletAddressId = paymentData.walletAddressId as string
    const account = await this.ledger.getAccountByWalletAddressId(walletAddressId)
    if (!account) return

    if (event.type === WebhookEventType.IncomingPaymentExpired) {
      const payment = await this.payments
        .getById((paymentData.metadata as { nexuspayPaymentId?: string })?.nexuspayPaymentId ?? '')
        .catch(() => null)
      if (payment) await this.payments.update(payment.id, { status: 'expired' })
      return
    }

    const receivedAmount = parseAmount(
      paymentData.receivedAmount as {
        value: string
        assetCode: string
        assetScale: number
      }
    )
    await this.ledger.credit(account.id, receivedAmount.value)

    await this.rafiki.createIncomingPaymentWithdrawal({
      incomingPaymentId: paymentData.id as string,
      idempotencyKey: randomUUID(),
      timeoutSeconds: 0
    })

    const incomingPaymentId = paymentData.id as string
    const { data: rows } = await this.db
      .from('ilp_payments')
      .select('*')
      .eq('incoming_payment_id', incomingPaymentId)
      .limit(1)
    const payment = rows?.[0]
    if (payment) {
      await this.payments.update(payment.id, { status: 'completed' })
    }
  }

  private async handleWalletAddressNotFound(event: RafikiWebhook): Promise<void> {
    const walletAddressUrl = event.data.walletAddressUrl as string | undefined
    if (!walletAddressUrl) return

    const accountPath = new URL(walletAddressUrl).pathname.replace(/^\//, '')
    const account = await this.ledger.getAccountByPath(accountPath)
    if (!account) return

    const assetId =
      account.asset_id ?? this.config.RAFIKI_KES_ASSET_ID ?? ''
    if (!assetId) {
      throw new Error('KES asset id not configured')
    }

    const walletAddress = await this.rafiki.createWalletAddress({
      assetId,
      publicName: accountPath,
      url: walletAddressUrl
    })

    await this.ledger.setWalletAddress(
      account.id,
      walletAddress.id,
      walletAddress.url ?? walletAddressUrl,
      assetId
    )
  }
}

export class PaymentService {
  readonly rafiki: RafikiAdminClient
  readonly ledger: LedgerService
  readonly payments: PaymentRepository

  constructor(
    private readonly config: AppConfig,
    private readonly log: FastifyBaseLogger
  ) {
    const db = createSupabase(config)
    this.rafiki = createRafikiAdminClient({
      graphqlUrl: config.RAFIKI_GRAPHQL_URL,
      tenantId: config.RAFIKI_TENANT_ID,
      apiSecret: config.RAFIKI_API_SECRET,
      signatureVersion: config.RAFIKI_SIGNATURE_VERSION
    })
    this.ledger = new LedgerService(db)
    this.payments = new PaymentRepository(db)
    this.db = db
  }

  private readonly db: ReturnType<typeof createSupabase>

  async checkout(input: {
    sellerAccountId: string
    buyerAccountId: string
    amountKes: number
    buyerPhone: string
    idempotencyKey?: string
  }) {
    const seller = await this.ledger.getAccountById(input.sellerAccountId)
    const buyer = await this.ledger.getAccountById(input.buyerAccountId)
    if (!seller?.wallet_address_id || !buyer?.wallet_address_id) {
      throw new Error('Buyer or seller wallet address not configured')
    }

    const amountValue = formatAmountMinorUnits(input.amountKes, 2)
    const amount = {
      value: amountValue,
      assetCode: 'KES',
      assetScale: 2
    }

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString()

    const incomingPayment = await this.rafiki.createIncomingPayment({
      walletAddressId: seller.wallet_address_id,
      incomingAmount: amount,
      expiresAt,
      metadata: { source: 'nexuspay' }
    })

    const payment = await this.payments.create({
      buyer_account_id: buyer.id,
      seller_account_id: seller.id,
      amount_value: Number(amountValue),
      amount_asset_code: 'KES',
      amount_asset_scale: 2,
      incoming_payment_id: incomingPayment.id,
      incoming_payment_url: incomingPayment.url,
      buyer_phone: input.buyerPhone,
      status: 'created',
      idempotency_key: input.idempotencyKey ?? randomUUID(),
      metadata: {}
    })

    const quote = await this.rafiki.createQuote({
      walletAddressId: buyer.wallet_address_id,
      receiver: incomingPayment.url,
      receiveAmount: amount
    })

    const outgoingPayment = await this.rafiki.createOutgoingPayment({
      walletAddressId: buyer.wallet_address_id,
      quoteId: quote.id,
      metadata: { nexuspayPaymentId: payment.id }
    })

    await this.payments.update(payment.id, {
      quote_id: quote.id,
      outgoing_payment_id: outgoingPayment.id
    })

    this.log.info(
      {
        paymentId: payment.id,
        outgoingPaymentId: outgoingPayment.id
      },
      'Checkout initiated'
    )

    return this.payments.getById(payment.id)
  }

  async handleMpesaCallback(parsed: {
    checkoutRequestId: string
    merchantRequestId: string
    resultCode: number
    resultDesc: string
    mpesaReceiptNumber?: string
  }) {
    const payment = await this.payments.getByCheckoutRequestId(
      parsed.checkoutRequestId
    )
    if (!payment?.outgoing_payment_id) {
      throw new Error('Payment not found for checkout request')
    }

    await this.db.from('mpesa_callbacks').insert({
      checkout_request_id: parsed.checkoutRequestId,
      merchant_request_id: parsed.merchantRequestId,
      result_code: parsed.resultCode,
      result_desc: parsed.resultDesc,
      mpesa_receipt_number: parsed.mpesaReceiptNumber ?? null,
      payment_id: payment.id,
      raw_payload: parsed
    })

    if (parsed.resultCode !== 0) {
      await this.rafiki.cancelOutgoingPayment(
        payment.outgoing_payment_id,
        parsed.resultDesc
      )
      await this.payments.update(payment.id, { status: 'failed' })
      return payment
    }

    await this.ledger.credit(
      payment.buyer_account_id,
      BigInt(payment.amount_value)
    )

    await this.rafiki.depositOutgoingPaymentLiquidity({
      outgoingPaymentId: payment.outgoing_payment_id,
      idempotencyKey: randomUUID()
    })

    await this.payments.update(payment.id, {
      status: 'funded',
      mpesa_receipt_number: parsed.mpesaReceiptNumber ?? null
    })

    return this.payments.getById(payment.id)
  }

  async createAccount(input: {
    userId: string
    role: 'buyer' | 'seller'
    country: string
    phone?: string
    businessName?: string
    businessRegistrationNumber?: string
    walletPath: string
  }) {
    await this.db.from('profiles').upsert({
      id: input.userId,
      role: input.role,
      country: input.country,
      phone: input.phone ?? null,
      business_name: input.businessName ?? null,
      business_registration_number: input.businessRegistrationNumber ?? null
    })

    const assetId = this.config.RAFIKI_KES_ASSET_ID
    if (!assetId) {
      throw new Error('RAFIKI_KES_ASSET_ID is required to create wallet addresses')
    }

    const walletUrl = new URL(
      input.walletPath,
      `${this.config.RAFIKI_WALLET_ADDRESS_PREFIX}/`
    ).toString()

    const walletAddress = await this.rafiki.createWalletAddress({
      assetId,
      publicName: input.walletPath,
      url: walletUrl
    })

    const { data, error } = await this.db
      .from('accounts')
      .insert({
        user_id: input.userId,
        wallet_address_id: walletAddress.id,
        wallet_address_url: walletAddress.url ?? walletUrl,
        wallet_path: input.walletPath,
        asset_code: 'KES',
        asset_id: assetId,
        balance: 0
      })
      .select('*')
      .single()

    if (error) throw error
    return data
  }
}
