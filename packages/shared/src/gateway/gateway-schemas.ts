import { z } from 'zod'

export const registerMerchantSchema = z.object({
  businessName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  country: z.string().default('KE'),
  settlementCurrency: z.string().default('KES'),
  userId: z.string().uuid().optional()
})

export const gatewayCheckoutSchema = z.object({
  merchantId: z.string().uuid(),
  amount: z.number().positive(),
  currency: z.string().length(3).default('KES'),
  paymentMethod: z.enum(['mpesa', 'airtel', 'card', 'bank']),
  customerPhone: z.string().min(10).optional(),
  customerEmail: z.string().email().optional(),
  externalReference: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  idempotencyKey: z.string().uuid().optional(),
  useEscrow: z.boolean().optional()
})

export const createPayoutSchema = z.object({
  merchantId: z.string().uuid(),
  amount: z.number().positive(),
  currency: z.string().length(3).default('KES'),
  destinationType: z.enum(['bank', 'mpesa', 'airtel_wallet']),
  destinationReference: z.string().min(3),
  idempotencyKey: z.string().uuid().optional()
})

export const createRefundSchema = z.object({
  paymentId: z.string().uuid(),
  amount: z.number().positive().optional(),
  reason: z.string().optional(),
  idempotencyKey: z.string().uuid().optional()
})

export const escrowCreateSchema = z.object({
  paymentId: z.string().uuid()
})

export const escrowReleaseSchema = z.object({
  escrowId: z.string().uuid()
})

export const escrowRefundSchema = z.object({
  escrowId: z.string().uuid(),
  reason: z.string().optional()
})

export const settlementInitiateSchema = z.object({
  merchantId: z.string().uuid(),
  currency: z.string().length(3).default('KES'),
  destinationCurrency: z.string().length(3).optional()
})

export const fxConvertSchema = z.object({
  fromCurrency: z.string().length(3),
  toCurrency: z.string().length(3),
  amount: z.number().positive()
})

export type RegisterMerchantInput = z.infer<typeof registerMerchantSchema>
export type GatewayCheckoutInput = z.infer<typeof gatewayCheckoutSchema>
export type CreatePayoutInput = z.infer<typeof createPayoutSchema>
export type CreateRefundInput = z.infer<typeof createRefundSchema>
