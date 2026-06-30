import { existsSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const nextDir = join(process.cwd(), '.next')

if (existsSync(join(nextDir, 'BUILD_ID'))) {
  console.log('[nexuspay] Clearing production .next cache before dev...')
  rmSync(nextDir, { recursive: true, force: true })
}
