import { randomUUID } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { AppConfig } from './config.js'
import { PaymentService } from './services.js'
import type { FastifyBaseLogger } from 'fastify'
import { createSupabase } from './db.js'
import { CheckoutEngine } from './modules/checkout/service.js'
import { EscrowEngine } from './modules/escrow/service.js'

const PLATFORM_FEE_RATE = 0.025

export interface OrderRecord {
  id: string
  buyer_id: string
  seller_id: string
  payment_id: string | null
  gateway_payment_id: string | null
  status: string
  subtotal: number
  platform_fee: number
  total: number
  delivery_address: string | null
  delivery_city: string | null
  delivery_country: string
  buyer_phone: string | null
  reference: string
  created_at: string
  order_items?: Array<{
    id: string
    title: string
    quantity: number
    unit_price: number
    unit: string
    origin_country: string
  }>
  ilp_payments?: { status: string; mpesa_receipt_number: string | null } | null
  gateway_payments?: { status: string; checkout_reference: string } | null
}

export class OrderService {
  private db: SupabaseClient
  private paymentService: PaymentService
  private checkoutEngine: CheckoutEngine
  private escrow: EscrowEngine

  constructor(config: AppConfig, log: FastifyBaseLogger) {
    this.db = createSupabase(config)
    this.paymentService = new PaymentService(config, log)
    this.checkoutEngine = new CheckoutEngine(this.db, config, log)
    this.escrow = new EscrowEngine(this.db)
  }

  async checkout(input: {
    buyerId: string
    sellerId: string
    cartItemIds: string[]
    deliveryAddress: string
    deliveryCity: string
    deliveryCountry: string
    buyerPhone: string
    idempotencyKey?: string
  }) {
    const { data: cartItems, error: cartError } = await this.db
      .from('cart_items')
      .select('*, products(*)')
      .in('id', input.cartItemIds)

    if (cartError) throw cartError
    if (!cartItems?.length) throw new Error('Cart is empty')

    const sellerIds = new Set(
      cartItems.map((i) => (i.products as { seller_id: string }).seller_id)
    )
    if (sellerIds.size !== 1 || !sellerIds.has(input.sellerId)) {
      throw new Error('All items must be from the same seller')
    }

    let subtotal = 0
    const lineItems = cartItems.map((item) => {
      const product = item.products as {
        id: string
        title: string
        price_per_unit: number
        unit: string
        origin_country: string
        min_order_qty: number
      }
      if (item.quantity < product.min_order_qty) {
        throw new Error(`Minimum order for ${product.title} is ${product.min_order_qty}`)
      }
      const line = product.price_per_unit * item.quantity
      subtotal += line
      return {
        product_id: product.id,
        title: product.title,
        quantity: item.quantity,
        unit_price: product.price_per_unit,
        unit: product.unit,
        origin_country: product.origin_country
      }
    })

    const platformFee = Math.round(subtotal * PLATFORM_FEE_RATE)
    const total = subtotal + platformFee
    const reference = `NX-${randomUUID().slice(0, 8).toUpperCase()}`

    const { data: order, error: orderError } = await this.db
      .from('orders')
      .insert({
        buyer_id: input.buyerId,
        seller_id: input.sellerId,
        status: 'payment_pending',
        subtotal,
        platform_fee: platformFee,
        total,
        delivery_address: input.deliveryAddress,
        delivery_city: input.deliveryCity,
        delivery_country: input.deliveryCountry,
        buyer_phone: input.buyerPhone,
        reference
      })
      .select('*')
      .single()

    if (orderError) throw orderError

    await this.db.from('order_items').insert(
      lineItems.map((li) => ({ ...li, order_id: order.id }))
    )

    await this.db.from('order_events').insert({
      order_id: order.id,
      event_type: 'placed',
      note: 'Order created'
    })

    const amountKes = total / 100

    const { data: sellerProfile } = await this.db
      .from('profiles')
      .select('merchant_id')
      .eq('id', input.sellerId)
      .maybeSingle()

    if (sellerProfile?.merchant_id) {
      const gatewayResult = await this.checkoutEngine.checkout({
        merchantId: sellerProfile.merchant_id,
        amount: amountKes,
        currency: 'KES',
        paymentMethod: 'mpesa',
        customerPhone: input.buyerPhone,
        externalReference: reference,
        idempotencyKey: input.idempotencyKey,
        metadata: { orderId: order.id, useEscrow: true },
        useEscrow: true
      })

      await this.db
        .from('orders')
        .update({ gateway_payment_id: gatewayResult.payment.id })
        .eq('id', order.id)
    } else {
      const { data: buyerAccount } = await this.db
        .from('accounts')
        .select('id')
        .eq('user_id', input.buyerId)
        .maybeSingle()

      const { data: sellerAccount } = await this.db
        .from('accounts')
        .select('id')
        .eq('user_id', input.sellerId)
        .maybeSingle()

      if (!buyerAccount?.id || !sellerAccount?.id) {
        throw new Error('Buyer or seller wallet not configured')
      }

      const payment = await this.paymentService.checkout({
        sellerAccountId: sellerAccount.id,
        buyerAccountId: buyerAccount.id,
        amountKes,
        buyerPhone: input.buyerPhone,
        idempotencyKey: input.idempotencyKey
      })

      await this.db.from('orders').update({ payment_id: payment?.id }).eq('id', order.id)
    }

    await this.db.from('cart_items').delete().in('id', input.cartItemIds)

    return this.getById(order.id)
  }

