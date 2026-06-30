import { randomUUID } from 'node:crypto'
import { createRafikiAdminClient } from '@nexuspay/rafiki-client'

const graphqlUrl =
  process.env.RAFIKI_GRAPHQL_URL ?? 'http://localhost:3001/graphql'
const operatorTenantId = process.env.RAFIKI_OPERATOR_TENANT_ID
const operatorSecret = process.env.RAFIKI_OPERATOR_API_SECRET
const tenantPublicName = process.env.RAFIKI_TENANT_PUBLIC_NAME ?? 'NexusPay Kenya'
const tenantApiSecret =
  process.env.RAFIKI_TENANT_API_SECRET ?? randomUUID().replace(/-/g, '')
const walletAddressPrefix =
  process.env.RAFIKI_WALLET_ADDRESS_PREFIX ?? 'http://localhost:3000'
const webhookUrl =
  process.env.RAFIKI_WEBHOOK_URL ?? 'http://localhost:3000/webhooks'
const idpConsentUrl =
  process.env.RAFIKI_IDP_CONSENT_URL ?? 'http://localhost:3010/consent'
const idpSecret = process.env.RAFIKI_IDP_SECRET ?? randomUUID()

async function main() {
  if (!operatorSecret) {
    throw new Error('RAFIKI_OPERATOR_API_SECRET is required for seeding')
  }

  const operatorClient = createRafikiAdminClient({
    graphqlUrl,
    tenantId: operatorTenantId ?? '00000000-0000-0000-0000-000000000001',
    apiSecret: operatorSecret,
    signatureVersion: '1'
  })

  let kesAsset = await operatorClient.getAssetByCodeAndScale('KES', 2)
  if (!kesAsset) {
    kesAsset = await operatorClient.createAsset('KES', 2, 0)
    await operatorClient.depositAssetLiquidity(
      kesAsset.id,
      '100000000',
      randomUUID()
    )
    console.log('Created KES asset:', kesAsset.id)
  } else {
    console.log('KES asset exists:', kesAsset.id)
  }

  const tenant = await operatorClient.createTenant({
    publicName: tenantPublicName,
    apiSecret: tenantApiSecret,
    idpConsentUrl,
    idpSecret,
    walletAddressPrefix,
    webhookUrl,
    id: process.env.RAFIKI_TENANT_ID
  })

  const tenantClient = createRafikiAdminClient({
    graphqlUrl,
    tenantId: tenant.id,
    apiSecret: tenant.apiSecret,
    signatureVersion: '1'
  })

  for (const account of [
    { path: 'accounts/test-buyer', name: 'Test Buyer' },
    { path: 'accounts/test-seller', name: 'Test Seller' }
  ]) {
    const url = new URL(account.path, `${walletAddressPrefix}/`).toString()
    try {
      const wallet = await tenantClient.createWalletAddress({
        assetId: kesAsset.id,
        publicName: account.name,
        url
      })
      console.log(`Wallet ${account.path}:`, wallet.id, wallet.url ?? url)
    } catch (err) {
      console.warn(`Wallet ${account.path} may already exist:`, err)
    }
  }

  console.log('\n--- Rafiki seed complete ---')
  console.log('RAFIKI_TENANT_ID=', tenant.id)
  console.log('RAFIKI_API_SECRET=', tenant.apiSecret)
  console.log('RAFIKI_KES_ASSET_ID=', kesAsset.id)
  console.log('RAFIKI_WALLET_ADDRESS_PREFIX=', walletAddressPrefix)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
