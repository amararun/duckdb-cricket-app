import type { VercelRequest, VercelResponse } from '@vercel/node'

// Backend API configuration - these are SECRET, only in Vercel env vars
const BACKEND_URL = process.env.DUCKDB_BACKEND_URL || 'https://duckdb-cricket-backend.tigzig.com'
const BACKEND_API_KEY = process.env.DUCKDB_BACKEND_API_KEY || ''

// CORS headers
function setCors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('=== DUCKDB API HIT ===')
  console.log('URL:', req.url)
  console.log('Method:', req.method)
  console.log('Query:', JSON.stringify(req.query))
  console.log('BACKEND_URL:', BACKEND_URL)
  console.log('API_KEY exists:', !!BACKEND_API_KEY)
  console.log('======================')

  // Handle CORS preflight
  setCors(res)
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  // Get the action from query param
  const action = req.query.action as string

  if (!action) {
    return res.status(400).json({ error: 'Missing action parameter' })
  }

  if (!BACKEND_API_KEY) {
    console.error('DUCKDB_BACKEND_API_KEY not configured')
    return res.status(500).json({ error: 'Server configuration error', debug: { backendUrl: BACKEND_URL } })
  }

  try {
    let backendUrl: string
    let method: string = 'GET'
    let body: string | undefined

    switch (action) {
      case 'tables':
        backendUrl = `${BACKEND_URL}/api/v1/tables`
        break

      case 'schema':
        const tableName = req.query.table as string
        if (!tableName) {
          return res.status(400).json({ error: 'Missing table parameter' })
        }
        backendUrl = `${BACKEND_URL}/api/v1/schema/${tableName}`
        break

      case 'query':
        if (req.method !== 'POST') {
          return res.status(405).json({ error: 'POST required for query' })
        }
        backendUrl = `${BACKEND_URL}/api/v1/query`
        method = 'POST'
        body = JSON.stringify(req.body)
        break

      default:
        return res.status(400).json({ error: `Unknown action: ${action}` })
    }

    // Forward request to backend with secret API key
    const backendResponse = await fetch(backendUrl, {
      method,
      headers: {
        'Authorization': `Bearer ${BACKEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body,
    })

    const data = await backendResponse.json()

    if (!backendResponse.ok) {
      return res.status(backendResponse.status).json(data)
    }

    return res.status(200).json(data)

  } catch (error) {
    console.error('Proxy error:', error)
    return res.status(500).json({ error: 'Failed to connect to backend' })
  }
}
