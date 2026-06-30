import type { PaymentMethod } from '@nexuspay/shared'
import type { PaymentProvider } from './types.js'
import { MpesaProvider } from './mpesa-provider.js'
import { AirtelProvider } from './airtel-provider.js'
import { CardProvider } from './card-provider.js'
import { BankProvider } from './bank-provider.js'
import type { AppConfig } from '../../config.js'
import type { FastifyBaseLogger } from 'fastify'

export class ProviderRegistry {
  private readonly providers = new Map<PaymentMethod, PaymentProvider>()

  constructor(config: AppConfig, log: FastifyBaseLogger) {
    this.providers.set('mpesa', new MpesaProvider(config, log))
    this.providers.set('airtel', new AirtelProvider())
    this.providers.set('card', new CardProvider())
    this.providers.set('bank', new BankProvider())
  }

  get(method: PaymentMethod): PaymentProvider {
    const provider = this.providers.get(method)
    if (!provider) throw new Error(`Unsupported payment method: ${method}`)
    return provider
  }
}
