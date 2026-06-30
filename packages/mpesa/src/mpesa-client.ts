import { DarajaHttpClient } from './client.js'
import type { MpesaConfig, StkPushInput, StkPushResult, StkQueryResult } from './types.js'

export class MpesaClient extends DarajaHttpClient {
  constructor(config: MpesaConfig) {
    super(config)
  }

  async stkPush(input: StkPushInput): Promise<StkPushResult> {
    const phone = this.normalizePhone(input.phone)
    const { password, timestamp } = this.lipaPassword()

    const data = await this.postJson<Record<string, string>>(
      '/mpesa/stkpush/v1/processrequest',
      {
        BusinessShortCode: this.config.shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: Math.round(input.amount),
        PartyA: phone,
        PartyB: this.config.shortcode,
        PhoneNumber: phone,
        CallBackURL: this.config.callbackUrl,
        AccountReference: input.accountReference.slice(0, 12),
        TransactionDesc: input.transactionDesc.slice(0, 13)
      }
    )

    return {
      merchantRequestId: data.MerchantRequestID,
      checkoutRequestId: data.CheckoutRequestID,
      responseCode: data.ResponseCode,
      responseDescription: data.ResponseDescription,
      customerMessage: data.CustomerMessage
    }
  }

  async stkPushQuery(checkoutRequestId: string): Promise<StkQueryResult> {
    const { password, timestamp } = this.lipaPassword()
    const data = await this.postJson<Record<string, string>>(
      '/mpesa/stkpushquery/v1/query',
      {
        BusinessShortCode: this.config.shortcode,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestId
      }
    )

    return {
      responseCode: data.ResponseCode,
      responseDescription: data.ResponseDescription,
      merchantRequestId: data.MerchantRequestID,
      checkoutRequestId: data.CheckoutRequestID,
      resultCode: data.ResultCode,
      resultDesc: data.ResultDesc
    }
  }

  async transactionStatusQuery(input: {
    transactionId: string
    identifierType?: string
    remarks?: string
    occasion?: string
  }) {
    return this.postJson('/mpesa/transactionstatus/v1/query', {
      Initiator: this.config.initiatorName,
      SecurityCredential: this.config.securityCredential,
      CommandID: 'TransactionStatusQuery',
      TransactionID: input.transactionId,
      PartyA: this.config.shortcode,
      IdentifierType: input.identifierType ?? '4',
      ResultURL: this.config.b2cResultUrl,
      QueueTimeOutURL: this.config.b2cResultUrl,
      Remarks: input.remarks ?? 'Status',
      Occasion: input.occasion ?? 'Query'
    })
  }

  async accountBalanceQuery(input?: { remarks?: string }) {
    return this.postJson('/mpesa/accountbalance/v1/query', {
      Initiator: this.config.initiatorName,
      SecurityCredential: this.config.securityCredential,
      CommandID: 'AccountBalance',
      PartyA: this.config.shortcode,
      IdentifierType: '4',
      Remarks: input?.remarks ?? 'Balance',
      QueueTimeOutURL: this.config.b2cResultUrl,
      ResultURL: this.config.b2cResultUrl
    })
  }

  async b2cPayment(input: {
    phone: string
    amount: number
    remarks?: string
    occasion?: string
  }) {
    const phone = this.normalizePhone(input.phone)
    return this.postJson('/mpesa/b2c/v1/paymentrequest', {
      InitiatorName: this.config.initiatorName,
      SecurityCredential: this.config.securityCredential,
      CommandID: 'BusinessPayment',
      Amount: Math.round(input.amount),
      PartyA: this.config.b2cShortcode ?? this.config.shortcode,
      PartyB: phone,
      Remarks: input.remarks ?? 'Payout',
      QueueTimeOutURL: this.config.b2cResultUrl,
      ResultURL: this.config.b2cResultUrl,
      Occasion: input.occasion ?? 'Payout'
    })
  }

  async b2bPayment(input: {
    receiverShortcode: string
    amount: number
    accountReference: string
    remarks?: string
  }) {
    return this.postJson('/mpesa/b2b/v1/paymentrequest', {
      Initiator: this.config.initiatorName,
      SecurityCredential: this.config.securityCredential,
      CommandID: 'BusinessPayBill',
      SenderIdentifierType: '4',
      RecieverIdentifierType: '4',
      Amount: Math.round(input.amount),
      PartyA: this.config.shortcode,
      PartyB: input.receiverShortcode,
      AccountReference: input.accountReference.slice(0, 13),
      Requester: this.config.initiatorName,
      Remarks: input.remarks ?? 'B2B',
      QueueTimeOutURL: this.config.b2bResultUrl,
      ResultURL: this.config.b2bResultUrl
    })
  }

  async reversal(input: {
    transactionId: string
    amount: number
    receiverParty: string
    remarks?: string
  }) {
    return this.postJson('/mpesa/reversal/v1/request', {
      Initiator: this.config.initiatorName,
      SecurityCredential: this.config.securityCredential,
      CommandID: 'TransactionReversal',
      TransactionID: input.transactionId,
      Amount: Math.round(input.amount),
      ReceiverParty: input.receiverParty,
      RecieverIdentifierType: '11',
      ResultURL: this.config.reversalResultUrl,
      QueueTimeOutURL: this.config.reversalResultUrl,
      Remarks: input.remarks ?? 'Reversal',
      Occasion: 'Reversal'
    })
  }

  async c2bRegisterUrl(version: 'v1' | 'v2' = 'v2') {
    const path =
      version === 'v2' ? '/mpesa/c2b/v2/registerurl' : '/mpesa/c2b/v1/registerurl'
    return this.postJson(path, {
      ShortCode: this.config.shortcode,
      ResponseType: 'Completed',
      ConfirmationURL: this.config.confirmationUrl,
      ValidationURL: this.config.validationUrl
    })
  }

  async dynamicQrCode(input: {
    merchantName: string
    refNo: string
    amount: number
    trxCode?: 'BG' | 'PB' | 'SM' | 'SB'
  }) {
    return this.postJson('/mpesa/qrcode/v1/generate', {
      MerchantName: input.merchantName.slice(0, 20),
      RefNo: input.refNo.slice(0, 12),
      Amount: Math.round(input.amount),
      TrxCode: input.trxCode ?? 'PB',
      CPI: this.config.shortcode,
      Size: '300'
    })
  }

  async billManagerOptIn(input: { email: string; phone: string; storeName: string }) {
    return this.postJson(
      '/v1/billmanager-invoice/v1/billmanager-invoice/optin',
      {
        email: input.email,
        phone: this.normalizePhone(input.phone),
        storeName: input.storeName
      }
    )
  }

  async billManagerSingleInvoice(input: Record<string, unknown>) {
    return this.postJson(
      '/v1/billmanager-invoice/v1/billmanager-invoice/single-invoicing',
      input
    )
  }
}

export function createMpesaClient(config: MpesaConfig): MpesaClient {
  return new MpesaClient(config)
}
