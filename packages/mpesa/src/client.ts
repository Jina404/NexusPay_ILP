import type { MpesaConfig } from './types.js'
import { BASE_URLS } from './types.js'

export class DarajaHttpClient {
  private token?: { value: string; expiresAt: number }

  constructor(protected readonly config: MpesaConfig) {}

  protected get baseUrl(): string {
    return BASE_URLS[this.config.environment]
  }

  async getAccessToken(): Promise<string> {
    if (this.token && Date.now() < this.token.expiresAt - 60_000) {
      return this.token.value
    }

    const credentials = Buffer.from(
      `${this.config.consumerKey}:${this.config.consumerSecret}`
    ).toString('base64')

    const response = await fetch(
      `${this.baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
      { headers: { Authorization: `Basic ${credentials}` } }
    )

    if (!response.ok) {
      throw new Error(`Daraja OAuth failed: ${response.status}`)
    }

    const data = (await response.json()) as { access_token: string; expires_in: string }
    this.token = {
      value: data.access_token,
      expiresAt: Date.now() + Number(data.expires_in) * 1000
    }
    return this.token.value
  }

  normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, '')
    if (digits.startsWith('254')) return digits
    if (digits.startsWith('0')) return `254${digits.slice(1)}`
    if (digits.length === 9) return `254${digits}`
    return digits
  }

  protected lipaPassword(): { password: string; timestamp: string } {
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14)
    const data = `${this.config.shortcode}${this.config.passkey}${timestamp}`
    return { password: Buffer.from(data).toString('base64'), timestamp }
  }

  protected async postJson<T>(path: string, body: Record<string, unknown>): Promise<T> {
    const token = await this.getAccessToken()
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })
    const data = (await response.json()) as T & Record<string, string>
    if (!response.ok) {
      throw new Error(
        `Daraja ${path} failed: ${(data as Record<string, string>).errorMessage ?? JSON.stringify(data)}`
      )
    }
    return data
  }
}
