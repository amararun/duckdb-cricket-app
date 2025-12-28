import { useEffect, useState } from 'react'
import { Database, Table, AlertCircle, Loader2 } from 'lucide-react'
import { getTables, getSchema, getTableSample } from '../services/api'

interface SchemaColumn {
  column_name: string
  column_type: string
  nullable: boolean
}

interface TableData {
  name: string
  schema: SchemaColumn[]
  sampleColumns: string[]
  sampleRows: (string | number | boolean | null)[][]
  loading: boolean
  error: string | null
}

export function Schema() {
  const [tables, setTables] = useState<TableData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        setError(null)

        // Get list of tables
        const tablesResponse = await getTables()

        // Initialize table data
        const initialTables: TableData[] = tablesResponse.tables.map(name => ({
          name,
          schema: [],
          sampleColumns: [],
          sampleRows: [],
          loading: true,
          error: null,
        }))
        setTables(initialTables)
        setLoading(false)

        // Load schema and sample data for each table
        for (let i = 0; i < initialTables.length; i++) {
          const tableName = initialTables[i].name
          try {
            const [schemaResponse, sampleResponse] = await Promise.all([
              getSchema(tableName),
              getTableSample(tableName, 5),
            ])

            setTables(prev => prev.map((t, idx) =>
              idx === i ? {
                ...t,
                schema: schemaResponse.schema,
                sampleColumns: sampleResponse.columns,
                sampleRows: sampleResponse.rows,
                loading: false,
              } : t
            ))
          } catch (err) {
            setTables(prev => prev.map((t, idx) =>
              idx === i ? {
                ...t,
                loading: false,
                error: err instanceof Error ? err.message : 'Failed to load',
              } : t
            ))
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to connect to backend')
        setLoading(false)
      }
    }

    loadData()
  }, [])

  if (loading) {
    return (
      <div className="flex-1 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            <span className="ml-3 text-lg text-slate-600">Loading database schema...</span>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-6 w-6 text-red-600" />
              <div>
                <h3 className="text-lg font-semibold text-red-800">Connection Error</h3>
                <p className="text-base text-red-700 mt-1">{error}</p>
                <p className="text-sm text-red-600 mt-2">
                  Check that VITE_API_URL and VITE_API_KEY are set correctly.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Page Title */}
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <Database className="h-7 w-7 text-indigo-600" />
            <h1 className="text-2xl font-bold text-slate-800">Database Schema</h1>
          </div>
          <p className="text-base text-slate-600 mt-1">
            {tables.length} table{tables.length !== 1 ? 's' : ''} found in database
          </p>
        </div>

        {/* Tables */}
        <div className="space-y-8">
          {tables.map((table) => (
            <div key={table.name} className="bg-white border border-slate-200 rounded-lg overflow-hidden">
              {/* Table Header */}
              <div className="bg-slate-100 px-6 py-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <Table className="h-5 w-5 text-indigo-600" />
                  <h2 className="text-lg font-bold text-slate-800">{table.name}</h2>
                  {table.schema.length > 0 && (
                    <span className="text-sm text-slate-500 ml-2">
                      ({table.schema.length} columns)
                    </span>
                  )}
                </div>
              </div>

              {/* Loading State */}
              {table.loading && (
                <div className="p-6 flex items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
                  <span className="ml-2 text-slate-600">Loading...</span>
                </div>
              )}

              {/* Error State */}
              {table.error && (
                <div className="p-6 bg-red-50">
                  <p className="text-base text-red-700">{table.error}</p>
                </div>
              )}

              {/* Schema */}
              {!table.loading && !table.error && table.schema.length > 0 && (
                <div className="p-6">
                  {/* Column Schema */}
                  <div className="mb-6">
                    <h3 className="text-base font-semibold text-slate-700 mb-3">Columns</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-slate-200">
                            <th className="px-4 py-2 text-base font-bold text-slate-800">Column</th>
                            <th className="px-4 py-2 text-base font-bold text-slate-800">Type</th>
                            <th className="px-4 py-2 text-base font-bold text-slate-800">Nullable</th>
                          </tr>
                        </thead>
                        <tbody>
                          {table.schema.map((col, idx) => (
                            <tr key={col.column_name} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                              <td className="px-4 py-2 text-base font-semibold text-slate-800">{col.column_name}</td>
                              <td className="px-4 py-2 text-base font-medium text-slate-700">{col.column_type}</td>
                              <td className="px-4 py-2 text-base font-medium text-slate-700">{col.nullable ? 'Yes' : 'No'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Sample Data */}
                  {table.sampleRows.length > 0 && (
                    <div>
                      <h3 className="text-base font-semibold text-slate-700 mb-3">
                        Sample Data ({table.sampleRows.length} rows)
                      </h3>
                      <div className="overflow-x-auto border border-slate-200 rounded-lg">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="bg-teal-100">
                              {table.sampleColumns.map((col) => (
                                <th key={col} className="px-4 py-2 text-base font-bold text-teal-800 whitespace-nowrap">
                                  {col}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {table.sampleRows.map((row, rowIdx) => (
                              <tr key={rowIdx} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                {row.map((cell, cellIdx) => (
                                  <td key={cellIdx} className="px-4 py-2 text-base font-medium text-slate-700 whitespace-nowrap">
                                    {cell === null ? <span className="text-slate-400 italic">null</span> : String(cell)}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
