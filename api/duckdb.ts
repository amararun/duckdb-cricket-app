import type { VercelRequest, VercelResponse } from '@vercel/node'

// Backend API configuration - these are SECRET, only in Vercel env vars
const BACKEND_URL = process.env.DUCKDB_BACKEND_URL || 'https://duckdb-cricket-backend.tigzig.com'
const BACKEND_API_KEY = process.env.DUCKDB_BACKEND_API_KEY || ''

// CORS headers
function setCors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
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

      // ============== Admin endpoints ==============
      case 'admin-files':
        backendUrl = `${BACKEND_URL}/api/v1/admin/files`
        break

      case 'admin-preview': {
        const previewFile = req.query.filename as string
        if (!previewFile) {
          return res.status(400).json({ error: 'Missing filename parameter' })
        }
        backendUrl = `${BACKEND_URL}/api/v1/admin/files/${encodeURIComponent(previewFile)}/preview`
        break
      }

      case 'admin-delete': {
        if (req.method !== 'DELETE') {
          return res.status(405).json({ error: 'DELETE required' })
        }
        const deleteFile = req.query.filename as string
        if (!deleteFile) {
          return res.status(400).json({ error: 'Missing filename parameter' })
        }
        backendUrl = `${BACKEND_URL}/api/v1/admin/files/${encodeURIComponent(deleteFile)}`
        method = 'DELETE'
        break
      }

      case 'admin-rename': {
        if (req.method !== 'PUT') {
          return res.status(405).json({ error: 'PUT required' })
        }
        const renameFile = req.query.filename as string
        if (!renameFile) {
          return res.status(400).json({ error: 'Missing filename parameter' })
        }
        backendUrl = `${BACKEND_URL}/api/v1/admin/files/${encodeURIComponent(renameFile)}/rename`
        method = 'PUT'
        body = JSON.stringify(req.body)
        break
      }

      case 'admin-refresh': {
        if (req.method !== 'POST') {
          return res.status(405).json({ error: 'POST required' })
        }
        const refreshFile = req.query.filename as string
        if (!refreshFile) {
          return res.status(400).json({ error: 'Missing filename parameter' })
        }
        backendUrl = `${BACKEND_URL}/api/v1/admin/files/${encodeURIComponent(refreshFile)}/refresh-metadata`
        method = 'POST'
        break
      }

      case 'admin-download': {
        const downloadFile = req.query.filename as string
        if (!downloadFile) {
          return res.status(400).json({ error: 'Missing filename parameter' })
        }
        const downloadUrl = `${BACKEND_URL}/api/v1/admin/files/${encodeURIComponent(downloadFile)}/download`
        const downloadResponse = await fetch(downloadUrl, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${BACKEND_API_KEY}` },
        })
        if (!downloadResponse.ok) {
          const error = await downloadResponse.json().catch(() => ({ error: 'Download failed' }))
          return res.status(downloadResponse.status).json(error)
        }
        res.setHeader('Content-Type', 'application/octet-stream')
        res.setHeader('Content-Disposition', `attachment; filename="${downloadFile}"`)
        const arrayBuffer = await downloadResponse.arrayBuffer()
        return res.send(Buffer.from(arrayBuffer))
      }

      // ============== Table-level operations ==============
      case 'admin-table-rename': {
        if (req.method !== 'PUT') {
          return res.status(405).json({ error: 'PUT required' })
        }
        const tableRenameFile = req.query.filename as string
        const tableRenameTable = req.query.table as string
        if (!tableRenameFile || !tableRenameTable) {
          return res.status(400).json({ error: 'Missing filename or table parameter' })
        }
        backendUrl = `${BACKEND_URL}/api/v1/admin/files/${encodeURIComponent(tableRenameFile)}/tables/${encodeURIComponent(tableRenameTable)}/rename`
        method = 'PUT'
        body = JSON.stringify(req.body)
        break
      }

      case 'admin-table-delete': {
        if (req.method !== 'DELETE') {
          return res.status(405).json({ error: 'DELETE required' })
        }
        const tableDeleteFile = req.query.filename as string
        const tableDeleteTable = req.query.table as string
        if (!tableDeleteFile || !tableDeleteTable) {
          return res.status(400).json({ error: 'Missing filename or table parameter' })
        }
        backendUrl = `${BACKEND_URL}/api/v1/admin/files/${encodeURIComponent(tableDeleteFile)}/tables/${encodeURIComponent(tableDeleteTable)}`
        method = 'DELETE'
        break
      }

      case 'admin-upload': {
        if (req.method !== 'POST') {
          return res.status(405).json({ error: 'POST required for upload' })
        }
        // For file uploads, we need to forward the raw body with the correct content-type
        // Vercel parses multipart forms, so we need to reconstruct the FormData
        const contentType = req.headers['content-type'] || ''
        if (!contentType.includes('multipart/form-data')) {
          return res.status(400).json({ error: 'Content-Type must be multipart/form-data' })
        }

        // Get the file and custom_name from parsed body
        const uploadBody = req.body as { file?: { filepath?: string; originalFilename?: string; mimetype?: string; size?: number }; custom_name?: string } | undefined

        // Vercel doesn't parse multipart by default in the same way
        // We need to use a different approach - forward the raw request
        const uploadUrl = `${BACKEND_URL}/api/v1/admin/files/upload`

        // For Vercel, we'll need to read the raw body and forward it
        // Since Vercel already parsed it, let's try a simpler approach with form data reconstruction
        // Actually, for this to work properly we need the raw body

        // Forward raw request body with original content-type
        const uploadResponse = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${BACKEND_API_KEY}`,
            'Content-Type': contentType,
          },
          // @ts-ignore - req.body may be buffer for multipart
          body: req.body,
          // Vercel keeps raw body for multipart when not JSON
          duplex: 'half',
        } as RequestInit)

        const uploadData = await uploadResponse.json()
        if (!uploadResponse.ok) {
          return res.status(uploadResponse.status).json(uploadData)
        }
        return res.status(200).json(uploadData)
      }

      // ============== Direct Upload Token ==============
      case 'admin-upload-token': {
        if (req.method !== 'POST') {
          return res.status(405).json({ error: 'POST required for upload-token' })
        }
        backendUrl = `${BACKEND_URL}/api/v1/admin/upload-token`
        method = 'POST'
        body = JSON.stringify(req.body)
        break
      }

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
