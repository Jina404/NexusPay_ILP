import { createHmac } from 'node:crypto'
import { canonicalize } from 'json-canonicalize'

function getSignatureParts(signature: string) {
  const signatureParts = signature.split(', ')
  const timestamp = signatureParts[0]?.split('=')[1]
  const signatureVersionAndDigest = signatureParts[1]?.split('=') ?? []
  const version = signatureVersionAndDigest[0]?.replace('v', '')
  const digest = signatureVersionAndDigest[1]
  return { timestamp, version, digest }
}

export function verifyWebhookSignature(
  signature: string,
  body: unknown,
  expectedVersion: number,
  secret: string
): boolean {
  const { version, digest, timestamp } = getSignatureParts(signature)
  if (!timestamp || !digest || Number(version) !== expectedVersion) {
    return false
  }
  const payload = `${timestamp}.${canonicalize(body)}`
  const computed = createHmac('sha256', secret).update(payload).digest('hex')
  return computed === digest
}
