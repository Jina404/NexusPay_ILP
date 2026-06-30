import { config as loadEnv } from 'dotenv'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
if (!process.env.VERCEL) {
  loadEnv({ path: resolve(__dirname, '../../../.env') })
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  LOG_LEVEL: z.string().default('info'),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  RAFIKI_GRAPHQL_URL: z.string().url(),
  RAFIKI_TENANT_ID: z.string().uuid(),
  RAFIKI_API_SECRET: z.string().min(1),
  RAFIKI_SIGNATURE_VERSION: z.string().default('1'),
  RAFIKI_WEBHOOK_SECRET: z.string().min(1),
  RAFIKI_WEBHOOK_SIGNATURE_VERSION: z.coerce.number().default(1),
  RAFIKI_WALLET_ADDRESS_PREFIX: z.string().url(),
  RAFIKI_KES_ASSET_ID: z.string().optional(),
  MPESA_CONSUMER_KEY: z.string().min(1),
  MPESA_CONSUMER_SECRET: z.string().min(1),
  MPESA_PASSKEY: z.string().min(1),
  MPESA_SHORTCODE: z.string().min(1),
  MPESA_ENVIRONMENT: z.enum(['sandbox', 'production']).default('sandbox'),
  MPESA_CALLBACK_URL: z.string().url(),
  MPESA_INITIATOR_NAME: z.string().optional(),
  MPESA_SECURITY_CREDENTIAL: z.string().optional(),
  MPESA_B2C_SHORTCODE: z.string().optional(),
  MPESA_VALIDATION_URL: z.string().url().optional(),
  MPESA_CONFIRMATION_URL: z.string().url().optional(),
  MPESA_B2C_RESULT_URL: z.string().url().optional(),
  MPESA_B2B_RESULT_URL: z.string().url().optional(),
  MPESA_REVERSAL_RESULT_URL: z.string().url().optional(),
  API_PUBLIC_URL: z.string().url(),
  STK_TIMEOUT_MS: z.coerce.number().default(120_000),
  EXCHANGE_RATES: z.string().default('{"KES":{"UGX":28.5,"TZS":18.2,"USD":0.0077}}')
})

export type AppConfig = z.infer<typeof envSchema>

export function loadConfig(): AppConfig {
  const parsed = envSchema.safeParse(process.env)
  if (!parsed.success) {
    throw new Error(`Invalid environment: ${parsed.error.message}`)
  }
  return parsed.data
}

export function getExchangeRates(config: AppConfig): Record<string, Record<string, number>> {
  return JSON.parse(config.EXCHANGE_RATES) as Record<string, Record<string, number>>
}
