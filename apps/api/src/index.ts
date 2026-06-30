import { startServer } from './app.js'

startServer().catch((err) => {
  console.error(err)
  process.exit(1)
})
