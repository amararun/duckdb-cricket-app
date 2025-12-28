import { useState, useEffect } from 'react'
import { executeQuery } from '../services/api'
import { Loader2, ChevronUp, ChevronDown, Filter } from 'lucide-react'

interface BowlingStatsRow {
  bowler: string
  matches: number
  balls: number
  overs: number
  runs: number
  wickets: number
  economy: number
  average: number
  strike_rate: number
  dot_pct: number
  fours: number
  sixes: number
}

type SortField = keyof BowlingStatsRow
type SortDirection = 'asc' | 'desc'

export function BowlingStats() {
  const [data, setData] = useState<BowlingStatsRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [matchType, setMatchType] = useState<string>('All')
  const [yearFrom, setYearFrom] = useState<number>(2002)
  const [yearTo, setYearTo] = useState<number>(2025)
  const [team, setTeam] = useState<string>('All')
  const [minMatches, setMinMatches] = useState<number>(10)

  // Available filter options
  const [teams, setTeams] = useState<string[]>([])

  // Sorting
  const [sortField, setSortField] = useState<SortField>('wickets')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  // Pagination
  const [page, setPage] = useState(1)
  const rowsPerPage = 50

  // Fetch teams for filter dropdown
  useEffect(() => {
    async function fetchTeams() {
      try {
        const result = await executeQuery(`
          SELECT DISTINCT bowling_team
          FROM odi_t20
          ORDER BY bowling_team
        `)
        setTeams(result.rows.map(row => row[0] as string))
      } catch (err) {
        console.error('Failed to fetch teams:', err)
      }
    }
    fetchTeams()
  }, [])

  // Fetch bowling stats
  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      setError(null)
      setPage(1)

      try {
        // Build WHERE clause based on filters
        const conditions: string[] = []

        if (matchType !== 'All') {
          conditions.push(`match_type = '${matchType}'`)
        }

        conditions.push(`EXTRACT(YEAR FROM start_date) >= ${yearFrom}`)
        conditions.push(`EXTRACT(YEAR FROM start_date) <= ${yearTo}`)

        if (team !== 'All') {
          conditions.push(`bowling_team = '${team}'`)
        }

        const whereClause = conditions.length > 0
          ? `WHERE ${conditions.join(' AND ')}`
          : ''

        const sql = `
          SELECT
            bowler,
            COUNT(DISTINCT match_id) as matches,
            COUNT(*) as balls,
            ROUND(COUNT(*) / 6.0, 1) as overs,
            CAST(SUM(runs_off_bat + wides + noballs) AS INTEGER) as runs,
            SUM(CASE
              WHEN wicket_type IS NOT NULL
                AND wicket_type NOT IN ('run out', 'retired hurt', 'retired not out', 'retired out', 'obstructing the field')
              THEN 1 ELSE 0
            END) as wickets,
            ROUND(CAST(SUM(runs_off_bat + wides + noballs) AS DOUBLE) / (COUNT(*) / 6.0), 2) as economy,
            CASE
              WHEN SUM(CASE WHEN wicket_type IS NOT NULL AND wicket_type NOT IN ('run out', 'retired hurt', 'retired not out', 'retired out', 'obstructing the field') THEN 1 ELSE 0 END) > 0
              THEN ROUND(CAST(SUM(runs_off_bat + wides + noballs) AS DOUBLE) / SUM(CASE WHEN wicket_type IS NOT NULL AND wicket_type NOT IN ('run out', 'retired hurt', 'retired not out', 'retired out', 'obstructing the field') THEN 1 ELSE 0 END), 2)
              ELSE 0
            END as average,
            CASE
              WHEN SUM(CASE WHEN wicket_type IS NOT NULL AND wicket_type NOT IN ('run out', 'retired hurt', 'retired not out', 'retired out', 'obstructing the field') THEN 1 ELSE 0 END) > 0
              THEN ROUND(CAST(COUNT(*) AS DOUBLE) / SUM(CASE WHEN wicket_type IS NOT NULL AND wicket_type NOT IN ('run out', 'retired hurt', 'retired not out', 'retired out', 'obstructing the field') THEN 1 ELSE 0 END), 1)
              ELSE 0
            END as strike_rate,
            ROUND(SUM(CASE WHEN runs_off_bat = 0 AND wides = 0 AND noballs = 0 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) as dot_pct,
            SUM(CASE WHEN runs_off_bat = 4 THEN 1 ELSE 0 END) as fours,
            SUM(CASE WHEN runs_off_bat = 6 THEN 1 ELSE 0 END) as sixes
          FROM odi_t20
          ${whereClause}
          GROUP BY bowler
          HAVING COUNT(DISTINCT match_id) >= ${minMatches}
          ORDER BY wickets DESC
          LIMIT 500
        `

        const result = await executeQuery(sql)

        const rows: BowlingStatsRow[] = result.rows.map(row => ({
          bowler: row[0] as string,
          matches: row[1] as number,
          balls: row[2] as number,
          overs: row[3] as number,
          runs: row[4] as number,
          wickets: row[5] as number,
          economy: row[6] as number,
          average: row[7] as number,
          strike_rate: row[8] as number,
          dot_pct: row[9] as number,
          fours: row[10] as number,
          sixes: row[11] as number,
        }))

        setData(rows)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [matchType, yearFrom, yearTo, team, minMatches])

  // Sort data
  const sortedData = [...data].sort((a, b) => {
    const aVal = a[sortField]
    const bVal = b[sortField]

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortDirection === 'asc'
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal)
    }

    return sortDirection === 'asc'
      ? (aVal as number) - (bVal as number)
      : (bVal as number) - (aVal as number)
  })

  // Paginate
  const totalPages = Math.ceil(sortedData.length / rowsPerPage)
  const paginatedData = sortedData.slice((page - 1) * rowsPerPage, page * rowsPerPage)

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      // For bowling, lower is better for economy/average/strike_rate
      if (field === 'economy' || field === 'average' || field === 'strike_rate') {
        setSortDirection('asc')
      } else {
        setSortDirection('desc')
      }
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null
    return sortDirection === 'asc'
      ? <ChevronUp className="h-4 w-4 inline" />
      : <ChevronDown className="h-4 w-4 inline" />
  }

  const columnHeader = (field: SortField, label: string, align: 'left' | 'right' = 'right') => (
    <th
      className={`px-3 py-3 text-${align} text-base font-bold text-slate-800 bg-slate-200 cursor-pointer hover:bg-slate-300 transition-colors whitespace-nowrap`}
      onClick={() => handleSort(field)}
    >
      {label} <SortIcon field={field} />
    </th>
  )

  return (
    <main className="flex-1 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Page Title */}
        <h1 className="text-2xl font-bold text-slate-800 mb-4">Bowling Statistics</h1>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-5 w-5 text-slate-500" />
            <span className="font-semibold text-slate-700">Filters</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {/* Match Type */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Match Type</label>
              <select
                value={matchType}
                onChange={(e) => setMatchType(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-base font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="All">All</option>
                <option value="ODI">ODI</option>
                <option value="T20">T20</option>
              </select>
            </div>

            {/* Year From */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Year From</label>
              <select
                value={yearFrom}
                onChange={(e) => setYearFrom(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-base font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {Array.from({ length: 2025 - 2002 + 1 }, (_, i) => 2002 + i).map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            {/* Year To */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Year To</label>
              <select
                value={yearTo}
                onChange={(e) => setYearTo(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-base font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {Array.from({ length: 2025 - 2002 + 1 }, (_, i) => 2002 + i).map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            {/* Team */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Team</label>
              <select
                value={team}
                onChange={(e) => setTeam(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-base font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="All">All Teams</option>
                {teams.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Min Matches */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Min Matches</label>
              <select
                value={minMatches}
                onChange={(e) => setMinMatches(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-base font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value={1}>1+</option>
                <option value={5}>5+</option>
                <option value={10}>10+</option>
                <option value={25}>25+</option>
                <option value={50}>50+</option>
                <option value={100}>100+</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results Info */}
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm text-slate-600">
            {loading ? 'Loading...' : `${data.length} bowlers found`}
          </span>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 text-sm bg-white border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Prev
              </button>
              <span className="text-sm text-slate-600">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 text-sm bg-white border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
              <span className="ml-3 text-slate-600">Loading bowling statistics...</span>
            </div>
          ) : error ? (
            <div className="p-6 text-center text-red-600">
              Error: {error}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-300">
                    <th className="px-3 py-3 text-left text-base font-bold text-slate-800 bg-slate-200 sticky left-0">#</th>
                    {columnHeader('bowler', 'Bowler', 'left')}
                    {columnHeader('matches', 'Mat')}
                    {columnHeader('overs', 'Overs')}
                    {columnHeader('runs', 'Runs')}
                    {columnHeader('wickets', 'Wkts')}
                    {columnHeader('economy', 'Econ')}
                    {columnHeader('average', 'Avg')}
                    {columnHeader('strike_rate', 'SR')}
                    {columnHeader('dot_pct', 'Dot%')}
                    {columnHeader('fours', '4s')}
                    {columnHeader('sixes', '6s')}
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((row, idx) => (
                    <tr
                      key={row.bowler}
                      className={`border-b border-slate-100 hover:bg-indigo-50 transition-colors ${
                        idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                      }`}
                    >
                      <td className="px-3 py-2 text-base font-medium text-slate-500 sticky left-0 bg-inherit">
                        {(page - 1) * rowsPerPage + idx + 1}
                      </td>
                      <td className="px-3 py-2 text-base font-semibold text-slate-800 whitespace-nowrap">
                        {row.bowler}
                      </td>
                      <td className="px-3 py-2 text-base font-medium text-slate-700 text-right">{row.matches}</td>
                      <td className="px-3 py-2 text-base font-medium text-slate-700 text-right">{row.overs}</td>
                      <td className="px-3 py-2 text-base font-medium text-slate-700 text-right">{row.runs.toLocaleString()}</td>
                      <td className="px-3 py-2 text-base font-semibold text-slate-800 text-right">{row.wickets}</td>
                      <td className="px-3 py-2 text-base font-semibold text-emerald-700 text-right">{row.economy.toFixed(2)}</td>
                      <td className="px-3 py-2 text-base font-medium text-blue-700 text-right">{row.average.toFixed(2)}</td>
                      <td className="px-3 py-2 text-base font-medium text-slate-700 text-right">{row.strike_rate.toFixed(1)}</td>
                      <td className="px-3 py-2 text-base font-medium text-slate-600 text-right">{row.dot_pct.toFixed(1)}%</td>
                      <td className="px-3 py-2 text-base font-medium text-slate-700 text-right">{row.fours}</td>
                      <td className="px-3 py-2 text-base font-medium text-slate-700 text-right">{row.sixes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Bottom Pagination */}
        {totalPages > 1 && !loading && (
          <div className="flex justify-center items-center gap-2 mt-4">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 text-sm bg-white border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-slate-600 px-4">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 text-sm bg-white border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
