import { useState, useEffect, useMemo } from 'react'
import { executeCricketQuery } from '../../../services/api'
import { Loader2, ChevronUp, ChevronDown, Search, Users, Target, Info, X } from 'lucide-react'

interface MatchupRow {
  opponent: string
  balls: number
  runs: number
  dismissals: number
  average: number
  strikeRate: number
  dots: number
  dotPct: number
  fours: number
  sixes: number
}

interface PlayerSummary {
  totalBalls: number
  totalRuns: number
  totalDismissals: number
  overallAvg: number
  overallSR: number
  matchups: number
}

type ViewMode = 'batter' | 'bowler'
type SortField = keyof MatchupRow
type SortDirection = 'asc' | 'desc'

export function HeadToHead() {
  // Mode and player selection
  const [mode, setMode] = useState<ViewMode>('batter')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null)
  const [playerSuggestions, setPlayerSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  // Filters
  const [matchType, setMatchType] = useState<string>('All')
  const [minBalls, setMinBalls] = useState<number>(30)

  // Data
  const [matchups, setMatchups] = useState<MatchupRow[]>([])
  const [summary, setSummary] = useState<PlayerSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Sorting
  const [sortField, setSortField] = useState<SortField>('balls')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  // Info modal
  const [showInfo, setShowInfo] = useState(false)

  // Debounced search for player suggestions
  useEffect(() => {
    if (searchQuery.length < 2) {
      setPlayerSuggestions([])
      return
    }

    const timer = setTimeout(async () => {
      setSearchLoading(true)
      try {
        const column = mode === 'batter' ? 'striker' : 'bowler'
        const result = await executeCricketQuery(`
          SELECT DISTINCT ${column} as player
          FROM ball_by_ball
          WHERE LOWER(${column}) LIKE LOWER('%${searchQuery.replace(/'/g, "''")}%')
          ORDER BY ${column}
          LIMIT 20
        `)
        setPlayerSuggestions(result.rows.map(row => row[0] as string))
      } catch (err) {
        console.error('Search error:', err)
      } finally {
        setSearchLoading(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, mode])

  // Fetch matchups when player is selected
  useEffect(() => {
    if (!selectedPlayer) {
      setMatchups([])
      setSummary(null)
      return
    }

    async function fetchMatchups() {
      setLoading(true)
      setError(null)

      try {
        const typeFilter = matchType !== 'All' ? `AND match_type = '${matchType}'` : ''
        const escapedPlayer = selectedPlayer!.replace(/'/g, "''")

        let sql: string
        if (mode === 'batter') {
          // Batter vs all bowlers
          sql = `
            SELECT
              bowler as opponent,
              COUNT(*) as balls,
              CAST(SUM(runs_off_bat) AS INTEGER) as runs,
              SUM(CASE
                WHEN wicket_type IS NOT NULL
                  AND player_dismissed = striker
                  AND wicket_type NOT IN ('run out', 'retired hurt', 'retired not out', 'obstructing the field')
                THEN 1 ELSE 0
              END) as dismissals,
              CASE
                WHEN SUM(CASE WHEN wicket_type IS NOT NULL AND player_dismissed = striker AND wicket_type NOT IN ('run out', 'retired hurt', 'retired not out', 'obstructing the field') THEN 1 ELSE 0 END) > 0
                THEN ROUND(CAST(SUM(runs_off_bat) AS DOUBLE) / SUM(CASE WHEN wicket_type IS NOT NULL AND player_dismissed = striker AND wicket_type NOT IN ('run out', 'retired hurt', 'retired not out', 'obstructing the field') THEN 1 ELSE 0 END), 2)
                ELSE CAST(SUM(runs_off_bat) AS DOUBLE)
              END as average,
              ROUND(CAST(SUM(runs_off_bat) AS DOUBLE) / COUNT(*) * 100, 1) as strike_rate,
              SUM(CASE WHEN runs_off_bat = 0 AND wides = 0 AND noballs = 0 THEN 1 ELSE 0 END) as dots,
              ROUND(SUM(CASE WHEN runs_off_bat = 0 AND wides = 0 AND noballs = 0 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) as dot_pct,
              SUM(CASE WHEN runs_off_bat = 4 THEN 1 ELSE 0 END) as fours,
              SUM(CASE WHEN runs_off_bat = 6 THEN 1 ELSE 0 END) as sixes
            FROM ball_by_ball
            WHERE striker = '${escapedPlayer}' ${typeFilter}
            GROUP BY bowler
            HAVING COUNT(*) >= ${minBalls}
            ORDER BY balls DESC
            LIMIT 200
          `
        } else {
          // Bowler vs all batters
          sql = `
            SELECT
              striker as opponent,
              COUNT(*) as balls,
              CAST(SUM(runs_off_bat) AS INTEGER) as runs,
              SUM(CASE
                WHEN wicket_type IS NOT NULL
                  AND wicket_type NOT IN ('run out', 'retired hurt', 'retired not out', 'obstructing the field')
                THEN 1 ELSE 0
              END) as wickets,
              CASE
                WHEN SUM(CASE WHEN wicket_type IS NOT NULL AND wicket_type NOT IN ('run out', 'retired hurt', 'retired not out', 'obstructing the field') THEN 1 ELSE 0 END) > 0
                THEN ROUND(CAST(SUM(runs_off_bat) AS DOUBLE) / SUM(CASE WHEN wicket_type IS NOT NULL AND wicket_type NOT IN ('run out', 'retired hurt', 'retired not out', 'obstructing the field') THEN 1 ELSE 0 END), 2)
                ELSE CAST(SUM(runs_off_bat) AS DOUBLE)
              END as average,
              ROUND(CAST(SUM(runs_off_bat) AS DOUBLE) / COUNT(*) * 6, 2) as economy,
              SUM(CASE WHEN runs_off_bat = 0 AND wides = 0 AND noballs = 0 THEN 1 ELSE 0 END) as dots,
              ROUND(SUM(CASE WHEN runs_off_bat = 0 AND wides = 0 AND noballs = 0 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) as dot_pct,
              SUM(CASE WHEN runs_off_bat = 4 THEN 1 ELSE 0 END) as fours,
              SUM(CASE WHEN runs_off_bat = 6 THEN 1 ELSE 0 END) as sixes
            FROM ball_by_ball
            WHERE bowler = '${escapedPlayer}' ${typeFilter}
            GROUP BY striker
            HAVING COUNT(*) >= ${minBalls}
            ORDER BY balls DESC
            LIMIT 200
          `
        }

        const result = await executeCricketQuery(sql)

        const rows: MatchupRow[] = result.rows.map(row => ({
          opponent: row[0] as string,
          balls: row[1] as number,
          runs: row[2] as number,
          dismissals: row[3] as number,
          average: row[4] as number,
          strikeRate: row[5] as number,
          dots: row[6] as number,
          dotPct: row[7] as number,
          fours: row[8] as number,
          sixes: row[9] as number,
        }))

        setMatchups(rows)

        // Calculate summary
        const totalBalls = rows.reduce((sum, r) => sum + r.balls, 0)
        const totalRuns = rows.reduce((sum, r) => sum + r.runs, 0)
        const totalDismissals = rows.reduce((sum, r) => sum + r.dismissals, 0)

        setSummary({
          totalBalls,
          totalRuns,
          totalDismissals,
          overallAvg: totalDismissals > 0 ? Math.round(totalRuns / totalDismissals * 100) / 100 : totalRuns,
          overallSR: mode === 'batter'
            ? Math.round(totalRuns / totalBalls * 10000) / 100
            : Math.round(totalRuns / totalBalls * 600) / 100,
          matchups: rows.length
        })

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data')
      } finally {
        setLoading(false)
      }
    }

    fetchMatchups()
  }, [selectedPlayer, mode, matchType, minBalls])

  // Sort matchups
  const sortedMatchups = useMemo(() => {
    return [...matchups].sort((a, b) => {
      const aVal = a[sortField]
      const bVal = b[sortField]
      const multiplier = sortDirection === 'asc' ? 1 : -1
      if (typeof aVal === 'string') {
        return aVal.localeCompare(bVal as string) * multiplier
      }
      return ((aVal as number) - (bVal as number)) * multiplier
    })
  }, [matchups, sortField, sortDirection])

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return null
    return sortDirection === 'asc'
      ? <ChevronUp className="h-4 w-4 inline" />
      : <ChevronDown className="h-4 w-4 inline" />
  }

  function selectPlayer(player: string) {
    setSelectedPlayer(player)
    setSearchQuery(player)
    setShowSuggestions(false)
  }

  function clearPlayer() {
    setSelectedPlayer(null)
    setSearchQuery('')
    setMatchups([])
    setSummary(null)
  }

  return (
    <main className="flex-1 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Page Title */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Head-to-Head</h1>
            <p className="text-base text-slate-600 mt-1">
              Player vs player matchup statistics
            </p>
          </div>
          <button
            onClick={() => setShowInfo(true)}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
            title="How to use"
          >
            <Info className="h-5 w-5" />
          </button>
        </div>

        {/* Mode Toggle */}
        <div className="mb-6 flex items-center gap-4">
          <span className="text-sm font-medium text-slate-700">View:</span>
          <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => { setMode('batter'); clearPlayer(); }}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
                mode === 'batter'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              <Target className="h-4 w-4" />
              Batter vs Bowlers
            </button>
            <button
              onClick={() => { setMode('bowler'); clearPlayer(); }}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
                mode === 'bowler'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              <Users className="h-4 w-4" />
              Bowler vs Batters
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Player Search */}
            <div className="md:col-span-2 relative">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Select {mode === 'batter' ? 'Batter' : 'Bowler'}
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setShowSuggestions(true)
                    if (e.target.value !== selectedPlayer) {
                      setSelectedPlayer(null)
                    }
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder={`Search for a ${mode}...`}
                  className="w-full pl-10 pr-10 py-2 border border-slate-300 rounded-md text-base font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                {searchQuery && (
                  <button
                    onClick={clearPlayer}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
                {searchLoading && (
                  <Loader2 className="absolute right-10 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-slate-400" />
                )}
              </div>
              {/* Suggestions dropdown */}
              {showSuggestions && playerSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-60 overflow-auto">
                  {playerSuggestions.map((player) => (
                    <button
                      key={player}
                      onClick={() => selectPlayer(player)}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-indigo-50 hover:text-indigo-700"
                    >
                      {player}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Match Type */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Match Type</label>
              <select
                value={matchType}
                onChange={(e) => setMatchType(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-base font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="All">All</option>
                <option value="TEST">Test</option>
                <option value="ODI">ODI</option>
                <option value="T20">T20</option>
              </select>
            </div>

            {/* Min Balls */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Min Balls</label>
              <select
                value={minBalls}
                onChange={(e) => setMinBalls(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-base font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value={10}>10+</option>
                <option value={20}>20+</option>
                <option value={30}>30+</option>
                <option value={50}>50+</option>
                <option value={100}>100+</option>
              </select>
            </div>
          </div>
        </div>

        {/* Selected Player Summary */}
        {selectedPlayer && summary && (
          <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 border border-indigo-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-indigo-900">
                {selectedPlayer}
                <span className="ml-2 text-sm font-normal text-indigo-600">
                  ({mode === 'batter' ? 'Batter' : 'Bowler'})
                </span>
              </h2>
              <span className="text-sm text-indigo-600">
                {matchType !== 'All' && `${matchType} | `}
                {summary.matchups} matchups shown
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-white rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-indigo-700">{summary.totalBalls.toLocaleString()}</div>
                <div className="text-xs text-slate-600">Balls</div>
              </div>
              <div className="bg-white rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-indigo-700">{summary.totalRuns.toLocaleString()}</div>
                <div className="text-xs text-slate-600">Runs</div>
              </div>
              <div className="bg-white rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-indigo-700">{summary.totalDismissals}</div>
                <div className="text-xs text-slate-600">{mode === 'batter' ? 'Dismissals' : 'Wickets'}</div>
              </div>
              <div className="bg-white rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-indigo-700">{summary.overallAvg}</div>
                <div className="text-xs text-slate-600">Average</div>
              </div>
              <div className="bg-white rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-indigo-700">{summary.overallSR}</div>
                <div className="text-xs text-slate-600">{mode === 'batter' ? 'Strike Rate' : 'Economy'}</div>
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          </div>
        )}

        {/* No Player Selected */}
        {!selectedPlayer && !loading && (
          <div className="text-center py-12 text-slate-500">
            <Users className="h-12 w-12 mx-auto mb-3 text-slate-300" />
            <p className="text-lg font-medium">Search for a player to see matchups</p>
            <p className="text-sm">Start typing a player name above</p>
          </div>
        )}

        {/* Results Table */}
        {!loading && selectedPlayer && sortedMatchups.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th
                      onClick={() => handleSort('opponent')}
                      className="text-left px-4 py-3 text-sm font-semibold text-slate-700 cursor-pointer hover:bg-slate-100"
                    >
                      {mode === 'batter' ? 'Bowler' : 'Batter'} <SortIcon field="opponent" />
                    </th>
                    <th
                      onClick={() => handleSort('balls')}
                      className="text-right px-4 py-3 text-sm font-semibold text-slate-700 cursor-pointer hover:bg-slate-100"
                    >
                      Balls <SortIcon field="balls" />
                    </th>
                    <th
                      onClick={() => handleSort('runs')}
                      className="text-right px-4 py-3 text-sm font-semibold text-slate-700 cursor-pointer hover:bg-slate-100"
                    >
                      Runs <SortIcon field="runs" />
                    </th>
                    <th
                      onClick={() => handleSort('dismissals')}
                      className="text-right px-4 py-3 text-sm font-semibold text-slate-700 cursor-pointer hover:bg-slate-100"
                    >
                      {mode === 'batter' ? 'Out' : 'Wkts'} <SortIcon field="dismissals" />
                    </th>
                    <th
                      onClick={() => handleSort('average')}
                      className="text-right px-4 py-3 text-sm font-semibold text-slate-700 cursor-pointer hover:bg-slate-100"
                    >
                      Avg <SortIcon field="average" />
                    </th>
                    <th
                      onClick={() => handleSort('strikeRate')}
                      className="text-right px-4 py-3 text-sm font-semibold text-slate-700 cursor-pointer hover:bg-slate-100"
                    >
                      {mode === 'batter' ? 'SR' : 'Econ'} <SortIcon field="strikeRate" />
                    </th>
                    <th
                      onClick={() => handleSort('dotPct')}
                      className="text-right px-4 py-3 text-sm font-semibold text-slate-700 cursor-pointer hover:bg-slate-100"
                    >
                      Dot% <SortIcon field="dotPct" />
                    </th>
                    <th
                      onClick={() => handleSort('fours')}
                      className="text-right px-4 py-3 text-sm font-semibold text-slate-700 cursor-pointer hover:bg-slate-100"
                    >
                      4s <SortIcon field="fours" />
                    </th>
                    <th
                      onClick={() => handleSort('sixes')}
                      className="text-right px-4 py-3 text-sm font-semibold text-slate-700 cursor-pointer hover:bg-slate-100"
                    >
                      6s <SortIcon field="sixes" />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedMatchups.map((row, index) => (
                    <tr
                      key={row.opponent}
                      className={`border-b border-slate-100 hover:bg-slate-50 ${
                        index % 2 === 0 ? 'bg-white' : 'bg-slate-25'
                      }`}
                    >
                      <td className="px-4 py-3 text-sm font-medium text-slate-800">{row.opponent}</td>
                      <td className="px-4 py-3 text-sm text-right text-slate-700">{row.balls}</td>
                      <td className="px-4 py-3 text-sm text-right font-semibold text-slate-800">{row.runs}</td>
                      <td className="px-4 py-3 text-sm text-right text-slate-700">{row.dismissals}</td>
                      <td className={`px-4 py-3 text-sm text-right font-medium ${
                        row.average >= 50 ? 'text-emerald-600' : row.average < 25 ? 'text-red-600' : 'text-slate-700'
                      }`}>
                        {row.average}
                      </td>
                      <td className={`px-4 py-3 text-sm text-right ${
                        mode === 'batter'
                          ? row.strikeRate >= 100 ? 'text-emerald-600 font-medium' : row.strikeRate < 50 ? 'text-red-600' : 'text-slate-700'
                          : row.strikeRate <= 6 ? 'text-emerald-600 font-medium' : row.strikeRate > 9 ? 'text-red-600' : 'text-slate-700'
                      }`}>
                        {row.strikeRate}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-slate-600">{row.dotPct}%</td>
                      <td className="px-4 py-3 text-sm text-right text-slate-700">{row.fours}</td>
                      <td className="px-4 py-3 text-sm text-right text-slate-700">{row.sixes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* No Results */}
        {!loading && selectedPlayer && sortedMatchups.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <p className="text-lg font-medium">No matchups found</p>
            <p className="text-sm">Try lowering the minimum balls filter</p>
          </div>
        )}
      </div>

      {/* Info Modal */}
      {showInfo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">How to Use</h3>
              <button onClick={() => setShowInfo(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3 text-sm text-slate-600">
              <p>
                <strong>Batter vs Bowlers:</strong> Select a batter to see their record against every bowler they've faced.
              </p>
              <p>
                <strong>Bowler vs Batters:</strong> Select a bowler to see their record against every batter they've bowled to.
              </p>
              <p>
                <strong>Columns explained:</strong>
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Balls:</strong> Number of balls faced/bowled</li>
                <li><strong>Runs:</strong> Runs scored/conceded</li>
                <li><strong>Out/Wkts:</strong> Times dismissed / Wickets taken</li>
                <li><strong>Avg:</strong> Runs per dismissal</li>
                <li><strong>SR/Econ:</strong> Strike rate (batter) / Economy rate (bowler)</li>
                <li><strong>Dot%:</strong> Percentage of dot balls</li>
              </ul>
              <p className="text-slate-500">
                Click column headers to sort. Green = good performance, Red = poor performance.
              </p>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
