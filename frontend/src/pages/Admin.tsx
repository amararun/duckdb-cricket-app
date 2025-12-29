import { useState, useEffect } from 'react'
import {
  getAdminFiles,
  getAdminFilePreview,
  deleteAdminFile,
  renameAdminFile,
  refreshAdminFileMetadata,
  getAdminFileDownloadUrl,
  AdminFile,
  AdminPreviewResponse
} from '../services/api'
import {
  Loader2,
  Database,
  Trash2,
  Download,
  Eye,
  Edit2,
  RefreshCw,
  X,
  HardDrive,
  Table,
  Clock
} from 'lucide-react'

export function Admin() {
  const [files, setFiles] = useState<AdminFile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Preview modal
  const [previewData, setPreviewData] = useState<AdminPreviewResponse | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  // Rename modal
  const [renameFile, setRenameFile] = useState<AdminFile | null>(null)
  const [newFileName, setNewFileName] = useState('')

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<AdminFile | null>(null)

  async function fetchFiles() {
    setLoading(true)
    setError(null)
    try {
      const response = await getAdminFiles()
      setFiles(response.files)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load files')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFiles()
  }, [])

  async function handlePreview(file: AdminFile) {
    setPreviewLoading(true)
    try {
      const data = await getAdminFilePreview(file.name)
      setPreviewData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load preview')
    } finally {
      setPreviewLoading(false)
    }
  }

  async function handleDelete(file: AdminFile) {
    setActionLoading(file.name)
    try {
      await deleteAdminFile(file.name)
      setDeleteConfirm(null)
      await fetchFiles()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete file')
    } finally {
      setActionLoading(null)
    }
  }

  async function handleRename() {
    if (!renameFile || !newFileName.trim()) return
    setActionLoading(renameFile.name)
    try {
      await renameAdminFile(renameFile.name, newFileName.trim())
      setRenameFile(null)
      setNewFileName('')
      await fetchFiles()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rename file')
    } finally {
      setActionLoading(null)
    }
  }

  async function handleRefresh(file: AdminFile) {
    setActionLoading(file.name)
    try {
      await refreshAdminFileMetadata(file.name)
      await fetchFiles()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh metadata')
    } finally {
      setActionLoading(null)
    }
  }

  function formatNumber(num: number): string {
    return num.toLocaleString()
  }

  function formatDate(dateStr: string): string {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <main className="flex-1 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Database className="h-7 w-7 text-indigo-600" />
            <h1 className="text-2xl font-bold text-slate-800">Admin - File Management</h1>
          </div>
          <button
            onClick={fetchFiles}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Error display */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            <span className="ml-3 text-slate-600">Loading files...</span>
          </div>
        )}

        {/* Files table */}
        {!loading && files.length > 0 && (
          <div className="bg-white rounded-lg shadow border border-slate-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-bold text-slate-700">File Name</th>
                  <th className="text-right px-4 py-3 text-sm font-bold text-slate-700">Size</th>
                  <th className="text-right px-4 py-3 text-sm font-bold text-slate-700">Rows</th>
                  <th className="text-left px-4 py-3 text-sm font-bold text-slate-700">Tables</th>
                  <th className="text-left px-4 py-3 text-sm font-bold text-slate-700">Updated</th>
                  <th className="text-center px-4 py-3 text-sm font-bold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {files.map((file) => (
                  <tr key={file.name} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <HardDrive className="h-4 w-4 text-indigo-500" />
                        <span className="font-medium text-slate-800">{file.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {file.size_mb.toFixed(2)} MB
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {formatNumber(file.row_count)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Table className="h-4 w-4 text-slate-400" />
                        <span className="text-slate-600">{file.tables.join(', ') || '-'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-sm text-slate-500">
                        <Clock className="h-3 w-3" />
                        {formatDate(file.updated_at)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        {/* Preview */}
                        <button
                          onClick={() => handlePreview(file)}
                          disabled={actionLoading === file.name}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                          title="Preview"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {/* Download */}
                        <a
                          href={getAdminFileDownloadUrl(file.name)}
                          className="p-1.5 text-slate-500 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                          title="Download"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                        {/* Rename */}
                        <button
                          onClick={() => {
                            setRenameFile(file)
                            setNewFileName(file.name.replace('.duckdb', ''))
                          }}
                          disabled={actionLoading === file.name}
                          className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                          title="Rename"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        {/* Refresh metadata */}
                        <button
                          onClick={() => handleRefresh(file)}
                          disabled={actionLoading === file.name}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Refresh metadata"
                        >
                          <RefreshCw className={`h-4 w-4 ${actionLoading === file.name ? 'animate-spin' : ''}`} />
                        </button>
                        {/* Delete */}
                        <button
                          onClick={() => setDeleteConfirm(file)}
                          disabled={actionLoading === file.name}
                          className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Empty state */}
        {!loading && files.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
            <HardDrive className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600">No DuckDB files found</p>
          </div>
        )}

        {/* Preview Modal */}
        {(previewData || previewLoading) && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
                <h2 className="font-bold text-slate-800">
                  Preview: {previewData?.filename || 'Loading...'}
                </h2>
                <button
                  onClick={() => setPreviewData(null)}
                  className="p-1 hover:bg-slate-200 rounded transition-colors"
                >
                  <X className="h-5 w-5 text-slate-600" />
                </button>
              </div>
              <div className="p-4 overflow-auto max-h-[calc(80vh-60px)]">
                {previewLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                    <span className="ml-2 text-slate-600">Loading preview...</span>
                  </div>
                ) : previewData && (
                  <div className="space-y-6">
                    {Object.entries(previewData.tables).map(([tableName, tableData]) => (
                      <div key={tableName}>
                        <h3 className="font-semibold text-slate-700 mb-2 flex items-center gap-2">
                          <Table className="h-4 w-4 text-indigo-500" />
                          {tableName}
                          <span className="text-sm font-normal text-slate-500">
                            ({tableData.row_count} sample rows)
                          </span>
                        </h3>
                        <div className="overflow-x-auto border border-slate-200 rounded">
                          <table className="w-full text-sm">
                            <thead className="bg-slate-100">
                              <tr>
                                {tableData.columns.map((col) => (
                                  <th key={col} className="px-3 py-2 text-left font-medium text-slate-700 whitespace-nowrap">
                                    {col}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {tableData.rows.map((row, i) => (
                                <tr key={i} className="border-t border-slate-100">
                                  {row.map((cell, j) => (
                                    <td key={j} className="px-3 py-2 text-slate-600 whitespace-nowrap">
                                      {cell === null ? <span className="text-slate-400 italic">null</span> : String(cell)}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Rename Modal */}
        {renameFile && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
                <h2 className="font-bold text-slate-800">Rename File</h2>
                <button
                  onClick={() => setRenameFile(null)}
                  className="p-1 hover:bg-slate-200 rounded transition-colors"
                >
                  <X className="h-5 w-5 text-slate-600" />
                </button>
              </div>
              <div className="p-4">
                <p className="text-sm text-slate-600 mb-3">
                  Current name: <span className="font-medium">{renameFile.name}</span>
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newFileName}
                    onChange={(e) => setNewFileName(e.target.value)}
                    placeholder="New file name"
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-slate-500">.duckdb</span>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <button
                    onClick={() => setRenameFile(null)}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRename}
                    disabled={!newFileName.trim() || actionLoading === renameFile.name}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                  >
                    {actionLoading === renameFile.name && <Loader2 className="h-4 w-4 animate-spin" />}
                    Rename
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-red-50">
                <h2 className="font-bold text-red-800">Confirm Delete</h2>
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="p-1 hover:bg-red-100 rounded transition-colors"
                >
                  <X className="h-5 w-5 text-red-600" />
                </button>
              </div>
              <div className="p-4">
                <p className="text-slate-700 mb-2">
                  Are you sure you want to delete this file?
                </p>
                <p className="text-sm text-slate-600 bg-slate-100 px-3 py-2 rounded font-mono">
                  {deleteConfirm.name}
                </p>
                <p className="text-sm text-red-600 mt-3">
                  This action cannot be undone.
                </p>
                <div className="flex justify-end gap-2 mt-4">
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDelete(deleteConfirm)}
                    disabled={actionLoading === deleteConfirm.name}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                  >
                    {actionLoading === deleteConfirm.name && <Loader2 className="h-4 w-4 animate-spin" />}
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