  async getById(id: string): Promise<OrderRecord | null> {
    const { data, error } = await this.db
      .from('orders')
      .select('*, order_items(*), ilp_payments(status, mpesa_receipt_number), gateway_payments:payments(status, checkout_reference)')
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    return data as OrderRecord | null
  }

  async syncPaymentStatus(paymentId: string, paymentStatus: string) {
    const { data: order } = await this.db
      .from('orders')
      .select('id, status')
      .eq('payment_id', paymentId)
      .maybeSingle()

    if (!order) return
    await this.applyPaymentStatus(order.id, order.status, paymentStatus)
  }

  async syncGatewayPayment(gatewayPaymentId: string, paymentStatus: string) {
    const { data: order } = await this.db
      .from('orders')
      .select('id, status')
      .eq('gateway_payment_id', gatewayPaymentId)
      .maybeSingle()

    if (!order) return
    await this.applyPaymentStatus(order.id, order.status, paymentStatus)
  }

  private async applyPaymentStatus(
    orderId: string,
    currentStatus: string,
    paymentStatus: string
  ) {
    let orderStatus = currentStatus
    if (paymentStatus === 'awaiting_mpesa' || paymentStatus === 'processing') {
      orderStatus = 'payment_pending'
    }
    if (paymentStatus === 'funded' || paymentStatus === 'completed') {
      orderStatus = 'payment_received'
      await this.db.from('order_events').insert({
        order_id: orderId,
        event_type: 'payment_received',
        note: 'Payment confirmed'
      })
    }
    if (paymentStatus === 'failed' || paymentStatus === 'expired') {
      orderStatus = 'cancelled'
    }

    await this.db.from('orders').update({ status: orderStatus }).eq('id', orderId)
  }

  async confirmDelivery(orderId: string, buyerId: string) {
    const order = await this.getById(orderId)
    if (!order) throw new Error('Order not found')
    if (order.buyer_id !== buyerId) throw new Error('Unauthorized')
    if (order.status !== 'delivered' && order.status !== 'shipped') {
      throw new Error('Order must be shipped or delivered first')
    }

    if (order.gateway_payment_id) {
      const { data: escrowRow } = await this.db
        .from('escrows')
        .select('id')
        .eq('payment_id', order.gateway_payment_id)
        .eq('status', 'held')
        .maybeSingle()
      if (escrowRow?.id) {
        await this.escrow.release(escrowRow.id)
      }
    }

    await this.db.from('orders').update({ status: 'escrow_released' }).eq('id', orderId)

    await this.db.from('order_events').insert({
      order_id: orderId,
      event_type: 'escrow_released',
      note: 'Buyer confirmed delivery'
    })

    return this.getById(orderId)
  }

  async advanceShipment(orderId: string, sellerId: string, status: 'shipped' | 'delivered') {
    const order = await this.getById(orderId)
    if (!order) throw new Error('Order not found')
    if (order.seller_id !== sellerId) throw new Error('Unauthorized')

    await this.db.from('orders').update({ status }).eq('id', orderId)
    await this.db.from('order_events').insert({
      order_id: orderId,
      event_type: status,
      note: `Marked as ${status}`
    })

    return this.getById(orderId)
  }
}
