import type { VercelRequest, VercelResponse } from '@vercel/node'

const BACKEND_URL = process.env.DUCKDB_BACKEND_URL || 'https://duckdb-dashboards-backend.tigzig.com'
const API_KEY = process.env.DUCKDB_API_KEY || ''

function setCors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()

  const action = req.query.action as string
  if (!action) return res.status(400).json({ error: 'Missing action parameter' })
  if (!API_KEY) return res.status(500).json({ error: 'Server configuration error' })

  // Map action to filename
  const fileMap: Record<string, string> = {
    'cricket-query': 'cricket.duckdb',
    'imdb-query': 'imdb.duckdb',
  }

  const filename = fileMap[action]
  if (!filename) return res.status(400).json({ error: `Unknown action: ${action}` })
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST required' })

  try {
    const response = await fetch(`${BACKEND_URL}/api/query/${filename}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    })

    const data = await response.json()
    return res.status(response.status).json(data)
  } catch (error) {
    return res.status(500).json({ error: 'Failed to connect to backend' })
  }
}
