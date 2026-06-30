import { RafikiGraphQLClient } from './client.js'

export interface AmountInput {
  value: string
  assetCode: string
  assetScale: number
}

export interface Asset {
  id: string
  code: string
  scale: number
}

export interface WalletAddress {
  id: string
  address: string
  url: string
  publicName?: string | null
}

export interface IncomingPayment {
  id: string
  url: string
  state?: string
  walletAddressId?: string
}

export interface Quote {
  id: string
  walletAddressId: string
  receiver: string
  debitAmount: AmountInput
  receiveAmount: AmountInput
}

export interface OutgoingPayment {
  id: string
  state: string
  walletAddressId: string
  debitAmount: AmountInput
  receiveAmount: AmountInput
  sentAmount?: AmountInput
  receiver: string
}

export interface Tenant {
  id: string
  apiSecret: string
  publicName: string
}

const CREATE_ASSET = `
  mutation CreateAsset($input: CreateAssetInput!) {
    createAsset(input: $input) {
      asset { id code scale }
    }
  }
`

const DEPOSIT_ASSET_LIQUIDITY = `
  mutation DepositAssetLiquidity($input: DepositAssetLiquidityInput!) {
    depositAssetLiquidity(input: $input) { success }
  }
`

const CREATE_TENANT = `
  mutation CreateTenant($input: CreateTenantInput!) {
    createTenant(input: $input) {
      tenant { id apiSecret publicName }
    }
  }
`

const CREATE_WALLET_ADDRESS = `
  mutation CreateWalletAddress($input: CreateWalletAddressInput!) {
    createWalletAddress(input: $input) {
      walletAddress { id address url publicName }
    }
  }
`

const CREATE_INCOMING_PAYMENT = `
  mutation CreateIncomingPayment($input: CreateIncomingPaymentInput!) {
    createIncomingPayment(input: $input) {
      payment { id url state walletAddressId }
    }
  }
`

const CREATE_QUOTE = `
  mutation CreateQuote($input: CreateQuoteInput!) {
    createQuote(input: $input) {
      quote {
        id walletAddressId receiver
        debitAmount { value assetCode assetScale }
        receiveAmount { value assetCode assetScale }
      }
    }
  }
`

const CREATE_OUTGOING_PAYMENT = `
  mutation CreateOutgoingPayment($input: CreateOutgoingPaymentInput!) {
    createOutgoingPayment(input: $input) {
      payment {
        id state walletAddressId receiver
        debitAmount { value assetCode assetScale }
        receiveAmount { value assetCode assetScale }
        sentAmount { value assetCode assetScale }
      }
    }
  }
`

const DEPOSIT_OUTGOING_PAYMENT_LIQUIDITY = `
  mutation DepositOutgoingPaymentLiquidity($input: DepositOutgoingPaymentLiquidityInput!) {
    depositOutgoingPaymentLiquidity(input: $input) { success }
  }
`

const CANCEL_OUTGOING_PAYMENT = `
  mutation CancelOutgoingPayment($input: CancelOutgoingPaymentInput!) {
    cancelOutgoingPayment(input: $input) {
      payment { id state }
    }
  }
`

const CREATE_INCOMING_PAYMENT_WITHDRAWAL = `
  mutation CreateIncomingPaymentWithdrawal($input: CreateIncomingPaymentWithdrawalInput!) {
    createIncomingPaymentWithdrawal(input: $input) { success }
  }
`

const GET_ASSET = `
  query GetAsset($code: String!, $scale: UInt8!) {
    asset(code: $code, scale: $scale) { id code scale }
  }
`

const GET_OUTGOING_PAYMENT = `
  query GetOutgoingPayment($id: String!) {
    outgoingPayment(id: $id) {
      id state walletAddressId
      debitAmount { value assetCode assetScale }
      sentAmount { value assetCode assetScale }
    }
  }
`

export class RafikiAdminClient {
  constructor(private readonly client: RafikiGraphQLClient) {}

  async getAssetByCodeAndScale(
    code: string,
    scale: number
  ): Promise<Asset | null> {
    const data = await this.client.request<{
      asset: Asset | null
    }>({
      query: GET_ASSET,
      variables: { code, scale },
      operationName: 'GetAsset'
    })
    return data.asset
  }

  async createAsset(
    code: string,
    scale: number,
    withdrawalThreshold = 0
  ): Promise<Asset> {
    const data = await this.client.request<{
      createAsset: { asset: Asset }
    }>({
      query: CREATE_ASSET,
      variables: { input: { code, scale, withdrawalThreshold } },
      operationName: 'CreateAsset'
    })
    return data.createAsset.asset
  }

