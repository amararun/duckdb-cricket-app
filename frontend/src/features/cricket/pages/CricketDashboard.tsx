import { useState, useEffect } from 'react'
import {
  MapPin,
  Loader2,
  ChevronDown,
  ChevronUp,
  Info,
  X
} from 'lucide-react'
import { executeCricketQuery } from '../../../services/api'

// Types
interface DashboardStats {
  totalMatches: number
  odiMatches: number
  t20Matches: number
  testMatches: number
  uniqueTeams: number
  uniqueVenues: number
  dateRange: { from: string; to: string }
}

interface TeamWinRate {
  team: string
  matches: number
  wins: number
  winRate: number
}

interface RecentMatch {
  matchId: number
  matchType: string
  date: string
  venue: string
  team1: string
  team2: string
  winner: string
  winnerRuns: number | null
  winnerWickets: number | null
}

interface YearlyMatches {
  year: number
  odi: number
  t20: number
  test: number
  total: number
}

export function CricketDashboard() {
  const [matchType, setMatchType] = useState<'All' | 'ODI' | 'T20' | 'TEST'>('All')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Data states
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [teamWinRates, setTeamWinRates] = useState<TeamWinRate[]>([])
  const [recentMatches, setRecentMatches] = useState<RecentMatch[]>([])
  const [yearlyMatches, setYearlyMatches] = useState<YearlyMatches[]>([])

  // UI states
  const [showAllMatches, setShowAllMatches] = useState(false)
  const [winRatesLoading, setWinRatesLoading] = useState(false)
  const [showInfo, setShowInfo] = useState(false)

  // Fetch dashboard stats from match_info table
  useEffect(() => {
    async function fetchStats() {
      try {
        const result = await executeCricketQuery(`
          SELECT
            COUNT(*) as total_matches,
            COUNT(CASE WHEN match_type = 'ODI' THEN 1 END) as odi_matches,
            COUNT(CASE WHEN match_type = 'T20' THEN 1 END) as t20_matches,
            COUNT(CASE WHEN match_type = 'TEST' THEN 1 END) as test_matches,
            COUNT(DISTINCT team1) + COUNT(DISTINCT team2) as unique_teams_estimate,
            COUNT(DISTINCT venue) as unique_venues,
            MIN(start_date) as min_date,
            MAX(start_date) as max_date
          FROM match_info
        `)

        // Get actual unique teams count
        const teamsResult = await executeCricketQuery(`
          SELECT COUNT(DISTINCT team) as teams FROM (
            SELECT team1 as team FROM match_info
            UNION
            SELECT team2 as team FROM match_info
          )
        `)

        if (result.rows.length > 0) {
          const row = result.rows[0]
          setStats({
            totalMatches: row[0] as number,
            odiMatches: row[1] as number,
            t20Matches: row[2] as number,
            testMatches: row[3] as number,
            uniqueTeams: teamsResult.rows[0][0] as number,
            uniqueVenues: row[5] as number,
            dateRange: {
              from: row[6] as string,
              to: row[7] as string
            }
          })
        }
      } catch (err) {
        console.error('Failed to fetch stats:', err)
      }
    }
    fetchStats()
  }, [])

  // Fetch team win rates from match_info table
  useEffect(() => {
    async function fetchWinRates() {
      setWinRatesLoading(true)
      try {
        const typeFilter = matchType !== 'All' ? `WHERE match_type = '${matchType}'` : ''

        const result = await executeCricketQuery(`
          WITH team_matches AS (
            SELECT team1 as team, winner FROM match_info ${typeFilter}
            UNION ALL
            SELECT team2 as team, winner FROM match_info ${typeFilter}
          ),
          team_stats AS (
            SELECT
              team,
              COUNT(*) as matches,
              SUM(CASE WHEN winner = team THEN 1 ELSE 0 END) as wins
            FROM team_matches
            WHERE team IS NOT NULL
            GROUP BY team
            HAVING COUNT(*) >= 50
          )
          SELECT
            team,
            matches,
            wins,
            ROUND(wins * 100.0 / matches, 1) as win_rate
          FROM team_stats
          ORDER BY win_rate DESC
          LIMIT 10
        `)

        setTeamWinRates(result.rows.map(row => ({
          team: row[0] as string,
          matches: row[1] as number,
          wins: row[2] as number,
          winRate: row[3] as number
        })))
      } catch (err) {
        console.error('Failed to fetch win rates:', err)
      } finally {
        setWinRatesLoading(false)
      }
    }
    fetchWinRates()
  }, [matchType])

  // Fetch recent matches from match_info table
  useEffect(() => {
    async function fetchRecentMatches() {
      try {
        const typeFilter = matchType !== 'All' ? `WHERE match_type = '${matchType}'` : ''

        const result = await executeCricketQuery(`
          SELECT
            match_id,
            match_type,
            start_date,
            venue,
            team1,
            team2,
            winner,
            winner_runs,
            winner_wickets
          FROM match_info
          ${typeFilter}
          ORDER BY start_date DESC
          LIMIT 50
        `)

        setRecentMatches(result.rows.map(row => ({
          matchId: row[0] as number,
          matchType: row[1] as string,
          date: row[2] as string,
          venue: row[3] as string,
          team1: row[4] as string,
          team2: row[5] as string,
          winner: row[6] as string || 'No Result',
          winnerRuns: row[7] as number | null,
          winnerWickets: row[8] as number | null
        })))
      } catch (err) {
        console.error('Failed to fetch recent matches:', err)
      }
    }
    fetchRecentMatches()
  }, [matchType])

  // Fetch yearly match counts from match_info table
  useEffect(() => {
    async function fetchYearlyMatches() {
      setLoading(true)
      setError(null)
      try {
        const result = await executeCricketQuery(`
          SELECT
            EXTRACT(YEAR FROM start_date)::INT as year,
            COUNT(CASE WHEN match_type = 'ODI' THEN 1 END) as odi,
            COUNT(CASE WHEN match_type = 'T20' THEN 1 END) as t20,
            COUNT(CASE WHEN match_type = 'TEST' THEN 1 END) as test,
            COUNT(*) as total
          FROM match_info
          GROUP BY EXTRACT(YEAR FROM start_date)
          ORDER BY year
        `)

        setYearlyMatches(result.rows.map(row => ({
          year: row[0] as number,
          odi: row[1] as number,
          t20: row[2] as number,
          test: row[3] as number,
          total: row[4] as number
        })))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data')
      } finally {
        setLoading(false)
      }
    }
    fetchYearlyMatches()
  }, [])

  const displayedMatches = showAllMatches ? recentMatches : recentMatches.slice(0, 10)
  const maxWinRate = Math.max(...teamWinRates.map(t => t.winRate), 100)

  // Format result string
  function formatResult(match: RecentMatch): string {
    if (!match.winner || match.winner === 'No Result') return 'No Result'
    if (match.winnerRuns && match.winnerRuns > 0) {
      return `${match.winner} won by ${match.winnerRuns} runs`
    }
    if (match.winnerWickets && match.winnerWickets > 0) {
      return `${match.winner} won by ${match.winnerWickets} wickets`
    }
    return `${match.winner} won`
  }

  return (
    <div className="flex-1 p-6 bg-white">
      <div className="max-w-7xl mx-auto">
        {/* Page Title with Info Button */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Cricket Analytics</h1>
            <p className="text-base font-medium text-gray-900 mt-1">
              Match statistics and team performance
            </p>
          </div>
          <button
            onClick={() => setShowInfo(true)}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            title="Dashboard info"
          >
            <Info className="h-5 w-5" />
          </button>
        </div>

        {/* Info Modal */}
        {showInfo && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Dashboard - Data Overview</h2>
                <button
                  onClick={() => setShowInfo(false)}
                  className="p-1 hover:bg-gray-100 text-gray-700"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <div className="px-6 py-4 overflow-y-auto max-h-[60vh]">
                <h3 className="font-semibold text-gray-900 mb-3">Data Source</h3>
                <p className="text-base text-gray-700 mb-4">
                  This dashboard displays international cricket match data including Test, ODI, and T20 formats.
                  Data is sourced from ball-by-ball records covering matches from 2002 to present.
                </p>

                <h3 className="font-semibold text-gray-900 mb-3">Stats Cards</h3>
                <table className="w-full mb-4">
                  <tbody className="text-base text-gray-700">
                    <tr className="border-b border-gray-100">
                      <td className="py-2 font-medium">Total Matches</td>
                      <td className="py-2">All matches in the database across all formats</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="py-2 font-medium">Test/ODI/T20</td>
                      <td className="py-2">Match counts broken down by format</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="py-2 font-medium">Teams</td>
                      <td className="py-2">Unique teams (includes Associate Nations)</td>
                    </tr>
                  </tbody>
                </table>

                <h3 className="font-semibold text-gray-900 mb-3">Team Win Rates</h3>
                <table className="w-full mb-4">
                  <tbody className="text-base text-gray-700">
                    <tr className="border-b border-gray-100">
                      <td className="py-2 font-medium">Win Rate %</td>
                      <td className="py-2">(Wins / Total Matches) × 100</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="py-2 font-medium">Filter</td>
                      <td className="py-2">Only teams with 50+ matches shown</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="py-2 font-medium">Note</td>
                      <td className="py-2">Win rate depends on opponent strength. Associate nations often have high rates against weaker opponents.</td>
                    </tr>
                  </tbody>
                </table>

                <h3 className="font-semibold text-gray-900 mb-3">Matches by Year</h3>
                <p className="text-base text-gray-700 mb-4">
                  Stacked bar chart showing the number of matches per year, broken down by format (Test, ODI, T20).
                  Shows the last 15 years of data.
                </p>

                <h3 className="font-semibold text-gray-900 mb-3">Recent Matches</h3>
                <p className="text-base text-gray-700 mb-4">
                  Lists the most recent matches with result details. Winner is determined from the <code className="bg-gray-100 px-1">match_info</code> table.
                  Results show margin (runs or wickets).
                </p>

                <div className="mt-4 p-4 border border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-2">Data Notes</h3>
                  <ul className="text-base text-gray-700 space-y-1">
                    <li>• Data covers TEST, ODI, and T20 internationals</li>
                    <li>• Ball-by-ball records: ~4.4 million deliveries</li>
                    <li>• Match records: ~8,700 matches</li>
                    <li>• Use the filter buttons to view specific formats</li>
                  </ul>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-200">
                <button
                  onClick={() => setShowInfo(false)}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Filter Bar */}
        <div className="mb-6 flex items-center gap-4">
          <span className="text-sm font-medium text-gray-700">Match Type:</span>
          <div className="flex border border-gray-200">
            {(['All', 'ODI', 'T20', 'TEST'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setMatchType(type)}
                className={`px-4 py-1.5 text-sm font-medium border-r border-gray-200 last:border-r-0 ${
                  matchType === type
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {type === 'TEST' ? 'Test' : type}
              </button>
            ))}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 border border-red-200 text-red-600">
            {error}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          <StatCard
            label="Total Matches"
            value={stats?.totalMatches.toLocaleString() ?? '--'}
            subtext={stats ? `${stats.dateRange.from.split('-')[0]} - ${stats.dateRange.to.split('-')[0]}` : ''}
          />
          <StatCard
            label="Test Matches"
            value={stats?.testMatches.toLocaleString() ?? '--'}
          />
          <StatCard
            label="ODI Matches"
            value={stats?.odiMatches.toLocaleString() ?? '--'}
          />
          <StatCard
            label="T20 Matches"
            value={stats?.t20Matches.toLocaleString() ?? '--'}
          />
          <StatCard
            label="Teams"
            value={stats?.uniqueTeams.toLocaleString() ?? '--'}
            subtext={`${stats?.uniqueVenues.toLocaleString() ?? '--'} venues`}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Team Win Rates Chart */}
          <div className="bg-white border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Team Win Rates {matchType !== 'All' && `(${matchType === 'TEST' ? 'Test' : matchType})`}
            </h2>
            {winRatesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-600" />
              </div>
            ) : teamWinRates.length > 0 ? (
              <div className="space-y-2">
                {teamWinRates.map((team, index) => (
                  <div key={team.team} className="flex items-center gap-3">
                    <span className="w-5 text-sm font-medium text-gray-900 text-right">
                      {index + 1}
                    </span>
                    <span className="w-28 text-sm font-medium text-gray-900 truncate">
                      {team.team}
                    </span>
                    <div className="flex-1 bg-gray-100 h-5 overflow-hidden">
                      <div
                        className="h-full bg-blue-600 flex items-center justify-end pr-2"
                        style={{ width: `${(team.winRate / maxWinRate) * 100}%` }}
                      >
                        <span className="text-xs font-semibold text-white">
                          {team.winRate}%
                        </span>
                      </div>
                    </div>
                    <span className="w-16 text-sm font-medium text-gray-900 text-right tabular-nums">
                      {team.wins}/{team.matches}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-700">
                No data available
              </div>
            )}
            <p className="text-xs text-gray-600 mt-4">
              Teams with 50+ matches. Shows wins/total matches.
            </p>
          </div>

          {/* Matches by Year Chart */}
          <div className="bg-white border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Matches by Year
            </h2>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-600" />
              </div>
            ) : yearlyMatches.length > 0 ? (
              <div className="relative">
                {/* Chart */}
                <div className="h-64 flex items-end gap-1 pb-6">
                  {yearlyMatches.slice(-15).map((year) => {
                    const maxTotal = Math.max(...yearlyMatches.slice(-15).map(y => y.total))
                    const testHeight = (year.test / maxTotal) * 100
                    const odiHeight = (year.odi / maxTotal) * 100
                    const t20Height = (year.t20 / maxTotal) * 100

                    return (
                      <div
                        key={year.year}
                        className="flex-1 flex flex-col items-center group"
                      >
                        <div className="w-full flex flex-col justify-end h-52">
                          {/* T20 bar - teal */}
                          <div
                            className="w-full bg-teal-500"
                            style={{ height: `${t20Height}%` }}
                            title={`T20: ${year.t20}`}
                          />
                          {/* ODI bar - blue */}
                          <div
                            className="w-full bg-blue-500"
                            style={{ height: `${odiHeight}%` }}
                            title={`ODI: ${year.odi}`}
                          />
                          {/* Test bar - gray */}
                          <div
                            className="w-full bg-gray-700"
                            style={{ height: `${testHeight}%` }}
                            title={`Test: ${year.test}`}
                          />
                        </div>
                        <span className="text-xs text-gray-600 mt-2">
                          {year.year.toString().slice(-2)}
                        </span>
                        {/* Tooltip */}
                        <div className="absolute bottom-full mb-2 hidden group-hover:block bg-gray-900 text-white text-xs px-2 py-1 whitespace-nowrap z-10">
                          {year.year}: {year.total} ({year.test} Test, {year.odi} ODI, {year.t20} T20)
                        </div>
                      </div>
                    )
                  })}
                </div>
                {/* Legend */}
                <div className="flex justify-center gap-6 mt-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-gray-700" />
                    <span className="text-sm font-medium text-gray-900">Test</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500" />
                    <span className="text-sm font-medium text-gray-900">ODI</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-teal-500" />
                    <span className="text-sm font-medium text-gray-900">T20</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-700">
                No data available
              </div>
            )}
          </div>
        </div>

        {/* Recent Matches Table */}
        <div className="bg-white border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Recent Matches {matchType !== 'All' && `(${matchType === 'TEST' ? 'Test' : matchType})`}
            </h2>
            <span className="text-sm font-medium text-gray-900">
              {recentMatches.length} matches
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-900 uppercase tracking-wide">Date</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-900 uppercase tracking-wide">Type</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-900 uppercase tracking-wide">Match</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-900 uppercase tracking-wide">Result</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-900 uppercase tracking-wide">
                    <MapPin className="h-4 w-4 inline mr-1" />
                    Venue
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayedMatches.map((match) => (
                  <tr
                    key={match.matchId}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 tabular-nums">
                      {new Date(match.date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {match.matchType === 'TEST' ? 'Test' : match.matchType}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {match.team1} vs {match.team2}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-green-700">
                      {formatResult(match)}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 max-w-xs truncate">
                      {match.venue}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Show More/Less Button */}
          {recentMatches.length > 10 && (
            <div className="px-6 py-3 border-t border-gray-200">
              <button
                onClick={() => setShowAllMatches(!showAllMatches)}
                className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                {showAllMatches ? (
                  <>
                    <ChevronUp className="h-4 w-4" />
                    Show Less
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4" />
                    Show All {recentMatches.length} Matches
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Data Info */}
        {stats && (
          <div className="mt-6 text-center text-sm font-medium text-gray-900">
            Data covers {stats.totalMatches.toLocaleString()} matches from {stats.dateRange.from} to {stats.dateRange.to}
          </div>
        )}
      </div>
    </div>
  )
}

interface StatCardProps {
  label: string
  value: string
  subtext?: string
}

function StatCard({ label, value, subtext }: StatCardProps) {
  return (
    <div className="bg-white border border-gray-200 p-5">
      <p className="text-3xl font-bold text-gray-900 tabular-nums">{value}</p>
      <p className="text-sm font-medium text-gray-900 mt-1">{label}</p>
      {subtext && <p className="text-xs text-gray-600 mt-0.5">{subtext}</p>}
    </div>
  )
}
