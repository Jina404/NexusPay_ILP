/**
 * Verifies Supabase env keys without printing secrets.
 * Run: node scripts/verify-supabase.mjs
 */

import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

function loadEnvFile(path) {
  if (!existsSync(path)) return
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const value = trimmed.slice(eq + 1).trim()
    if (!(key in process.env)) process.env[key] = value
  }
}

loadEnvFile(resolve(__dirname, '../.env'))
loadEnvFile(resolve(__dirname, '../apps/web/.env.local'))

function decodeJwtRef(token) {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString())
    return { ref: payload.ref, role: payload.role, validShape: true }
  } catch {
    return { ref: null, role: null, validShape: false }
  }
}

function isPlaceholder(value) {
  if (!value) return true
  return (
    value.includes('your-') ||
    value.includes('your-project') ||
    value === 'your-anon-key' ||
    value === 'your-service-role-key'
  )
}

const url = process.env.SUPABASE_URL?.replace(/\/$/, '')
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const service = process.env.SUPABASE_SERVICE_ROLE_KEY
const webUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '')

console.log('=== NexusPay Supabase check ===\n')

console.log('Root .env')
console.log('  SUPABASE_URL:', url || '(missing)')
console.log('  SUPABASE_SERVICE_ROLE_KEY:', isPlaceholder(service) ? 'PLACEHOLDER or missing' : 'set')
console.log('  NEXT_PUBLIC_SUPABASE_ANON_KEY:', isPlaceholder(anon) ? 'PLACEHOLDER or missing' : 'set')

console.log('\napps/web/.env.local')
console.log('  NEXT_PUBLIC_SUPABASE_URL:', webUrl || '(missing)')
const webAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
console.log('  NEXT_PUBLIC_SUPABASE_ANON_KEY:', isPlaceholder(webAnon) ? 'PLACEHOLDER or missing' : 'set')

if (url && webUrl && url !== webUrl) {
  console.log('\n⚠ URL mismatch between root .env and apps/web/.env.local')
}

const anonMeta = anon ? decodeJwtRef(anon) : null
const svcMeta = service ? decodeJwtRef(service) : null

if (anonMeta) {
  console.log('\nAnon key JWT claims project ref:', anonMeta.ref || '(invalid token)')
}
if (svcMeta) {
  console.log('Service key JWT claims project ref:', svcMeta.ref || '(invalid token)')
}

const expectedRef = 'psqjqxsxjeiduuyhkcgt'
console.log('\nExpected project ref:', expectedRef)

if (anonMeta?.ref && anonMeta.ref !== expectedRef) {
  console.log('⚠ Anon key is for a DIFFERENT project:', anonMeta.ref)
}
if (svcMeta?.ref && svcMeta.ref !== expectedRef) {
  console.log('⚠ Service key is for a DIFFERENT project:', svcMeta.ref)
}

async function probe(label, key) {
  if (!url || !key || isPlaceholder(key)) {
    console.log(`  ${label}: skipped (no key)`)
    return false
  }

  const headers = { apikey: key, Authorization: `Bearer ${key}` }

  const authRes = await fetch(`${url}/auth/v1/health`, { headers })
  const restRes = await fetch(`${url}/rest/v1/`, { headers })
  const storageRes = await fetch(`${url}/storage/v1/bucket`, { headers })

  const authBody = await authRes.text()
  const storageBody = await storageRes.text()

  console.log(`  ${label} auth:`, authRes.status, authRes.ok ? 'OK' : authBody.slice(0, 80))
  console.log(`  ${label} rest:`, restRes.status, restRes.ok || restRes.status === 401 ? 'reachable' : 'failed')
  console.log(`  ${label} storage:`, storageRes.status, storageRes.ok ? 'OK' : storageBody.slice(0, 80))

  return authRes.ok && (storageRes.ok || storageRes.status === 200)
}

console.log('\nLive API probes:')
const anonOk = await probe('anon', anon)
const svcOk = await probe('service', service)

console.log('\n=== Result ===')
if (!url || isPlaceholder(anon) || isPlaceholder(service)) {
  console.log('Keys are missing or still placeholders. Copy real keys from:')
  console.log('https://supabase.com/dashboard/project/psqjqxsxjeiduuyhkcgt/settings/api')
} else if (!anonOk && !svcOk) {
  console.log('Keys are present but REJECTED by Supabase (Invalid signature).')
  console.log('They may be outdated, copied wrong, or not from this project.')
  console.log('Open Settings → API and paste fresh anon + service_role keys.')
} else if (!svcOk) {
  console.log('Anon key works but service_role key failed — re-copy service_role from dashboard.')
} else {
  console.log('Connected to project', expectedRef)
  console.log('Storage is empty until you create a bucket (e.g. brand-assets) in the dashboard.')
}
