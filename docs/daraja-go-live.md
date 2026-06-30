# Daraja production go-live checklist

Use this checklist when moving from ngrok local testing to a production HTTPS API host.

## Prerequisites

- [ ] Production app approved on [Safaricom Daraja](https://developer.safaricom.co.ke/)
- [ ] Lipa na M-Pesa Online (STK Push) product enabled
- [ ] Production consumer key, consumer secret, passkey, and shortcode obtained
- [ ] API deployed to HTTPS (e.g. `https://api.nexuspay.africa`)

## Environment

Set on the production API host:

```env
MPESA_ENVIRONMENT=production
MPESA_CONSUMER_KEY=<production-key>
MPESA_CONSUMER_SECRET=<production-secret>
MPESA_PASSKEY=<lipa-na-mpesa-passkey>
MPESA_SHORTCODE=<paybill-or-till>
MPESA_CALLBACK_URL=https://api.nexuspay.africa/providers/mpesa/callback
API_PUBLIC_URL=https://api.nexuspay.africa
```

For B2C payouts (optional, Phase 3):

```env
MPESA_INITIATOR_NAME=<initiator>
MPESA_SECURITY_CREDENTIAL=<encrypted-credential>
MPESA_B2C_SHORTCODE=<shortcode>
MPESA_B2C_RESULT_URL=https://api.nexuspay.africa/providers/mpesa/b2c/result
MPESA_B2B_RESULT_URL=https://api.nexuspay.africa/providers/mpesa/b2b/result
MPESA_REVERSAL_RESULT_URL=https://api.nexuspay.africa/providers/mpesa/reversal/result
MPESA_VALIDATION_URL=https://api.nexuspay.africa/providers/mpesa/c2b/validation
MPESA_CONFIRMATION_URL=https://api.nexuspay.africa/providers/mpesa/c2b/confirmation
```

## Daraja portal URLs

Register these exact callback URLs in the Daraja portal:

| Product | URL |
|---------|-----|
| M-PESA EXPRESS (STK) | `https://api.nexuspay.africa/providers/mpesa/callback` |
| B2C result | `https://api.nexuspay.africa/providers/mpesa/b2c/result` |
| B2B result | `https://api.nexuspay.africa/providers/mpesa/b2b/result` |
| Reversal result | `https://api.nexuspay.africa/providers/mpesa/reversal/result` |
| C2B validation | `https://api.nexuspay.africa/providers/mpesa/c2b/validation` |
| C2B confirmation | `https://api.nexuspay.africa/providers/mpesa/c2b/confirmation` |

Legacy marketplace STK (if still used): `/mpesa/callback`

## Database

Run pending Supabase migrations in order:

1. `20250631000000_payment_links.sql`
2. `20250701000000_payment_invoices.sql`

## End-to-end verification

1. [ ] Create a payment link with a fixed KES amount
2. [ ] Open hosted checkout `/pay/{publicId}`
3. [ ] Enter a real M-Pesa phone number and pay
4. [ ] STK prompt appears on handset — enter PIN only
5. [ ] Payment status becomes `completed` in merchant dashboard
6. [ ] M-Pesa receipt appears in payment metadata
7. [ ] Merchant wallet balance updates
8. [ ] Buyer can download receipt PDF from success screen
9. [ ] Invoice appears on **Payments → Invoices** in merchant dashboard
10. [ ] If callback is delayed, STK Push Query watcher completes payment within ~2 minutes

## Local testing (before production)

See [scripts/ngrok-mpesa.md](../scripts/ngrok-mpesa.md):

```powershell
pnpm --filter @nexuspay/api dev
ngrok http 3000
```

Update `.env` with ngrok HTTPS URL for `MPESA_CALLBACK_URL` and `API_PUBLIC_URL`.

## Troubleshooting

| Symptom | Check |
|---------|--------|
| No STK prompt | Consumer key/secret, shortcode, passkey, `MPESA_ENVIRONMENT` |
| STK sent, payment stuck | Callback URL matches Daraja portal exactly; API reachable over HTTPS |
| Callback 404 | API running; URL path is `/providers/mpesa/callback` |
| Payment times out | `STK_TIMEOUT_MS` (default 120s); watcher logs in API |
| Invoice missing | Payment must be `completed`; run `20250701000000_payment_invoices.sql` |
| B2C payout pending | `MPESA_INITIATOR_NAME` + `MPESA_SECURITY_CREDENTIAL`; B2C result URL registered |

## Merchant onboarding (summary)

Share with merchants:

1. Register on NexusPay and complete KYC
2. Create payment links with amounts
3. Share `/pay/{link}` with customers
4. Customers pay via M-Pesa STK (PIN on phone)
5. View transactions and download invoices from the dashboard
