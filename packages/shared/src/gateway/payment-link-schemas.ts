import { z } from 'zod'

export const createPaymentLinkSchema = z
  .object({
    title: z.string().min(1).max(200),
    description: z.string().max(1000).optional(),
    linkType: z.enum(['fixed', 'open']),
    amount: z.number().positive().optional(),
    currency: z.string().length(3).default('KES'),
    expiresAt: z.string().datetime().optional()
  })
  .superRefine((data, ctx) => {
    if (data.linkType === 'fixed' && (data.amount === undefined || data.amount <= 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'amount is required for fixed payment links',
        path: ['amount']
      })
    }
    if (data.linkType === 'open' && data.amount !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'amount must not be set for open payment links',
        path: ['amount']
      })
    }
  })

export const updatePaymentLinkSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  amount: z.number().positive().optional(),
  expiresAt: z.string().datetime().nullable().optional()
})

export const paymentLinkCheckoutSchema = z.object({
  phone: z.string().min(9),
  amount: z.number().positive().optional(),
  idempotencyKey: z.string().uuid().optional()
})

export type CreatePaymentLinkInput = z.infer<typeof createPaymentLinkSchema>
export type UpdatePaymentLinkInput = z.infer<typeof updatePaymentLinkSchema>
export type PaymentLinkCheckoutInput = z.infer<typeof paymentLinkCheckoutSchema>
