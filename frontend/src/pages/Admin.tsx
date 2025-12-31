import React, { useState, useEffect } from 'react'
import {
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
  useClerk,
  useUser
} from '@clerk/clerk-react'
import {
  getAdminFiles,
  getAdminFilePreview,
  deleteAdminFile,
  renameAdminFile,
  refreshAdminFileMetadata,
  getAdminFileDownloadUrl,
  renameAdminTable,
  deleteAdminTable,
  uploadAdminFile,
  AdminFile,
  AdminPreviewResponse,
  AdminPreviewTable,
  UploadProgress
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
  Clock,
  ChevronDown,
  ChevronRight,
  Upload,
  LogIn,
  LogOut,
  Shield
} from 'lucide-react'

// Access is controlled via Clerk Dashboard:
// 1. Go to Clerk Dashboard → Users → Select user
// 2. Scroll to "User metadata" → Edit "Public"
// 3. Add: { "role": "admin" }
// 4. Save - user now has admin access

export function Admin() {
  const { signOut } = useClerk()
  const { user, isLoaded } = useUser()

  // Check if user has admin role in their publicMetadata (set via Clerk Dashboard)
  const isAdmin = user?.publicMetadata?.role === 'admin'
  const [files, setFiles] = useState<AdminFile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Expanded state for databases
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set())

  // Preview modal
  const [previewData, setPreviewData] = useState<AdminPreviewResponse | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewTableFilter, setPreviewTableFilter] = useState<string | null>(null)

  // Rename modal
  const [renameFile, setRenameFile] = useState<AdminFile | null>(null)
  const [newFileName, setNewFileName] = useState('')

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<AdminFile | null>(null)

  // Table rename modal
  const [renameTableInfo, setRenameTableInfo] = useState<{ file: AdminFile; tableName: string } | null>(null)
  const [newTableName, setNewTableName] = useState('')

  // Table delete confirmation
  const [deleteTableInfo, setDeleteTableInfo] = useState<{ file: AdminFile; tableName: string } | null>(null)

  // Upload modal
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadCustomName, setUploadCustomName] = useState('')
  const [uploadInProgress, setUploadInProgress] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  async function fetchFiles() {
    setLoading(true)
    setError(null)
    try {
      const response = await getAdminFiles()
      setFiles(response.files)
      // Auto-expand all files
      setExpandedFiles(new Set(response.files.map(f => f.name)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load files')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFiles()
  }, [])

  // Escape key handler to close all modals
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (showUploadModal) {
          setShowUploadModal(false)
          setUploadFile(null)
          setUploadCustomName('')
        } else if (previewData) {
          setPreviewData(null)
          setPreviewTableFilter(null)
        } else if (renameFile) {
          setRenameFile(null)
        } else if (deleteConfirm) {
          setDeleteConfirm(null)
        } else if (renameTableInfo) {
          setRenameTableInfo(null)
        } else if (deleteTableInfo) {
          setDeleteTableInfo(null)
        }
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [showUploadModal, previewData, renameFile, deleteConfirm, renameTableInfo, deleteTableInfo])

  function toggleExpand(filename: string) {
    setExpandedFiles(prev => {
      const next = new Set(prev)
      if (next.has(filename)) {
        next.delete(filename)
      } else {
        next.add(filename)
      }
      return next
    })
  }

  async function handlePreview(file: AdminFile, tableFilter?: string) {
    setPreviewLoading(true)
    setPreviewTableFilter(tableFilter || null)
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

  async function handleTableRename() {
    if (!renameTableInfo || !newTableName.trim()) return
    setActionLoading(`${renameTableInfo.file.name}-${renameTableInfo.tableName}`)
    try {
      await renameAdminTable(renameTableInfo.file.name, renameTableInfo.tableName, newTableName.trim())
      setRenameTableInfo(null)
      setNewTableName('')
      await fetchFiles()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rename table')
    } finally {
      setActionLoading(null)
    }
  }

  async function handleTableDelete() {
    if (!deleteTableInfo) return
    setActionLoading(`${deleteTableInfo.file.name}-${deleteTableInfo.tableName}`)
    try {
      await deleteAdminTable(deleteTableInfo.file.name, deleteTableInfo.tableName)
      setDeleteTableInfo(null)
      await fetchFiles()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete table')
    } finally {
      setActionLoading(null)
    }
  }

  async function handleUpload() {
    if (!uploadFile) return
    setUploadInProgress(true)
    setUploadProgress(null)
    setUploadError(null)
    try {
      await uploadAdminFile(
        uploadFile,
        uploadCustomName || undefined,
        (progress) => setUploadProgress(progress)
      )
      setShowUploadModal(false)
      setUploadFile(null)
      setUploadCustomName('')
      setUploadProgress(null)
      setUploadError(null)
      await fetchFiles()
    } catch (err) {
      // Show error inside the modal, not behind it
      setUploadError(err instanceof Error ? err.message : 'Failed to upload file')
    } finally {
      setUploadInProgress(false)
    }
  }

  const MAX_FILE_SIZE = 500 * 1024 * 1024 // 500MB limit (direct upload bypasses Vercel limit)

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > MAX_FILE_SIZE) {
        setError(`File too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)} MB.`)
        return
      }
      setUploadFile(file)
      // Pre-fill custom name from filename (without extension)
      const nameWithoutExt = file.name.replace(/\.duckdb$/i, '')
      setUploadCustomName(nameWithoutExt)
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

  // Filter preview data if a specific table is requested
  function getFilteredPreviewTables(): Record<string, AdminPreviewTable> | null {
    if (!previewData) return null
    if (!previewTableFilter) return previewData.tables
    const filtered: Record<string, AdminPreviewTable> = {}
    if (previewData.tables[previewTableFilter]) {
      filtered[previewTableFilter] = previewData.tables[previewTableFilter]
    }
    return filtered
  }

  return (
    <main className="flex-1 p-6">
      {/* Sign-in required message for unauthenticated users */}
      <SignedOut>
        <div className="max-w-md mx-auto mt-20">
          <div className="bg-white rounded-lg shadow-lg border border-slate-200 p-8 text-center">
            <Shield className="h-16 w-16 text-indigo-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-slate-800 mb-2">Admin Access Required</h1>
            <p className="text-slate-600 mb-6">
              Please sign in to access the Admin file management area.
            </p>
            <SignInButton mode="modal">
              <button className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors mx-auto font-medium">
                <LogIn className="h-5 w-5" />
                Sign In
              </button>
            </SignInButton>
          </div>
        </div>
      </SignedOut>

      {/* Admin content for authenticated users */}
      <SignedIn>
      {/* Check if user has admin role (set via Clerk Dashboard → User → Public Metadata) */}
      {isLoaded && user && !isAdmin ? (
        // Unauthorized user - show access denied
        <div className="max-w-md mx-auto mt-20">
          <div className="bg-white rounded-lg shadow-lg border border-red-200 p-8 text-center">
            <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-slate-800 mb-2">Access Denied</h1>
            <p className="text-slate-600 mb-2">
              You are signed in as:
            </p>
            <p className="font-medium text-slate-800 mb-4">
              {user.primaryEmailAddress?.emailAddress}
            </p>
            <p className="text-slate-600 mb-6">
              This email is not authorized to access the Admin area. Please contact the administrator if you believe this is an error.
            </p>
            <button
              onClick={() => signOut({ redirectUrl: '/admin' })}
              className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors mx-auto font-medium"
            >
              <LogOut className="h-5 w-5" />
              Sign Out
            </button>
          </div>
        </div>
      ) : (
      <div className="max-w-6xl mx-auto">
        {/* User info bar */}
        <div className="flex items-center justify-end gap-3 mb-4 text-sm">
          <span className="text-slate-600">
            Signed in as <span className="font-medium text-slate-800">{user?.primaryEmailAddress?.emailAddress}</span>
          </span>
          <UserButton afterSignOutUrl="/admin" />
          <button
            onClick={() => signOut({ redirectUrl: '/admin' })}
            className="flex items-center gap-1 px-3 py-1.5 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Database className="h-7 w-7 text-indigo-600" />
            <h1 className="text-2xl font-bold text-slate-800">Admin - File Management</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Upload className="h-4 w-4" />
              Upload
            </button>
            <button
              onClick={fetchFiles}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
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
            <span className="ml-3 text-slate-700">Loading files...</span>
          </div>
        )}

        {/* Files table with expandable rows */}
        {!loading && files.length > 0 && (
          <div className="bg-white rounded-lg shadow border border-slate-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-100 border-b border-slate-300">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-bold text-slate-800 w-8"></th>
                  <th className="text-left px-4 py-3 text-sm font-bold text-slate-800">Name</th>
                  <th className="text-right px-4 py-3 text-sm font-bold text-slate-800">Size</th>
                  <th className="text-right px-4 py-3 text-sm font-bold text-slate-800">Rows</th>
                  <th className="text-left px-4 py-3 text-sm font-bold text-slate-800">Updated</th>
                  <th className="text-center px-4 py-3 text-sm font-bold text-slate-800">Actions</th>
                </tr>
              </thead>
              <tbody>
                {files.map((file, fileIndex) => {
                  const isExpanded = expandedFiles.has(file.name)
                  const hasTables = file.tables && file.tables.length > 0

                  return (
                    <React.Fragment key={file.name}>
                      {/* Database row */}
                      <tr
                        className={`border-b border-slate-200 hover:bg-slate-50 ${fileIndex > 0 ? 'border-t-2 border-t-slate-300' : ''}`}
                      >
                        <td className="px-4 py-3">
                          {hasTables && (
                            <button
                              onClick={() => toggleExpand(file.name)}
                              className="p-1 hover:bg-slate-200 rounded"
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-slate-600" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-slate-600" />
                              )}
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <HardDrive className="h-4 w-4 text-indigo-600" />
                            <span className="font-semibold text-slate-800">{file.name}</span>
                            {hasTables && (
                              <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded">
                                {file.tables.length} table{file.tables.length !== 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-slate-700 font-medium">
                          {file.size_mb.toFixed(2)} MB
                        </td>
                        <td className="px-4 py-3 text-right text-slate-700 font-medium">
                          {formatNumber(file.row_count)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 text-sm text-slate-600">
                            <Clock className="h-3 w-3" />
                            {formatDate(file.updated_at)}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            {/* Preview all tables */}
                            <button
                              onClick={() => handlePreview(file)}
                              disabled={actionLoading === file.name}
                              className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                              title="Preview all tables"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            {/* Download */}
                            <a
                              href={getAdminFileDownloadUrl(file.name)}
                              className="p-1.5 text-slate-600 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
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
                              className="p-1.5 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                              title="Rename"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            {/* Refresh metadata */}
                            <button
                              onClick={() => handleRefresh(file)}
                              disabled={actionLoading === file.name}
                              className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="Refresh metadata"
                            >
                              <RefreshCw className={`h-4 w-4 ${actionLoading === file.name ? 'animate-spin' : ''}`} />
                            </button>
                            {/* Delete */}
                            <button
                              onClick={() => setDeleteConfirm(file)}
                              disabled={actionLoading === file.name}
                              className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Table sub-rows */}
                      {isExpanded && hasTables && file.tables.map((tableName, tableIndex) => {
                        const tableRowCount = file.table_row_counts?.[tableName] ?? 0
                        const tableActionKey = `${file.name}-${tableName}`
                        return (
                          <tr
                            key={tableActionKey}
                            className={`bg-slate-50 hover:bg-slate-100 ${tableIndex < file.tables.length - 1 ? 'border-b border-slate-150' : ''}`}
                          >
                            <td className="px-4 py-2"></td>
                            <td className="px-4 py-2 pl-10">
                              <div className="flex items-center gap-2">
                                <Table className="h-4 w-4 text-slate-500" />
                                <span className="text-slate-700">{tableName}</span>
                              </div>
                            </td>
                            <td className="px-4 py-2 text-right text-slate-500">
                              -
                            </td>
                            <td className="px-4 py-2 text-right text-slate-700 font-medium">
                              {formatNumber(tableRowCount)}
                            </td>
                            <td className="px-4 py-2"></td>
                            <td className="px-4 py-2">
                              <div className="flex items-center justify-center gap-1">
                                {/* Preview this table only */}
                                <button
                                  onClick={() => handlePreview(file, tableName)}
                                  disabled={actionLoading === tableActionKey}
                                  className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                  title={`Preview ${tableName}`}
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                                {/* Rename table */}
                                <button
                                  onClick={() => {
                                    setRenameTableInfo({ file, tableName })
                                    setNewTableName(tableName)
                                  }}
                                  disabled={actionLoading === tableActionKey}
                                  className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                                  title="Rename table"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </button>
                                {/* Delete table */}
                                <button
                                  onClick={() => setDeleteTableInfo({ file, tableName })}
                                  disabled={actionLoading === tableActionKey}
                                  className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                  title="Delete table"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Empty state */}
        {!loading && files.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
            <HardDrive className="h-12 w-12 text-slate-400 mx-auto mb-3" />
            <p className="text-slate-700">No DuckDB files found</p>
            <button
              onClick={() => setShowUploadModal(true)}
              className="mt-4 flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors mx-auto"
            >
              <Upload className="h-4 w-4" />
              Upload a file
            </button>
          </div>
        )}

        {/* Preview Modal */}
        {(previewData || previewLoading) && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
                <h2 className="font-bold text-slate-800">
                  Preview: {previewData?.filename || 'Loading...'}
                  {previewTableFilter && <span className="text-indigo-600"> → {previewTableFilter}</span>}
                </h2>
                <button
                  onClick={() => {
                    setPreviewData(null)
                    setPreviewTableFilter(null)
                  }}
                  className="p-1 hover:bg-slate-200 rounded transition-colors"
                >
                  <X className="h-5 w-5 text-slate-600" />
                </button>
              </div>
              <div className="p-4 overflow-auto max-h-[calc(80vh-60px)]">
                {previewLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                    <span className="ml-2 text-slate-700">Loading preview...</span>
                  </div>
                ) : previewData && (
                  <div className="space-y-6">
                    {Object.entries(getFilteredPreviewTables() || {}).map(([tableName, tableData]) => (
                      <div key={tableName}>
                        <h3 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
                          <Table className="h-4 w-4 text-indigo-500" />
                          {tableName}
                          <span className="text-sm font-normal text-slate-600">
                            ({tableData.row_count} sample rows)
                          </span>
                        </h3>
                        <div className="overflow-x-auto border border-slate-200 rounded">
                          <table className="w-full text-sm">
                            <thead className="bg-slate-100">
                              <tr>
                                {tableData.columns.map((col) => (
                                  <th key={col} className="px-3 py-2 text-left font-semibold text-slate-800 whitespace-nowrap">
                                    {col}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {tableData.rows.map((row, i) => (
                                <tr key={i} className="border-t border-slate-100">
                                  {row.map((cell, j) => (
                                    <td key={j} className="px-3 py-2 text-slate-700 whitespace-nowrap">
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
                <p className="text-sm text-slate-700 mb-3">
                  Current name: <span className="font-medium">{renameFile.name}</span>
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newFileName}
                    onChange={(e) => setNewFileName(e.target.value)}
                    placeholder="New file name"
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
                  />
                  <span className="text-slate-600">.duckdb</span>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <button
                    onClick={() => setRenameFile(null)}
                    className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
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
                <p className="text-slate-800 mb-2">
                  Are you sure you want to delete this file?
                </p>
                <p className="text-sm text-slate-700 bg-slate-100 px-3 py-2 rounded font-mono">
                  {deleteConfirm.name}
                </p>
                <p className="text-sm text-red-600 mt-3">
                  This action cannot be undone.
                </p>
                <div className="flex justify-end gap-2 mt-4">
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
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

        {/* Table Rename Modal */}
        {renameTableInfo && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
                <h2 className="font-bold text-slate-800">Rename Table</h2>
                <button
                  onClick={() => setRenameTableInfo(null)}
                  className="p-1 hover:bg-slate-200 rounded transition-colors"
                >
                  <X className="h-5 w-5 text-slate-600" />
                </button>
              </div>
              <div className="p-4">
                <p className="text-sm text-slate-700 mb-1">
                  File: <span className="font-medium">{renameTableInfo.file.name}</span>
                </p>
                <p className="text-sm text-slate-700 mb-3">
                  Current table name: <span className="font-medium">{renameTableInfo.tableName}</span>
                </p>
                <input
                  type="text"
                  value={newTableName}
                  onChange={(e) => setNewTableName(e.target.value)}
                  placeholder="New table name"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Use alphanumeric characters and underscores only
                </p>
                <div className="flex justify-end gap-2 mt-4">
                  <button
                    onClick={() => setRenameTableInfo(null)}
                    className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleTableRename}
                    disabled={!newTableName.trim() || newTableName === renameTableInfo.tableName || actionLoading === `${renameTableInfo.file.name}-${renameTableInfo.tableName}`}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                  >
                    {actionLoading === `${renameTableInfo.file.name}-${renameTableInfo.tableName}` && <Loader2 className="h-4 w-4 animate-spin" />}
                    Rename
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Table Delete Confirmation Modal */}
        {deleteTableInfo && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-red-50">
                <h2 className="font-bold text-red-800">Confirm Delete Table</h2>
                <button
                  onClick={() => setDeleteTableInfo(null)}
                  className="p-1 hover:bg-red-100 rounded transition-colors"
                >
                  <X className="h-5 w-5 text-red-600" />
                </button>
              </div>
              <div className="p-4">
                <p className="text-slate-800 mb-2">
                  Are you sure you want to delete this table?
                </p>
                <div className="bg-slate-100 px-3 py-2 rounded mb-2">
                  <p className="text-sm text-slate-700">
                    File: <span className="font-mono">{deleteTableInfo.file.name}</span>
                  </p>
                  <p className="text-sm text-slate-700">
                    Table: <span className="font-mono font-semibold">{deleteTableInfo.tableName}</span>
                  </p>
                  <p className="text-sm text-slate-700">
                    Rows: <span className="font-semibold">{formatNumber(deleteTableInfo.file.table_row_counts?.[deleteTableInfo.tableName] ?? 0)}</span>
                  </p>
                </div>
                <p className="text-sm text-red-600">
                  This action cannot be undone. All data in this table will be permanently deleted.
                </p>
                <div className="flex justify-end gap-2 mt-4">
                  <button
                    onClick={() => setDeleteTableInfo(null)}
                    className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleTableDelete}
                    disabled={actionLoading === `${deleteTableInfo.file.name}-${deleteTableInfo.tableName}`}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                  >
                    {actionLoading === `${deleteTableInfo.file.name}-${deleteTableInfo.tableName}` && <Loader2 className="h-4 w-4 animate-spin" />}
                    Delete Table
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Upload Modal */}
        {showUploadModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-green-50">
                <h2 className="font-bold text-green-800">Upload DuckDB File</h2>
                <button
                  onClick={() => {
                    if (!uploadInProgress) {
                      setShowUploadModal(false)
                      setUploadFile(null)
                      setUploadCustomName('')
                      setUploadProgress(null)
                      setUploadError(null)
                    }
                  }}
                  disabled={uploadInProgress}
                  className="p-1 hover:bg-green-100 rounded transition-colors disabled:opacity-50"
                >
                  <X className="h-5 w-5 text-green-600" />
                </button>
              </div>
              <div className="p-4">
                {/* Upload Error - shown inside modal */}
                {uploadError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center justify-between">
                    <span>{uploadError}</span>
                    <button onClick={() => setUploadError(null)} className="text-red-500 hover:text-red-700 ml-2">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}

                <div className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${uploadInProgress ? 'border-green-400 bg-green-50' : 'border-slate-300 hover:border-green-400'}`}>
                  <input
                    type="file"
                    accept=".duckdb"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                    disabled={uploadInProgress}
                  />
                  <label htmlFor="file-upload" className={uploadInProgress ? 'cursor-not-allowed' : 'cursor-pointer'}>
                    <Upload className={`h-10 w-10 mx-auto mb-2 ${uploadInProgress ? 'text-green-500' : 'text-slate-400'}`} />
                    {uploadFile ? (
                      <div>
                        <p className="text-slate-800 font-medium">{uploadFile.name}</p>
                        <p className="text-sm text-slate-600">
                          {(uploadFile.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-slate-700">Click to select a DuckDB file</p>
                        <p className="text-sm text-slate-500">Max size: 500 MB</p>
                      </div>
                    )}
                  </label>
                </div>

                {/* Upload Progress Bar */}
                {uploadInProgress && uploadProgress && (
                  <div className="mt-4">
                    <div className="flex justify-between text-sm text-slate-600 mb-1">
                      <span>Uploading...</span>
                      <span>{uploadProgress.percentage}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2.5">
                      <div
                        className="bg-green-600 h-2.5 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress.percentage}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {(uploadProgress.loaded / (1024 * 1024)).toFixed(1)} MB / {(uploadProgress.total / (1024 * 1024)).toFixed(1)} MB
                    </p>
                  </div>
                )}

                {uploadFile && !uploadInProgress && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Custom filename (optional)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={uploadCustomName}
                        onChange={(e) => setUploadCustomName(e.target.value)}
                        placeholder="Enter custom name"
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-slate-800"
                      />
                      <span className="text-slate-600">.duckdb</span>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 mt-4">
                  <button
                    onClick={() => {
                      if (!uploadInProgress) {
                        setShowUploadModal(false)
                        setUploadFile(null)
                        setUploadCustomName('')
                        setUploadProgress(null)
                        setUploadError(null)
                      }
                    }}
                    disabled={uploadInProgress}
                    className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpload}
                    disabled={!uploadFile || uploadInProgress}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                  >
                    {uploadInProgress && <Loader2 className="h-4 w-4 animate-spin" />}
                    {uploadInProgress ? 'Uploading...' : 'Upload'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      )}
      </SignedIn>
    </main>
  )
}