  async depositAssetLiquidity(
    assetId: string,
    amount: string,
    idempotencyKey: string
  ): Promise<boolean> {
    const data = await this.client.request<{
      depositAssetLiquidity: { success: boolean }
    }>({
      query: DEPOSIT_ASSET_LIQUIDITY,
      variables: { input: { assetId, amount, idempotencyKey } },
      operationName: 'DepositAssetLiquidity'
    })
    return data.depositAssetLiquidity.success
  }

  async createTenant(input: {
    publicName: string
    apiSecret: string
    idpConsentUrl: string
    idpSecret: string
    walletAddressPrefix: string
    webhookUrl: string
    id?: string
  }): Promise<Tenant> {
    const data = await this.client.request<{
      createTenant: { tenant: Tenant }
    }>({
      query: CREATE_TENANT,
      variables: { input },
      operationName: 'CreateTenant'
    })
    return data.createTenant.tenant
  }

  async createWalletAddress(input: {
    assetId: string
    publicName: string
    url: string
  }): Promise<WalletAddress> {
    const data = await this.client.request<{
      createWalletAddress: { walletAddress: WalletAddress }
    }>({
      query: CREATE_WALLET_ADDRESS,
      variables: { input },
      operationName: 'CreateWalletAddress'
    })
    return data.createWalletAddress.walletAddress
  }

  async createIncomingPayment(input: {
    walletAddressId: string
    incomingAmount: AmountInput
    expiresAt?: string
    metadata?: Record<string, unknown>
  }): Promise<IncomingPayment> {
    const data = await this.client.request<{
      createIncomingPayment: { payment: IncomingPayment }
    }>({
      query: CREATE_INCOMING_PAYMENT,
      variables: { input },
      operationName: 'CreateIncomingPayment'
    })
    return data.createIncomingPayment.payment
  }

  async createQuote(input: {
    walletAddressId: string
    receiver: string
    receiveAmount?: AmountInput
    debitAmount?: AmountInput
  }): Promise<Quote> {
    const data = await this.client.request<{
      createQuote: { quote: Quote }
    }>({
      query: CREATE_QUOTE,
      variables: { input },
      operationName: 'CreateQuote'
    })
    return data.createQuote.quote
  }

  async createOutgoingPayment(input: {
    walletAddressId: string
    quoteId: string
    metadata?: Record<string, unknown>
  }): Promise<OutgoingPayment> {
    const data = await this.client.request<{
      createOutgoingPayment: { payment: OutgoingPayment }
    }>({
      query: CREATE_OUTGOING_PAYMENT,
      variables: { input },
      operationName: 'CreateOutgoingPayment'
    })
    return data.createOutgoingPayment.payment
  }

  async depositOutgoingPaymentLiquidity(input: {
    outgoingPaymentId: string
    idempotencyKey: string
    dataToTransmit?: string
  }): Promise<boolean> {
    const data = await this.client.request<{
      depositOutgoingPaymentLiquidity: { success: boolean }
    }>({
      query: DEPOSIT_OUTGOING_PAYMENT_LIQUIDITY,
      variables: { input },
      operationName: 'DepositOutgoingPaymentLiquidity'
    })
    return data.depositOutgoingPaymentLiquidity.success
  }

  async cancelOutgoingPayment(
    id: string,
    reason: string
  ): Promise<OutgoingPayment> {
    const data = await this.client.request<{
      cancelOutgoingPayment: { payment: OutgoingPayment }
    }>({
      query: CANCEL_OUTGOING_PAYMENT,
      variables: { input: { id, reason } },
      operationName: 'CancelOutgoingPayment'
    })
    return data.cancelOutgoingPayment.payment
  }

  async createIncomingPaymentWithdrawal(input: {
    incomingPaymentId: string
    idempotencyKey: string
    timeoutSeconds?: number
  }): Promise<boolean> {
    const data = await this.client.request<{
      createIncomingPaymentWithdrawal: { success: boolean }
    }>({
      query: CREATE_INCOMING_PAYMENT_WITHDRAWAL,
      variables: { input },
      operationName: 'CreateIncomingPaymentWithdrawal'
    })
    return data.createIncomingPaymentWithdrawal.success
  }

  async getOutgoingPayment(id: string): Promise<OutgoingPayment> {
    const data = await this.client.request<{
      outgoingPayment: OutgoingPayment
    }>({
      query: GET_OUTGOING_PAYMENT,
      variables: { id },
      operationName: 'GetOutgoingPayment'
    })
    return data.outgoingPayment
  }
}

export function createRafikiAdminClient(
  config: ConstructorParameters<typeof RafikiGraphQLClient>[0]
): RafikiAdminClient {
  return new RafikiAdminClient(new RafikiGraphQLClient(config))
}
