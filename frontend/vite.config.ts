import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // Load env from parent directory (where .env.local is)
  const env = loadEnv(mode, process.cwd() + '/..', '')

  const backendUrl = env.DUCKDB_BACKEND_URL || 'https://duckdb-cricket-backend.tigzig.com'
  const apiKey = env.DUCKDB_BACKEND_API_KEY || ''

  return {
    plugins: [react()],
    server: {
      port: 4200,
      strictPort: false,
      proxy: {
        // Local dev: proxy /api/duckdb to simulate the serverless function
        '/api/duckdb': {
          target: backendUrl,
          changeOrigin: true,
          rewrite: (path) => {
            // Parse query params from the path
            const url = new URL(path, 'http://localhost')
            const action = url.searchParams.get('action')
            const table = url.searchParams.get('table')
            const filename = url.searchParams.get('filename')

            if (action === 'tables') return '/api/v1/tables'
            if (action === 'schema' && table) return `/api/v1/schema/${table}`
            if (action === 'query') return '/api/v1/query'
            // Admin endpoints
            if (action === 'admin-files') return '/api/v1/admin/files'
            if (action === 'admin-preview' && filename) return `/api/v1/admin/files/${filename}/preview`
            if (action === 'admin-delete' && filename) return `/api/v1/admin/files/${filename}`
            if (action === 'admin-rename' && filename) return `/api/v1/admin/files/${filename}/rename`
            if (action === 'admin-refresh' && filename) return `/api/v1/admin/files/${filename}/refresh-metadata`
            if (action === 'admin-download' && filename) return `/api/v1/admin/files/${filename}/download`
            // Table-level operations
            const tableName = url.searchParams.get('table')
            if (action === 'admin-table-rename' && filename && tableName) return `/api/v1/admin/files/${filename}/tables/${tableName}/rename`
            if (action === 'admin-table-delete' && filename && tableName) return `/api/v1/admin/files/${filename}/tables/${tableName}`
            // Upload
            if (action === 'admin-upload') return '/api/v1/admin/files/upload'
            return path
          },
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              // Add the API key header for local dev
              if (apiKey) {
                proxyReq.setHeader('Authorization', `Bearer ${apiKey}`)
              }
            })
          }
        },
        // Simple test endpoint for local dev
        '/api/test': {
          target: 'http://localhost:4200',
          bypass: (_req, res) => {
            if (res) {
              res.writeHead(200, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({
                message: 'Test API route works! (local dev)',
                timestamp: new Date().toISOString(),
                envCheck: {
                  backendUrl: backendUrl ? 'configured' : 'missing',
                  apiKey: apiKey ? 'configured' : 'missing'
                }
              }))
            }
            return false
          }
        }
      }
    }
  }
})
