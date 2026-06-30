# Hackathon demo script — NexusPay

**Stack:** Local web (`http://localhost:3015`) → Vercel API (`https://nexus-pay-ilp-api.vercel.app`) → Daraja sandbox M-Pesa.

**Positioning:** NexusPay is **Open Payments infrastructure**. Payment Gateway is the **first product**.

---

## Pre-demo checklist (run tonight)

### 1. Environment

`apps/web/.env.local`:

```env
NEXT_PUBLIC_API_URL=https://nexus-pay-ilp-api.vercel.app
```

Vercel API must have:

- `MPESA_CALLBACK_URL=https://nexus-pay-ilp-api.vercel.app/providers/mpesa/callback`
- `MPESA_ENVIRONMENT=sandbox`
- Daraja sandbox keys registered in the [Daraja portal](https://developer.safaricom.co.ke/)

### 2. Uganda merchant (for cross-border story)

After signing up, run in Supabase SQL Editor (replace `YOUR_USER_ID`):

```sql
-- Link merchant to Uganda for demo narrative
UPDATE merchants
SET
  business_name = 'Savana Traders Uganda',
  country = 'UG',
  settlement_currency = 'UGX'
WHERE email = 'your-merchant@email.com';

-- Ensure merchant_users link exists (bootstrap should create this)
SELECT m.business_name, m.country, m.settlement_currency, mu.user_id
FROM merchants m
JOIN merchant_users mu ON mu.merchant_id = m.id
WHERE mu.user_id = 'YOUR_USER_ID';
```

### 3. Demo payment link

1. Sign in at `http://localhost:3015/login`
2. Go to **Payment Links** → Create link:
   - **Title:** `5 Tonnes Maize — Cross-Border Order`
   - **Amount:** KES 50,000 (or your demo amount)
   - **Currency:** KES
3. Copy URL: `http://localhost:3015/pay/{publicId}`
4. Test STK: enter sandbox phone → approve PIN → confirm success screen
5. Confirm payment appears on `/merchant/payments` (auto-refreshes every 5s)

### 4. Bookmark these tabs

| Tab | URL |
|-----|-----|
| Landing | `http://localhost:3015/` |
| Payment link | `http://localhost:3015/pay/{publicId}` |
| Merchant payments | `http://localhost:3015/merchant/payments` |
| Exchange rates | `http://localhost:3015/merchant/exchange-rates` |
| API keys | `http://localhost:3015/merchant/developers` |

### 5. Start servers

```powershell
pnpm dev:web
```

(API runs on Vercel — no local API needed for demo.)

---

## Slide-by-slide script

| Slide | Say | Show |
|-------|-----|------|
| **1 Hook** | Maize farmer in Uganda, buyer in Kenya — transaction fails because rails don't connect | Landing hero `/` |
| **2 Problem** | Fragmented rails: M-Pesa, MTN, Airtel work locally, break at border | Scroll to **Problem** section |
| **3 Solution** | Open Payments infrastructure — one API, local rails | **Features** + hero subhead |
| **4 How it works** | Buyer → M-Pesa → NexusPay → Open Payments → Merchant → Settlement | **How it works** section |
| **5 Why Interledger** | Open Payments quotes, settlement, webhooks — we connect providers | **Why Interledger** section |
| **6 Demo** | Kenya buyer pays Ugandan merchant on a digital marketplace | **Live demo** (below) |
| **7 Market** | Start cross-border commerce → expand to payroll, NGOs, B2B | **Market** section |
| **8 Business model** | Transaction fees, enterprise APIs, settlement, analytics | **Business model** section |
| **9 Why we win** | Stripe/Flutterwave built on cards; we connect local ecosystems | **Why we win** section |
| **10 Vision** | Internet connected information; Interledger connects value | Footer + product still open |

---

## Slide 6 — Live demo (60–90 seconds)

1. **Narrate:** "A buyer in Kenya purchases maize from a Ugandan seller on a digital marketplace."
2. **Show** pre-opened payment link tab — merchant name, cross-border FX hint, M-Pesa field.
3. **Enter** Daraja sandbox test number (e.g. `254708374149`).
4. **Tap Pay** → approve STK on your phone.
5. **Success screen** — receipt + download invoice.
6. **Switch tab** to `/merchant/payments` — payment appears within 5 seconds.
7. **Close:** "One API connected M-Pesa to cross-border commerce — that's the infrastructure layer."

### If a judge asks "Where is Savana?"

> "Savana is the marketplace customer. NexusPay is the infrastructure they integrate via API — any platform embeds this hosted checkout with one integration."

---

## Fallback lines

| Issue | What to say |
|-------|-------------|
| STK doesn't arrive | "Sandbox can be slow — here's the payment we completed in rehearsal" (show completed payment in dashboard) |
| Callback delayed | "M-Pesa callbacks are async; the merchant dashboard polls in real time" |
| Bootstrap error | Sign out, sign in again; refresh `/merchant` |
| API down | Use landing + slides; explain architecture from **How it works** |

---

## Daraja sandbox test numbers

Use numbers from your [Daraja sandbox](https://developer.safaricom.co.ke/) test credentials. Common pattern: `2547XXXXXXXX` with PIN from sandbox docs.

---

## After hackathon

- Commit hackathon UI changes
- Redeploy Vercel API if `payment-links` merchant country fields were updated
- Consider enabling Uganda in signup UI for production onboarding
