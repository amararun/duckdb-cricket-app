import type { VercelRequest, VercelResponse } from '@vercel/node'

// Backend API configuration - stored in Vercel env vars
const BACKEND_URL = process.env.DUCKDB_BACKEND_URL || 'https://duckdb-dashboards-backend.tigzig.com'
const API_KEY = process.env.DUCKDB_API_KEY || ''

// CORS headers
function setCors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  setCors(res)
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const action = req.query.action as string

  if (!action) {
    return res.status(400).json({ error: 'Missing action parameter' })
  }

  if (!API_KEY) {
    console.error('DUCKDB_API_KEY not configured')
    return res.status(500).json({ error: 'Server configuration error' })
  }

  try {
    let backendUrl: string
    let method: string = 'GET'
    let body: string | undefined

    switch (action) {
      // Query endpoints - POST /api/query/{filename}
      case 'cricket-query':
        if (req.method !== 'POST') {
          return res.status(405).json({ error: 'POST required for query' })
        }
        backendUrl = `${BACKEND_URL}/api/query/cricket.duckdb`
        method = 'POST'
        body = JSON.stringify(req.body)
        break

      case 'imdb-query':
        if (req.method !== 'POST') {
          return res.status(405).json({ error: 'POST required for query' })
        }
        backendUrl = `${BACKEND_URL}/api/query/imdb.duckdb`
        method = 'POST'
        body = JSON.stringify(req.body)
        break

      // Tables endpoint - GET /api/tables/{filename}
      case 'cricket-tables':
        backendUrl = `${BACKEND_URL}/api/tables/cricket.duckdb`
        break

      case 'imdb-tables':
        backendUrl = `${BACKEND_URL}/api/tables/imdb.duckdb`
        break

      // Schema endpoint - GET /api/schema/{filename}/{table}
      case 'cricket-schema': {
        const tableName = req.query.table as string
        if (!tableName) {
          return res.status(400).json({ error: 'Missing table parameter' })
        }
        backendUrl = `${BACKEND_URL}/api/schema/cricket.duckdb/${tableName}`
        break
      }

      case 'imdb-schema': {
        const tableName = req.query.table as string
        if (!tableName) {
          return res.status(400).json({ error: 'Missing table parameter' })
        }
        backendUrl = `${BACKEND_URL}/api/schema/imdb.duckdb/${tableName}`
        break
      }

      default:
        return res.status(400).json({ error: `Unknown action: ${action}` })
    }

    // Forward request to backend
    const backendResponse = await fetch(backendUrl, {
      method,
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
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
