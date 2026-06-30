import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getApp } from '../dist/app.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const app = await getApp()
  await app.ready()
  app.server.emit('request', req, res)
}

export const config = {
  api: {
    bodyParser: false
  }
}
