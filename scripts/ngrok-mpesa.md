# M-Pesa Daraja local testing with ngrok

Safaricom must reach your STK callback over **HTTPS**. Use ngrok while developing on localhost.

## Steps

1. Start the API:

```powershell
pnpm --filter @nexuspay/api dev
```

2. In another terminal, start ngrok:

```powershell
ngrok http 3000
```

3. Copy the `https://....ngrok-free.app` URL.

4. Update root [`.env`](../.env):

```env
API_PUBLIC_URL=https://YOUR-NGROK-HOST.ngrok-free.app
MPESA_CALLBACK_URL=https://YOUR-NGROK-HOST.ngrok-free.app/providers/mpesa/callback
```

5. Register **the exact** `MPESA_CALLBACK_URL` in the [Daraja portal](https://developer.safaricom.co.ke/) under **M-PESA EXPRESS** (Lipa na M-Pesa Online).

6. For production keys, set:

```env
MPESA_ENVIRONMENT=production
MPESA_CONSUMER_KEY=<from Daraja>
MPESA_CONSUMER_SECRET=<from Daraja>
MPESA_PASSKEY=<Lipa na M-Pesa passkey>
MPESA_SHORTCODE=<your PayBill or Till>
```

7. Restart the API after changing `.env`.

8. Test: open a payment link, enter phone, approve STK on your handset.

## Callback paths

| Path | Used for |
|------|----------|
| `/providers/mpesa/callback` | Gateway STK (payment links, checkout) |
| `/mpesa/callback` | Legacy marketplace flow |

## Troubleshooting

- **No STK prompt**: check consumer key/secret, shortcode, passkey, and `MPESA_ENVIRONMENT`.
- **STK sent but payment stuck**: verify ngrok URL matches Daraja portal and `MPESA_CALLBACK_URL`.
- **Callback 404**: API must be running; ngrok must point to port `3000`.
