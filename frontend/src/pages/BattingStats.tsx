import { useState, useEffect } from 'react'
import { executeQuery } from '../services/api'
import { Loader2, ChevronUp, ChevronDown, Filter, Info, X } from 'lucide-react'

interface BattingStatsRow {
  player: string
  matches: number
  innings: number
  runs: number
  balls_faced: number
  dismissals: number
  not_outs: number
  average: number
  strike_rate: number
  fours: number
  sixes: number
  boundary_pct: number
}

type SortField = keyof BattingStatsRow
type SortDirection = 'asc' | 'desc'

export function BattingStats() {
  const [data, setData] = useState<BattingStatsRow[]>([])
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
  const [sortField, setSortField] = useState<SortField>('runs')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  // Pagination
  const [page, setPage] = useState(1)
  const rowsPerPage = 50

  // Info modal
  const [showInfo, setShowInfo] = useState(false)

  // Fetch teams for filter dropdown
  useEffect(() => {
    async function fetchTeams() {
      try {
        const result = await executeQuery(`
          SELECT DISTINCT batting_team
          FROM ball_by_ball
          ORDER BY batting_team
        `)
        setTeams(result.rows.map(row => row[0] as string))
      } catch (err) {
        console.error('Failed to fetch teams:', err)
      }
    }
    fetchTeams()
  }, [])

  // Fetch batting stats
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
          conditions.push(`batting_team = '${team}'`)
        }

        const whereClause = conditions.length > 0
          ? `WHERE ${conditions.join(' AND ')}`
          : ''

        const sql = `
          SELECT
            striker as player,
            COUNT(DISTINCT match_id) as matches,
            COUNT(DISTINCT match_id) as innings,
            CAST(SUM(runs_off_bat) AS INTEGER) as runs,
            COUNT(*) as balls_faced,
            SUM(CASE
              WHEN wicket_type IS NOT NULL
                AND player_dismissed = striker
                AND wicket_type NOT IN ('retired hurt', 'retired not out')
              THEN 1 ELSE 0
            END) as dismissals,
            COUNT(DISTINCT match_id) - SUM(CASE
              WHEN wicket_type IS NOT NULL
                AND player_dismissed = striker
                AND wicket_type NOT IN ('retired hurt', 'retired not out')
              THEN 1 ELSE 0
            END) as not_outs,
            CASE
              WHEN SUM(CASE WHEN wicket_type IS NOT NULL AND player_dismissed = striker AND wicket_type NOT IN ('retired hurt', 'retired not out') THEN 1 ELSE 0 END) > 0
              THEN ROUND(CAST(SUM(runs_off_bat) AS DOUBLE) / SUM(CASE WHEN wicket_type IS NOT NULL AND player_dismissed = striker AND wicket_type NOT IN ('retired hurt', 'retired not out') THEN 1 ELSE 0 END), 2)
              ELSE CAST(SUM(runs_off_bat) AS DOUBLE)
            END as average,
            ROUND(CAST(SUM(runs_off_bat) AS DOUBLE) / COUNT(*) * 100, 2) as strike_rate,
            SUM(CASE WHEN runs_off_bat = 4 THEN 1 ELSE 0 END) as fours,
            SUM(CASE WHEN runs_off_bat = 6 THEN 1 ELSE 0 END) as sixes,
            CASE
              WHEN SUM(runs_off_bat) > 0
              THEN ROUND((SUM(CASE WHEN runs_off_bat = 4 THEN 4 ELSE 0 END) + SUM(CASE WHEN runs_off_bat = 6 THEN 6 ELSE 0 END)) * 100.0 / SUM(runs_off_bat), 1)
              ELSE 0
            END as boundary_pct
          FROM ball_by_ball
          ${whereClause}
          GROUP BY striker
          HAVING COUNT(DISTINCT match_id) >= ${minMatches}
          ORDER BY runs DESC
          LIMIT 500
        `

        const result = await executeQuery(sql)

        const rows: BattingStatsRow[] = result.rows.map(row => ({
          player: row[0] as string,
          matches: row[1] as number,
          innings: row[2] as number,
          runs: row[3] as number,
          balls_faced: row[4] as number,
          dismissals: row[5] as number,
          not_outs: row[6] as number,
          average: row[7] as number,
          strike_rate: row[8] as number,
          fours: row[9] as number,
          sixes: row[10] as number,
          boundary_pct: row[11] as number,
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
      setSortDirection('desc')
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
        {/* Page Title with Info Button */}
        <div className="flex items-center gap-3 mb-4">
          <h1 className="text-2xl font-bold text-slate-800">Batting Statistics</h1>
          <button
            onClick={() => setShowInfo(true)}
            className="p-1.5 rounded-full bg-indigo-100 hover:bg-indigo-200 text-indigo-700 transition-colors"
            title="View metric definitions"
          >
            <Info className="h-5 w-5" />
          </button>
        </div>

        {/* Info Modal */}
        {showInfo && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-indigo-50">
                <h2 className="text-xl font-bold text-slate-800">Batting Statistics - Metric Definitions</h2>
                <button
                  onClick={() => setShowInfo(false)}
                  className="p-1 rounded hover:bg-indigo-100 text-slate-600 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <div className="px-6 py-4 overflow-y-auto max-h-[60vh]">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-2 text-base font-bold text-slate-800">Metric</th>
                      <th className="text-left py-2 text-base font-bold text-slate-800">Definition</th>
                    </tr>
                  </thead>
                  <tbody className="text-base text-slate-700">
                    <tr className="border-b border-slate-100">
                      <td className="py-3 font-semibold">Mat</td>
                      <td className="py-3">Matches played (appearances as batsman)</td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="py-3 font-semibold">Inns</td>
                      <td className="py-3">Innings batted (currently same as matches)</td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="py-3 font-semibold">Runs</td>
                      <td className="py-3">Total runs scored off the bat. Excludes extras (wides, byes, etc.)</td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="py-3 font-semibold">BF</td>
                      <td className="py-3">Balls Faced - total deliveries received</td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="py-3 font-semibold">Outs</td>
                      <td className="py-3">Dismissals (caught, bowled, lbw, run out, stumped, etc.). Excludes retired hurt/not out</td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="py-3 font-semibold">NO</td>
                      <td className="py-3">Not Outs - innings where batsman remained unbeaten</td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="py-3 font-semibold text-emerald-700">Avg</td>
                      <td className="py-3"><strong>Batting Average</strong> = Runs / Dismissals. Key performance metric. Higher is better.</td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="py-3 font-semibold text-blue-700">SR</td>
                      <td className="py-3"><strong>Strike Rate</strong> = (Runs / Balls) x 100. Runs scored per 100 balls. Higher means faster scoring.</td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="py-3 font-semibold">4s</td>
                      <td className="py-3">Number of boundaries (4 runs) hit</td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="py-3 font-semibold">6s</td>
                      <td className="py-3">Number of sixes (over the boundary) hit</td>
                    </tr>
                    <tr>
                      <td className="py-3 font-semibold">Bnd%</td>
                      <td className="py-3"><strong>Boundary Percentage</strong> = (4s x 4 + 6s x 6) / Runs x 100. Percentage of runs from boundaries.</td>
                    </tr>
                  </tbody>
                </table>

                <div className="mt-6 p-4 bg-slate-50 rounded-lg">
                  <h3 className="font-bold text-slate-800 mb-2">Data Notes</h3>
                  <ul className="text-base text-slate-600 space-y-1">
                    <li>Data covers ODI and T20 internationals from 2002-2025</li>
                    <li>Ball-by-ball data with 2.6 million deliveries</li>
                    <li>Use filters to narrow down by format, year range, or team</li>
                  </ul>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
                <button
                  onClick={() => setShowInfo(false)}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

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
                <option value="TEST">Test</option>
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
            {loading ? 'Loading...' : `${data.length} players found`}
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
              <span className="ml-3 text-slate-600">Loading batting statistics...</span>
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
                    {columnHeader('player', 'Player', 'left')}
                    {columnHeader('matches', 'Mat')}
                    {columnHeader('innings', 'Inns')}
                    {columnHeader('runs', 'Runs')}
                    {columnHeader('balls_faced', 'BF')}
                    {columnHeader('dismissals', 'Outs')}
                    {columnHeader('not_outs', 'NO')}
                    {columnHeader('average', 'Avg')}
                    {columnHeader('strike_rate', 'SR')}
                    {columnHeader('fours', '4s')}
                    {columnHeader('sixes', '6s')}
                    {columnHeader('boundary_pct', 'Bnd%')}
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((row, idx) => (
                    <tr
                      key={row.player}
                      className={`border-b border-slate-100 hover:bg-indigo-50 transition-colors ${
                        idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                      }`}
                    >
                      <td className="px-3 py-2 text-base font-medium text-slate-500 sticky left-0 bg-inherit">
                        {(page - 1) * rowsPerPage + idx + 1}
                      </td>
                      <td className="px-3 py-2 text-base font-semibold text-slate-800 whitespace-nowrap">
                        {row.player}
                      </td>
                      <td className="px-3 py-2 text-base font-medium text-slate-700 text-right">{row.matches}</td>
                      <td className="px-3 py-2 text-base font-medium text-slate-700 text-right">{row.innings}</td>
                      <td className="px-3 py-2 text-base font-semibold text-slate-800 text-right">{row.runs.toLocaleString()}</td>
                      <td className="px-3 py-2 text-base font-medium text-slate-700 text-right">{row.balls_faced.toLocaleString()}</td>
                      <td className="px-3 py-2 text-base font-medium text-slate-700 text-right">{row.dismissals}</td>
                      <td className="px-3 py-2 text-base font-medium text-slate-700 text-right">{row.not_outs}</td>
                      <td className="px-3 py-2 text-base font-semibold text-emerald-700 text-right">{row.average.toFixed(2)}</td>
                      <td className="px-3 py-2 text-base font-medium text-blue-700 text-right">{row.strike_rate.toFixed(2)}</td>
                      <td className="px-3 py-2 text-base font-medium text-slate-700 text-right">{row.fours}</td>
                      <td className="px-3 py-2 text-base font-medium text-slate-700 text-right">{row.sixes}</td>
                      <td className="px-3 py-2 text-base font-medium text-slate-600 text-right">{row.boundary_pct.toFixed(1)}%</td>
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
