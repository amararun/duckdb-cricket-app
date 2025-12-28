import type { VercelRequest, VercelResponse } from '@vercel/node'

export default function handler(req: VercelRequest, res: VercelResponse) {
  console.log('=== TEST API HIT ===')
  console.log('URL:', req.url)
  console.log('Method:', req.method)
  console.log('Env BACKEND_URL:', process.env.DUCKDB_BACKEND_URL ? 'SET' : 'NOT SET')
  console.log('Env API_KEY:', process.env.DUCKDB_BACKEND_API_KEY ? 'SET' : 'NOT SET')
  console.log('====================')

  return res.status(200).json({
    message: 'Test API route works!',
    timestamp: new Date().toISOString(),
    envCheck: {
      backendUrl: process.env.DUCKDB_BACKEND_URL ? 'configured' : 'missing',
      apiKey: process.env.DUCKDB_BACKEND_API_KEY ? 'configured' : 'missing'
    }
  })
}
