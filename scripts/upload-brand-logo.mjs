/**
 * One-time upload of NexusPay logo to Supabase Storage.
 *
 * Bucket: brand-assets
 * Path:   logo/logo.png
 *
 * Run from repo root (requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env):
 *   node scripts/upload-brand-logo.mjs
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

const baseUrl = process.env.SUPABASE_URL?.replace(/\/$/, '')
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const bucket = 'brand-assets'
const objectPath = 'logo/logo.png'
const localLogo = resolve(__dirname, '../apps/web/public/logo.png')

if (!baseUrl || !serviceKey) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env')
  process.exit(1)
}

const authHeaders = {
  Authorization: `Bearer ${serviceKey}`,
  apikey: serviceKey
}

async function ensureBucket() {
  const listRes = await fetch(`${baseUrl}/storage/v1/bucket`, { headers: authHeaders })
  if (!listRes.ok) {
    throw new Error(`list buckets failed: ${listRes.status} ${await listRes.text()}`)
  }

  const buckets = await listRes.json()
  if (buckets.some((b) => b.id === bucket || b.name === bucket)) return

  const createRes = await fetch(`${baseUrl}/storage/v1/bucket`, {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: bucket,
      name: bucket,
      public: true,
      file_size_limit: 5 * 1024 * 1024,
      allowed_mime_types: ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
    })
  })

  if (!createRes.ok) {
    throw new Error(`create bucket failed: ${createRes.status} ${await createRes.text()}`)
  }

  console.log(`Created bucket "${bucket}"`)
}

async function uploadLogo() {
  const file = readFileSync(localLogo)

  const uploadRes = await fetch(
    `${baseUrl}/storage/v1/object/${bucket}/${objectPath}`,
    {
      method: 'POST',
      headers: {
        ...authHeaders,
        'Content-Type': 'image/png',
        'x-upsert': 'true',
        'Cache-Control': 'max-age=31536000'
      },
      body: file
    }
  )

  if (!uploadRes.ok) {
    throw new Error(`upload failed: ${uploadRes.status} ${await uploadRes.text()}`)
  }
}

try {
  await ensureBucket()
  await uploadLogo()

  const publicUrl = `${baseUrl}/storage/v1/object/public/${bucket}/${objectPath}`
  console.log('Uploaded:', `${bucket}/${objectPath}`)
  console.log('Public URL:', publicUrl)
  console.log('')
  console.log('Optional — add to apps/web/.env.local:')
  console.log(`NEXT_PUBLIC_BRAND_LOGO_URL=${publicUrl}`)
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}
