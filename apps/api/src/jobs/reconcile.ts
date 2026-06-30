import { loadConfig } from '../config.js'
import { createSupabase } from '../db.js'
import { ReconciliationEngine } from '../modules/reconciliation/service.js'

async function main() {
  const config = loadConfig()
  const db = createSupabase(config)
  const engine = new ReconciliationEngine(db)
  const mismatches = await engine.run()

  if (!mismatches.length) {
    console.log('Reconciliation OK — no mismatches')
    return
  }

  console.log(`Reconciliation found ${mismatches.length} mismatch(es):`)
  for (const m of mismatches) {
    console.log(`- [${m.category}] ${m.entityId}: ${m.detail}`)
  }
  process.exit(1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
