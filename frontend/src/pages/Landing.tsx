import { useNavigate } from 'react-router-dom'
import { useState, useEffect, useCallback } from 'react'
import { executeCricketQuery, executeImdbQuery } from '../services/api'

// Types for mini dashboards
interface CricketStats {
  totalRuns: number
  topScorer: string
  topScorerRuns: number
  topBatters: { name: string; runs: number }[]
}

interface ImdbStats {
  totalTitles: number
  topMovie: string
  topRating: number
  topMovies: { title: string; year: number; rating: number }[]
}

export function Landing() {
  const navigate = useNavigate()

  // Cricket mini dashboard state
  const [cricketFormat, setCricketFormat] = useState('All')
  const [cricketYearRange, setCricketYearRange] = useState([2015, 2025])
  const [cricketStats, setCricketStats] = useState<CricketStats | null>(null)
  const [cricketLoading, setCricketLoading] = useState(false)

  // IMDb mini dashboard state
  const [imdbGenre, setImdbGenre] = useState('All')
  const [imdbMinRating, setImdbMinRating] = useState(7.0)
  const [imdbStats, setImdbStats] = useState<ImdbStats | null>(null)
  const [imdbLoading, setImdbLoading] = useState(false)

  // Debounce helper
  const useDebounce = (value: number | number[], delay: number) => {
    const [debouncedValue, setDebouncedValue] = useState(value)
    useEffect(() => {
      const handler = setTimeout(() => setDebouncedValue(value), delay)
      return () => clearTimeout(handler)
    }, [value, delay])
    return debouncedValue
  }

  const debouncedYearRange = useDebounce(cricketYearRange, 300)
  const debouncedMinRating = useDebounce(imdbMinRating, 300)

  // Fetch Cricket stats
  const fetchCricketStats = useCallback(async () => {
    setCricketLoading(true)
    try {
      const formatFilter = cricketFormat !== 'All' ? `AND match_type = '${cricketFormat}'` : ''
      const yearStart = Array.isArray(debouncedYearRange) ? debouncedYearRange[0] : 2015
      const yearEnd = Array.isArray(debouncedYearRange) ? debouncedYearRange[1] : 2025

      // Get total runs and top batters
      const result = await executeCricketQuery(`
        SELECT
          striker as player,
          SUM(runs_off_bat) as runs
        FROM ball_by_ball b
        JOIN match_info m ON b.match_id = m.match_id
        WHERE EXTRACT(YEAR FROM m.start_date) >= ${yearStart}
          AND EXTRACT(YEAR FROM m.start_date) <= ${yearEnd}
          ${formatFilter}
        GROUP BY striker
        ORDER BY runs DESC
        LIMIT 5
      `)

      // Get total runs
      const totalResult = await executeCricketQuery(`
        SELECT SUM(runs_off_bat) as total_runs
        FROM ball_by_ball b
        JOIN match_info m ON b.match_id = m.match_id
        WHERE EXTRACT(YEAR FROM m.start_date) >= ${yearStart}
          AND EXTRACT(YEAR FROM m.start_date) <= ${yearEnd}
          ${formatFilter}
      `)

      if (result.rows.length > 0) {
        const topBatters = result.rows.map(row => ({
          name: row[0] as string,
          runs: row[1] as number
        }))

        setCricketStats({
          totalRuns: (totalResult.rows[0]?.[0] as number) || 0,
          topScorer: topBatters[0]?.name || 'N/A',
          topScorerRuns: topBatters[0]?.runs || 0,
          topBatters
        })
      }
    } catch (err) {
      console.error('Failed to fetch cricket stats:', err)
    } finally {
      setCricketLoading(false)
    }
  }, [cricketFormat, debouncedYearRange])

  // Fetch IMDb stats
  const fetchImdbStats = useCallback(async () => {
    setImdbLoading(true)
    try {
      const minRating = typeof debouncedMinRating === 'number' ? debouncedMinRating : 7.0
      const genreFilter = imdbGenre !== 'All' ? `AND genres LIKE '%${imdbGenre}%'` : ''

      // Get top movies
      const result = await executeImdbQuery(`
        SELECT
          primaryTitle as title,
          startYear as year,
          averageRating as rating
        FROM title_basics tb
        JOIN title_ratings tr ON tb.tconst = tr.tconst
        WHERE titleType = 'movie'
          AND averageRating >= ${minRating}
          AND numVotes >= 10000
          ${genreFilter}
        ORDER BY averageRating DESC, numVotes DESC
        LIMIT 5
      `)

      // Get count
      const countResult = await executeImdbQuery(`
        SELECT COUNT(*) as total
        FROM title_basics tb
        JOIN title_ratings tr ON tb.tconst = tr.tconst
        WHERE titleType = 'movie'
          AND averageRating >= ${minRating}
          AND numVotes >= 10000
          ${genreFilter}
      `)

      if (result.rows.length > 0) {
        const topMovies = result.rows.map(row => ({
          title: row[0] as string,
          year: row[1] as number,
          rating: row[2] as number
        }))

        setImdbStats({
          totalTitles: (countResult.rows[0]?.[0] as number) || 0,
          topMovie: topMovies[0]?.title || 'N/A',
          topRating: topMovies[0]?.rating || 0,
          topMovies
        })
      }
    } catch (err) {
      console.error('Failed to fetch IMDb stats:', err)
      setImdbStats(null)
    } finally {
      setImdbLoading(false)
    }
  }, [imdbGenre, debouncedMinRating])

  // Fetch on mount and filter changes
  useEffect(() => {
    fetchCricketStats()
  }, [fetchCricketStats])

  useEffect(() => {
    fetchImdbStats()
  }, [fetchImdbStats])

  // Format large numbers
  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toLocaleString()
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        {/* Hero Section */}
        <div className="pb-10">
          <div className="flex items-center justify-between mb-5">
            <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900">
              DuckDB Dashboards
            </h1>
            <div className="flex items-center gap-3">
              <span className="text-base text-gray-600 font-medium">Powered by</span>
              <img
                src="/images/logos/duckdb/DuckDB_inline-lightmode.png"
                alt="DuckDB"
                className="h-8"
              />
            </div>
          </div>
          <p className="text-xl font-semibold text-gray-700 max-w-3xl">
            Live analytics dashboards. Query multi-GB datasets in milliseconds.
          </p>
        </div>

        {/* Data Source Cards - With Bold Images */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Cricket Card */}
          <div
            className="border border-gray-200 bg-white cursor-pointer hover:border-gray-300 transition-colors overflow-hidden"
            onClick={() => navigate('/cricket')}
          >
            {/* Hero Image */}
            <div className="h-48 overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=800&q=80"
                alt="Cricket Stadium"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Cricket Analytics</h2>
              <p className="text-lg text-gray-600 font-medium mb-4">International T20, ODI & Test Data</p>

              <p className="text-lg font-medium text-gray-700 mb-6">
                Ball-by-ball analysis of international matches. Batting averages, bowling economy,
                head-to-head matchups, and team performance.
              </p>

              <div className="flex gap-10 mb-6">
                <div>
                  <div className="text-2xl font-extrabold text-gray-900">4.4M</div>
                  <div className="text-base text-gray-600 font-semibold">Deliveries</div>
                </div>
                <div>
                  <div className="text-2xl font-extrabold text-gray-900">8,700+</div>
                  <div className="text-base text-gray-600 font-semibold">Matches</div>
                </div>
                <div>
                  <div className="text-2xl font-extrabold text-gray-900">2002-25</div>
                  <div className="text-base text-gray-600 font-semibold">Coverage</div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-blue-600 font-bold text-lg">
                <span>View Cricket Dashboard</span>
                <span>&rarr;</span>
              </div>
            </div>
          </div>

          {/* IMDb Card */}
          <div
            className="border border-gray-200 bg-white cursor-pointer hover:border-gray-300 transition-colors overflow-hidden"
            onClick={() => navigate('/imdb')}
          >
            {/* Hero Image */}
            <div className="h-48 overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&q=80"
                alt="Cinema"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">IMDb Analytics</h2>
              <p className="text-lg text-gray-600 font-medium mb-4">Movies & TV Database</p>

              <p className="text-lg font-medium text-gray-700 mb-6">
                Explore millions of titles, ratings, and cast information from IMDb.
                Top rated films, actor careers, and genre trends.
              </p>

              <div className="flex gap-10 mb-6">
                <div>
                  <div className="text-2xl font-extrabold text-gray-900">28M+</div>
                  <div className="text-base text-gray-600 font-semibold">Records</div>
                </div>
                <div>
                  <div className="text-2xl font-extrabold text-gray-900">12M</div>
                  <div className="text-base text-gray-600 font-semibold">Titles</div>
                </div>
                <div>
                  <div className="text-2xl font-extrabold text-gray-900">3 GB</div>
                  <div className="text-base text-gray-600 font-semibold">Database</div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-blue-600 font-bold text-lg">
                <span>View IMDb Dashboard</span>
                <span>&rarr;</span>
              </div>
            </div>
          </div>
        </div>

        {/* How It Works Section */}
        <div className="border-t border-gray-200 pt-10 mb-12">
          <h3 className="text-2xl font-bold text-gray-900 mb-8">
            How It Works
          </h3>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="border border-gray-200 p-6">
              <h4 className="text-xl font-bold text-gray-900 mb-3">DuckDB Backend</h4>
              <p className="text-lg font-medium text-gray-700">
                Multi-GB DuckDB files. Columnar format for fast analytical queries.
              </p>
            </div>
            <div className="border border-gray-200 p-6">
              <h4 className="text-xl font-bold text-gray-900 mb-3">FastAPI Server</h4>
              <p className="text-lg font-medium text-gray-700">
                Python backend on Hetzner. SQL queries returning JSON.
              </p>
            </div>
            <div className="border border-gray-200 p-6">
              <h4 className="text-xl font-bold text-gray-900 mb-3">React Frontend</h4>
              <p className="text-lg font-medium text-gray-700">
                Vercel-hosted. Charts, tables, and real-time filtering.
              </p>
            </div>
          </div>
        </div>

        {/* Live Mini Dashboards Section */}
        <div className="border-t border-gray-200 pt-10 mb-12">
          <h3 className="text-2xl font-bold text-gray-900 mb-8">
            Live Stats Preview
          </h3>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Cricket Mini Dashboard */}
            <div className="border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-5">
                <h4 className="text-xl font-bold text-gray-900">
                  Cricket Stats
                </h4>
                <span className="text-sm text-gray-500 uppercase tracking-wide font-semibold flex items-center gap-2">
                  {cricketLoading && <span className="animate-spin">&#9696;</span>}
                  Live Data
                </span>
              </div>

              {/* Stat Cards */}
              <div className="grid grid-cols-2 gap-4 mb-5">
                <div className="bg-gray-50 p-4 border border-gray-200">
                  <div className="text-3xl font-extrabold text-gray-900">
                    {cricketStats ? formatNumber(cricketStats.totalRuns) : '—'}
                  </div>
                  <div className="text-base text-gray-600 font-semibold">Total Runs</div>
                </div>
                <div className="bg-gray-50 p-4 border border-gray-200">
                  <div className="text-xl font-bold text-gray-900 truncate" title={cricketStats?.topScorer}>
                    {cricketStats?.topScorer || '—'}
                  </div>
                  <div className="text-base text-gray-600 font-semibold">
                    {cricketStats ? formatNumber(cricketStats.topScorerRuns) + ' runs' : 'Top Scorer'}
                  </div>
                </div>
              </div>

              {/* Filters */}
              <div className="flex gap-4 mb-5">
                <div className="flex-1">
                  <label className="block text-sm text-gray-700 mb-2 font-semibold">Format</label>
                  <select
                    value={cricketFormat}
                    onChange={(e) => setCricketFormat(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-base text-gray-900 font-medium focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  >
                    <option value="All">All Formats</option>
                    <option value="T20">T20</option>
                    <option value="ODI">ODI</option>
                    <option value="TEST">Test</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm text-gray-700 mb-2 font-semibold">
                    Years: {cricketYearRange[0]} - {cricketYearRange[1]}
                  </label>
                  <input
                    type="range"
                    min="2002"
                    max="2025"
                    value={cricketYearRange[0]}
                    onChange={(e) => setCricketYearRange([parseInt(e.target.value), cricketYearRange[1]])}
                    className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
                  />
                </div>
              </div>

              {/* Top Batters Bar Chart */}
              <div>
                <div className="text-sm text-gray-700 font-semibold mb-3">Top 5 Run Scorers</div>
                {cricketStats?.topBatters.map((batter, idx) => {
                  const maxRuns = cricketStats.topBatters[0]?.runs || 1
                  const percentage = (batter.runs / maxRuns) * 100
                  return (
                    <div key={batter.name} className="mb-2">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-800 font-semibold truncate" style={{ maxWidth: '60%' }}>
                          {idx + 1}. {batter.name}
                        </span>
                        <span className="text-gray-900 font-bold tabular-nums">
                          {formatNumber(batter.runs)}
                        </span>
                      </div>
                      <div className="h-3 bg-gray-100 rounded overflow-hidden">
                        <div
                          className="h-full bg-teal-500 rounded transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
                {!cricketStats && !cricketLoading && (
                  <div className="text-center py-6 text-gray-500 text-base font-medium">
                    Unable to load data - check API connection
                  </div>
                )}
                {cricketLoading && !cricketStats && (
                  <div className="text-center py-6 text-gray-500 text-base font-medium">
                    Loading cricket data...
                  </div>
                )}
              </div>
            </div>

            {/* IMDb Mini Dashboard */}
            <div className="border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-5">
                <h4 className="text-xl font-bold text-gray-900">
                  IMDb Stats
                </h4>
                <span className="text-sm text-gray-500 uppercase tracking-wide font-semibold flex items-center gap-2">
                  {imdbLoading && <span className="animate-spin">&#9696;</span>}
                  Live Data
                </span>
              </div>

              {/* Stat Cards */}
              <div className="grid grid-cols-2 gap-4 mb-5">
                <div className="bg-gray-50 p-4 border border-gray-200">
                  <div className="text-3xl font-extrabold text-gray-900">
                    {imdbStats ? formatNumber(imdbStats.totalTitles) : '—'}
                  </div>
                  <div className="text-base text-gray-600 font-semibold">Movies Found</div>
                </div>
                <div className="bg-gray-50 p-4 border border-gray-200">
                  <div className="text-3xl font-extrabold text-gray-900">
                    {imdbStats?.topRating ? imdbStats.topRating.toFixed(1) : '—'}
                  </div>
                  <div className="text-base text-gray-600 font-semibold">Top Rating</div>
                </div>
              </div>

              {/* Filters */}
              <div className="flex gap-4 mb-5">
                <div className="flex-1">
                  <label className="block text-sm text-gray-700 mb-2 font-semibold">Genre</label>
                  <select
                    value={imdbGenre}
                    onChange={(e) => setImdbGenre(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-base text-gray-900 font-medium focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  >
                    <option value="All">All Genres</option>
                    <option value="Drama">Drama</option>
                    <option value="Comedy">Comedy</option>
                    <option value="Action">Action</option>
                    <option value="Sci-Fi">Sci-Fi</option>
                    <option value="Horror">Horror</option>
                    <option value="Romance">Romance</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm text-gray-700 mb-2 font-semibold">
                    Min Rating: {imdbMinRating.toFixed(1)}
                  </label>
                  <input
                    type="range"
                    min="5"
                    max="9"
                    step="0.5"
                    value={imdbMinRating}
                    onChange={(e) => setImdbMinRating(parseFloat(e.target.value))}
                    className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
                  />
                </div>
              </div>

              {/* Top Movies Table */}
              <div>
                <div className="text-sm text-gray-700 font-semibold mb-3">Top 5 Movies</div>
                {imdbStats?.topMovies && imdbStats.topMovies.length > 0 ? (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 text-sm text-gray-600 font-semibold">Title</th>
                        <th className="text-right py-2 text-sm text-gray-600 font-semibold w-16">Year</th>
                        <th className="text-right py-2 text-sm text-gray-600 font-semibold w-16">Rating</th>
                      </tr>
                    </thead>
                    <tbody>
                      {imdbStats.topMovies.map((movie, idx) => (
                        <tr key={idx} className="border-b border-gray-100 last:border-0">
                          <td className="py-2 text-base text-gray-800 font-medium truncate" style={{ maxWidth: '200px' }}>
                            {movie.title}
                          </td>
                          <td className="py-2 text-right text-base text-gray-600 font-medium tabular-nums">{movie.year || '—'}</td>
                          <td className="py-2 text-right text-base font-bold text-amber-600 tabular-nums">
                            {movie.rating.toFixed(1)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : imdbLoading ? (
                  <div className="text-center py-6 text-gray-500 text-base font-medium">
                    Loading IMDb data...
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-500 text-base font-medium">
                    IMDb data coming soon
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Data Sources Box */}
        <div className="border border-gray-200 p-6 mb-12">
          <h3 className="text-2xl font-bold text-gray-900 mb-5">
            Data Sources
          </h3>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <a
                href="https://cricsheet.org"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xl text-blue-600 hover:underline font-bold"
              >
                Cricsheet.org
              </a>
              <p className="text-base text-gray-700 mt-2 font-medium">
                Ball-by-ball cricket data for international matches. Open data licensed under ODC-BY.
              </p>
            </div>
            <div>
              <a
                href="https://datasets.imdbws.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xl text-blue-600 hover:underline font-bold"
              >
                IMDb Datasets
              </a>
              <p className="text-base text-gray-700 mt-2 font-medium">
                Subsets of IMDb data available for personal and non-commercial use.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-gray-200 pt-5 pb-3">
          <div className="flex flex-col md:flex-row justify-between items-center gap-3">
            <div className="text-center md:text-left text-base font-medium">
              <span className="text-gray-700">Amar Harolikar</span>
              <span className="mx-2 text-blue-600">•</span>
              <span className="text-gray-700">Decision Sciences & Applied AI</span>
              <span className="mx-2 text-blue-600">•</span>
              <span className="text-gray-700">amar@harolikar.com</span>
              <span className="mx-2 text-blue-600">•</span>
              <a
                href="https://www.linkedin.com/in/amarharolikar"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline font-semibold"
              >
                LinkedIn
              </a>
            </div>
            <div className="flex items-center gap-5 text-base font-medium">
              <a
                href="https://github.com/amararun"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                GitHub
              </a>
              <a
                href="https://www.tigzig.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Tigzig
              </a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
