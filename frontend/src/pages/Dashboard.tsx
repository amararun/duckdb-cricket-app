import { useState, useEffect } from 'react'
import {
  Trophy,
  Users,
  Calendar,
  MapPin,
  Loader2,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Shield
} from 'lucide-react'
import { executeQuery } from '../services/api'

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

export function Dashboard() {
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

  // Fetch dashboard stats from match_info table
  useEffect(() => {
    async function fetchStats() {
      try {
        const result = await executeQuery(`
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
        const teamsResult = await executeQuery(`
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

        const result = await executeQuery(`
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

        const result = await executeQuery(`
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
        const result = await executeQuery(`
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
    <div className="flex-1 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Page Title */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">Cricket Analytics Dashboard</h1>
          <p className="text-base text-slate-600 mt-1">
            Match statistics and team performance analytics
          </p>
        </div>

        {/* Filter Bar */}
        <div className="mb-6 flex items-center gap-4">
          <span className="text-sm font-medium text-slate-700">Match Type:</span>
          <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
            {(['All', 'ODI', 'T20', 'TEST'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setMatchType(type)}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  matchType === type
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                {type === 'TEST' ? 'Test' : type}
              </button>
            ))}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <StatCard
            icon={<Calendar className="h-6 w-6" />}
            label="Total Matches"
            value={stats?.totalMatches.toLocaleString() ?? '--'}
            subtext={stats ? `${stats.dateRange.from.split('-')[0]} - ${stats.dateRange.to.split('-')[0]}` : ''}
            color="indigo"
          />
          <StatCard
            icon={<Shield className="h-6 w-6" />}
            label="Test Matches"
            value={stats?.testMatches.toLocaleString() ?? '--'}
            subtext="Test Cricket"
            color="red"
          />
          <StatCard
            icon={<Trophy className="h-6 w-6" />}
            label="ODI Matches"
            value={stats?.odiMatches.toLocaleString() ?? '--'}
            subtext="One Day Internationals"
            color="emerald"
          />
          <StatCard
            icon={<TrendingUp className="h-6 w-6" />}
            label="T20 Matches"
            value={stats?.t20Matches.toLocaleString() ?? '--'}
            subtext="Twenty20 Internationals"
            color="amber"
          />
          <StatCard
            icon={<Users className="h-6 w-6" />}
            label="Teams"
            value={stats?.uniqueTeams.toLocaleString() ?? '--'}
            subtext={`${stats?.uniqueVenues.toLocaleString() ?? '--'} venues`}
            color="rose"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Team Win Rates Chart */}
          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">
              Team Win Rates {matchType !== 'All' && `(${matchType === 'TEST' ? 'Test' : matchType})`}
            </h2>
            {winRatesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
              </div>
            ) : teamWinRates.length > 0 ? (
              <div className="space-y-3">
                {teamWinRates.map((team, index) => (
                  <div key={team.team} className="flex items-center gap-3">
                    <span className="w-6 text-sm font-medium text-slate-500 text-right">
                      {index + 1}
                    </span>
                    <span className="w-32 text-sm font-medium text-slate-800 truncate">
                      {team.team}
                    </span>
                    <div className="flex-1 bg-slate-100 rounded-full h-6 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full flex items-center justify-end pr-2 transition-all duration-500"
                        style={{ width: `${(team.winRate / maxWinRate) * 100}%` }}
                      >
                        <span className="text-xs font-bold text-white">
                          {team.winRate}%
                        </span>
                      </div>
                    </div>
                    <span className="w-16 text-xs text-slate-500 text-right">
                      {team.wins}/{team.matches}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                No data available
              </div>
            )}
            <p className="text-xs text-slate-500 mt-4">
              Teams with 50+ matches. Shows wins/total matches.
            </p>
          </div>

          {/* Matches by Year Chart */}
          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">
              Matches by Year
            </h2>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
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
                          {/* T20 bar */}
                          <div
                            className="w-full bg-amber-400 rounded-t transition-all hover:bg-amber-500"
                            style={{ height: `${t20Height}%` }}
                            title={`T20: ${year.t20}`}
                          />
                          {/* ODI bar */}
                          <div
                            className="w-full bg-emerald-500 transition-all hover:bg-emerald-600"
                            style={{ height: `${odiHeight}%` }}
                            title={`ODI: ${year.odi}`}
                          />
                          {/* Test bar */}
                          <div
                            className="w-full bg-red-500 transition-all hover:bg-red-600"
                            style={{ height: `${testHeight}%` }}
                            title={`Test: ${year.test}`}
                          />
                        </div>
                        <span className="text-xs text-slate-500 mt-1 transform -rotate-45 origin-top-left">
                          {year.year.toString().slice(-2)}
                        </span>
                        {/* Tooltip */}
                        <div className="absolute bottom-full mb-2 hidden group-hover:block bg-slate-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                          {year.year}: {year.total} ({year.test} Test, {year.odi} ODI, {year.t20} T20)
                        </div>
                      </div>
                    )
                  })}
                </div>
                {/* Legend */}
                <div className="flex justify-center gap-6 mt-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded" />
                    <span className="text-xs text-slate-600">Test</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-emerald-500 rounded" />
                    <span className="text-xs text-slate-600">ODI</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-amber-400 rounded" />
                    <span className="text-xs text-slate-600">T20</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                No data available
              </div>
            )}
          </div>
        </div>

        {/* Recent Matches Table */}
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800">
              Recent Matches {matchType !== 'All' && `(${matchType === 'TEST' ? 'Test' : matchType})`}
            </h2>
            <span className="text-sm text-slate-500">
              {recentMatches.length} matches
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-slate-700">Date</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-slate-700">Type</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-slate-700">Match</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-slate-700">Result</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-slate-700">
                    <MapPin className="h-4 w-4 inline mr-1" />
                    Venue
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayedMatches.map((match, index) => (
                  <tr
                    key={match.matchId}
                    className={`border-b border-slate-100 hover:bg-slate-50 ${
                      index % 2 === 0 ? 'bg-white' : 'bg-slate-25'
                    }`}
                  >
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {new Date(match.date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-1 rounded ${
                        match.matchType === 'TEST'
                          ? 'bg-red-100 text-red-700'
                          : match.matchType === 'ODI'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {match.matchType === 'TEST' ? 'Test' : match.matchType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-800">
                      {match.team1} vs {match.team2}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-emerald-700">
                      {formatResult(match)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500 max-w-xs truncate">
                      {match.venue}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Show More/Less Button */}
          {recentMatches.length > 10 && (
            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50">
              <button
                onClick={() => setShowAllMatches(!showAllMatches)}
                className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700"
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
          <div className="mt-6 text-center text-sm text-slate-500">
            Data covers {stats.totalMatches.toLocaleString()} matches from {stats.dateRange.from} to {stats.dateRange.to}
          </div>
        )}
      </div>
    </div>
  )
}

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: string
  subtext?: string
  color: 'indigo' | 'emerald' | 'amber' | 'rose' | 'red'
}

function StatCard({ icon, label, value, subtext, color }: StatCardProps) {
  const colorClasses = {
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-200',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    amber: 'bg-amber-50 text-amber-600 border-amber-200',
    rose: 'bg-rose-50 text-rose-600 border-rose-200',
    red: 'bg-red-50 text-red-600 border-red-200',
  }

  return (
    <div className={`rounded-lg border p-4 ${colorClasses[color]}`}>
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <p className="text-base font-medium text-slate-700">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
          {subtext && <p className="text-xs text-slate-500 mt-0.5">{subtext}</p>}
        </div>
      </div>
    </div>
  )
}
