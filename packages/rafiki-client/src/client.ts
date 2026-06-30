import { createHmac } from 'node:crypto'
import { canonicalize } from 'json-canonicalize'

export interface RafikiClientConfig {
  graphqlUrl: string
  tenantId: string
  apiSecret: string
  signatureVersion?: string
}

export interface GraphQLRequest {
  query: string
  variables?: Record<string, unknown>
  operationName?: string
}

export interface GraphQLResponse<T> {
  data?: T
  errors?: Array<{ message: string }>
}

export function signRequest(
  request: GraphQLRequest,
  secret: string,
  signatureVersion = '1'
): { signature: string; timestamp: number } {
  const timestamp = Date.now()
  const formattedRequest = {
    variables: request.variables ?? {},
    operationName: request.operationName ?? null,
    query: request.query
  }
  const payload = `${timestamp}.${canonicalize(formattedRequest)}`
  const digest = createHmac('sha256', secret).update(payload).digest('hex')
  return {
    timestamp,
    signature: `t=${timestamp}, v${signatureVersion}=${digest}`
  }
}

export class RafikiGraphQLClient {
  constructor(private readonly config: RafikiClientConfig) {}

  async request<T>(
    request: GraphQLRequest,
    overrides?: Partial<Pick<RafikiClientConfig, 'tenantId' | 'apiSecret'>>
  ): Promise<T> {
    const tenantId = overrides?.tenantId ?? this.config.tenantId
    const apiSecret = overrides?.apiSecret ?? this.config.apiSecret
    const { signature } = signRequest(
      request,
      apiSecret,
      this.config.signatureVersion ?? '1'
    )

    const response = await fetch(this.config.graphqlUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        signature,
        'tenant-id': tenantId
      },
      body: JSON.stringify(request)
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Rafiki GraphQL HTTP ${response.status}: ${text}`)
    }

    const body = (await response.json()) as GraphQLResponse<T>
    if (body.errors?.length) {
      throw new Error(
        `Rafiki GraphQL errors: ${body.errors.map((e) => e.message).join(', ')}`
      )
    }
    if (!body.data) {
      throw new Error('Rafiki GraphQL response missing data')
    }
    return body.data
  }
}
