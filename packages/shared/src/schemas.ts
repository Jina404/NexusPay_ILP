import { z } from 'zod'

export const checkoutSchema = z.object({
  sellerAccountId: z.string().uuid(),
  buyerAccountId: z.string().uuid(),
  amountKes: z.number().positive(),
  buyerPhone: z.string().min(10),
  idempotencyKey: z.string().uuid().optional()
})

export const createAccountSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['buyer', 'seller']),
  country: z.string().default('KE'),
  phone: z.string().optional(),
  businessName: z.string().optional(),
  businessRegistrationNumber: z.string().optional(),
  walletPath: z.string().min(1)
})

export const orderCheckoutSchema = z.object({
  buyerId: z.string().uuid(),
  sellerId: z.string().uuid(),
  cartItemIds: z.array(z.string().uuid()).min(1),
  deliveryAddress: z.string().min(3),
  deliveryCity: z.string().min(2),
  deliveryCountry: z.string().default('KE'),
  buyerPhone: z.string().min(10),
  idempotencyKey: z.string().uuid().optional()
})

export type CheckoutInput = z.infer<typeof checkoutSchema>
export type CreateAccountInput = z.infer<typeof createAccountSchema>
export type OrderCheckoutInput = z.infer<typeof orderCheckoutSchema>
