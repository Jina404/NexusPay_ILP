# NexusPay

Kenya-first **Interledger (Rafiki) + M-Pesa (Daraja)** integration platform. NexusPay acts as the Account Servicing Entity (ASE) bridge: Rafiki handles ILP settlement while Daraja STK Push collects real KES from buyers.

## Regulatory notice

Rafiki and customer balance holding require you to operate as a **licensed Account Servicing Entity (ASE)** (or partner with one) in each jurisdiction. NexusPay code is infrastructure only — not legal or licensing advice.

## Architecture

```
apps/web          → Minimal Next.js test UI (checkout + status)
apps/api          → ASE bridge (webhooks, checkout, M-Pesa callbacks)
packages/rafiki-client → Signed Rafiki Admin GraphQL client
packages/mpesa    → Daraja OAuth + STK Push
packages/shared   → Types and Zod schemas
rafiki/           → Upstream Interledger Rafiki (do not modify for app logic)
supabase/         → Postgres schema + RLS
```

### Payment flow

1. `POST /payments/checkout` creates seller incoming payment, quote, and buyer outgoing payment.
2. Rafiki sends `outgoing_payment.created` webhook → API triggers M-Pesa STK Push.
3. Buyer approves on phone → Daraja callback → `depositOutgoingPaymentLiquidity`.
4. ILP settles → `outgoing_payment.completed` / `incoming_payment.completed` webhooks finalize ledger entries.

## Prerequisites

- Node.js 20+
- pnpm 9+ (see install below if `pnpm` is not recognized)
- Docker (for Rafiki localenv)
- Supabase project
- Safaricom Daraja sandbox credentials (Consumer Key/Secret, Shortcode, Passkey)
- Public HTTPS URL for M-Pesa callback in non-local testing (ngrok, Cloudflare Tunnel)

### Install pnpm (if not on PATH)

**PowerShell (Windows):**

```powershell
npm install -g pnpm@9.15.0
```

Close and reopen the terminal, then verify: `pnpm -v`

**Without a global install** — prefix every command with `npx`:

```powershell
npx pnpm@9.15.0 install
npx pnpm@9.15.0 build
```

## Setup

### 1. Install dependencies

**PowerShell:**

```powershell
Copy-Item .env.example .env
pnpm install
pnpm build
```

**If `pnpm` is not recognized:**

```powershell
npx pnpm@9.15.0 install
npx pnpm@9.15.0 build
```

### 2. Configure environment

Edit `.env` and fill in Supabase, Rafiki, and M-Pesa values (copy from `.env.example` if you have not already).

### 3. Supabase

Apply migrations:

```sh
supabase db push
# or run supabase/migrations/20250623000000_initial_schema.sql in SQL editor
```

Create test users in Supabase Auth, then register accounts:

```sh
curl -X POST http://localhost:3000/accounts \
  -H "Content-Type: application/json" \
  -d '{"userId":"<auth-user-uuid>","role":"buyer","walletPath":"accounts/test-buyer"}'

curl -X POST http://localhost:3000/accounts \
  -H "Content-Type: application/json" \
  -d '{"userId":"<auth-user-uuid>","role":"seller","walletPath":"accounts/test-seller"}'
```

### 4. Rafiki local stack

**PowerShell** (use `;` instead of `&&`):

```powershell
cd rafiki
pnpm install
pnpm localenv:compose up
```

Or from NexusPay root without changing directory permanently:

```powershell
Push-Location rafiki; pnpm install; pnpm localenv:compose up
```

Point Rafiki at NexusPay (see [config/rafiki-backend.env.example](config/rafiki-backend.env.example)):

- `WEBHOOK_URL=http://host.docker.internal:3000/webhooks`
- `EXCHANGE_RATES_URL=http://host.docker.internal:3000/rates`

Seed KES asset and tenant:

```sh
pnpm seed:rafiki
```

Copy printed `RAFIKI_TENANT_ID`, `RAFIKI_API_SECRET`, and `RAFIKI_KES_ASSET_ID` into `.env`.

### 5. Run NexusPay

```sh
pnpm dev
```

- API: http://localhost:3000
- Web: http://localhost:3015
- Rafiki Admin: http://localhost:3010

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Liveness |
| GET | `/rates?base=KES` | Exchange rates for Rafiki |
| POST | `/webhooks` | Rafiki webhook ingress |
| POST | `/payments/checkout` | Start M-Pesa + ILP checkout |
| GET | `/payments/:id` | Payment status |
| POST | `/accounts` | Create profile + Rafiki wallet |
| POST | `/mpesa/callback` | Daraja STK callback |

## Operations

### Reconciliation

```sh
pnpm reconcile
```

Compares funded payments against successful M-Pesa callbacks.

### STK timeouts

Payments in `awaiting_mpesa` longer than `STK_TIMEOUT_MS` are cancelled via Rafiki `cancelOutgoingPayment`.

### Production deployment

| Component | Suggested target |
|-----------|------------------|
| Rafiki | Docker / [Helm charts](rafiki/infrastructure/helm) |
| NexusPay API | Railway, Fly.io, ECS |
| Web | Vercel |
| Database | Supabase cloud |

Use TLS for `WEBHOOK_URL` and `MPESA_CALLBACK_URL`. Store secrets in a vault; never commit `.env`.

## Phase 2 (deferred)

- Full marketplace UI from mockups (5 countries, cart, escrow tracker)
- MTN, Airtel, bank rails
- Cross-border Rafiki peers (UG, TZ, ET, SD)

## License

Application code: proprietary. Rafiki: see [rafiki/LICENSE](rafiki/LICENSE).
