# Vercel API deployment (nexus-pay-ilp-api)

## Project setup

- **Vercel project name:** `nexus-pay-ilp-api`
- **Root directory:** `apps/api`
- **Framework:** Other (serverless Fastify)

## Deploy from CLI

```powershell
cd apps/api
vercel link --project nexus-pay-ilp-api
vercel --prod
```

Or first-time create:

```powershell
cd apps/api
vercel --name nexus-pay-ilp-api --prod
```

## Required environment variables

Set these in Vercel → Project → Settings → Environment Variables:

| Variable | Notes |
|----------|--------|
| `NODE_ENV` | `production` |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key |
| `RAFIKI_GRAPHQL_URL` | Rafiki GraphQL endpoint |
| `RAFIKI_TENANT_ID` | UUID |
| `RAFIKI_API_SECRET` | |
| `RAFIKI_WEBHOOK_SECRET` | |
| `RAFIKI_WALLET_ADDRESS_PREFIX` | Public API URL |
| `MPESA_CONSUMER_KEY` | Daraja |
| `MPESA_CONSUMER_SECRET` | Daraja |
| `MPESA_PASSKEY` | Daraja |
| `MPESA_SHORTCODE` | |
| `MPESA_ENVIRONMENT` | `sandbox` or `production` |
| `MPESA_CALLBACK_URL` | `https://<your-vercel-domain>/providers/mpesa/callback` |
| `API_PUBLIC_URL` | `https://<your-vercel-domain>` |

Optional: `MPESA_*_RESULT_URL`, `MPESA_VALIDATION_URL`, `MPESA_CONFIRMATION_URL`, `EXCHANGE_RATES`, `STK_TIMEOUT_MS`, `LOG_LEVEL`.

After deploy, update Daraja portal with your Vercel HTTPS callback URL.

## Notes

- Background M-Pesa watchers (STK poll, timeout) are **disabled on Vercel** (serverless). Callbacks and STK Push still work; consider Vercel Cron or a separate worker for polling later.
- Point your web app `NEXT_PUBLIC_API_URL` to the Vercel deployment URL.
