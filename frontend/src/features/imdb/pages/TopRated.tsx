import { useState, useEffect } from 'react'
import { Search, Filter, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { executeImdbQuery } from '../../../services/api'

interface Movie {
  title: string
  year: number | null
  rating: number
  votes: number
  genres: string | null
  runtime: number | null
}

const VOTE_THRESHOLDS = [
  { label: '1K+ votes', value: 1000 },
  { label: '10K+ votes', value: 10000 },
  { label: '50K+ votes', value: 50000 },
  { label: '100K+ votes', value: 100000 },
  { label: '500K+ votes', value: 500000 },
]

const YEAR_RANGES = [
  { label: 'All Time', from: 1900, to: 2030 },
  { label: '2020s', from: 2020, to: 2029 },
  { label: '2010s', from: 2010, to: 2019 },
  { label: '2000s', from: 2000, to: 2009 },
  { label: '1990s', from: 1990, to: 1999 },
  { label: '1980s', from: 1980, to: 1989 },
  { label: 'Pre-1980', from: 1900, to: 1979 },
]

const GENRES = [
  'All Genres',
  'Action',
  'Adventure',
  'Animation',
  'Biography',
  'Comedy',
  'Crime',
  'Documentary',
  'Drama',
  'Family',
  'Fantasy',
  'History',
  'Horror',
  'Music',
  'Mystery',
  'Romance',
  'Sci-Fi',
  'Sport',
  'Thriller',
  'War',
  'Western',
]

export function TopRated() {
  const [movies, setMovies] = useState<Movie[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [minVotes, setMinVotes] = useState(10000)
  const [yearRange, setYearRange] = useState(YEAR_RANGES[0])
  const [genre, setGenre] = useState('All Genres')
  const [searchTerm, setSearchTerm] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  // Stats
  const [totalCount, setTotalCount] = useState(0)

  useEffect(() => {
    async function fetchMovies() {
      setLoading(true)
      setError(null)
      try {
        // Build WHERE clause
        const conditions = [
          `tb.titleType = 'movie'`,
          `tr.numVotes >= ${minVotes}`,
        ]

        if (yearRange.label !== 'All Time') {
          conditions.push(`tb.startYear >= ${yearRange.from}`)
          conditions.push(`tb.startYear <= ${yearRange.to}`)
        }

        if (genre !== 'All Genres') {
          conditions.push(`tb.genres LIKE '%${genre}%'`)
        }

        if (searchTerm.trim()) {
          conditions.push(`LOWER(tb.primaryTitle) LIKE '%${searchTerm.toLowerCase().trim()}%'`)
        }

        const whereClause = conditions.join(' AND ')

        // Get count first
        const countResult = await executeImdbQuery(`
          SELECT COUNT(*) as total
          FROM title_basics tb
          JOIN title_ratings tr ON tb.tconst = tr.tconst
          WHERE ${whereClause}
        `)
        setTotalCount(countResult.rows[0][0] as number)

        // Get movies
        const result = await executeImdbQuery(`
          SELECT
            tb.primaryTitle as title,
            tb.startYear as year,
            tr.averageRating as rating,
            tr.numVotes as votes,
            tb.genres,
            tb.runtimeMinutes as runtime
          FROM title_basics tb
          JOIN title_ratings tr ON tb.tconst = tr.tconst
          WHERE ${whereClause}
          ORDER BY tr.averageRating DESC, tr.numVotes DESC
          LIMIT 100
        `)

        setMovies(result.rows.map(row => ({
          title: row[0] as string,
          year: row[1] as number | null,
          rating: row[2] as number,
          votes: row[3] as number,
          genres: row[4] as string | null,
          runtime: row[5] as number | null,
        })))

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data')
      } finally {
        setLoading(false)
      }
    }

    const debounce = setTimeout(fetchMovies, searchTerm ? 300 : 0)
    return () => clearTimeout(debounce)
  }, [minVotes, yearRange, genre, searchTerm])

  function formatNumber(n: number): string {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
    return n.toLocaleString()
  }

  function formatRuntime(mins: number | null): string {
    if (!mins) return '-'
    const hours = Math.floor(mins / 60)
    const minutes = mins % 60
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
  }

  return (
    <div className="flex-1 p-6 bg-white">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Top Rated Movies</h1>
          <p className="text-base font-medium text-gray-900 mt-1">
            Explore the highest-rated movies from IMDb
          </p>
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-white border border-gray-200 p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-900" />
              <input
                type="text"
                placeholder="Search movies..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base font-medium text-gray-900 placeholder:text-gray-400"
              />
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-900 font-medium transition-colors"
            >
              <Filter className="w-4 h-4" />
              Filters
              {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {/* Results count */}
            <div className="text-sm font-medium text-gray-900">
              {loading ? 'Loading...' : `${formatNumber(totalCount)} movies`}
            </div>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Min Votes */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Minimum Votes</label>
                <select
                  value={minVotes}
                  onChange={(e) => setMinVotes(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium text-gray-900"
                >
                  {VOTE_THRESHOLDS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Year Range */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Year Range</label>
                <select
                  value={yearRange.label}
                  onChange={(e) => setYearRange(YEAR_RANGES.find(r => r.label === e.target.value) || YEAR_RANGES[0])}
                  className="w-full px-3 py-2 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium text-gray-900"
                >
                  {YEAR_RANGES.map(opt => (
                    <option key={opt.label} value={opt.label}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Genre */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Genre</label>
                <select
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium text-gray-900"
                >
                  {GENRES.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="border border-red-200 p-4 mb-6">
            <p className="text-red-700 font-semibold">Error loading data</p>
            <p className="text-red-600 mt-1">{error}</p>
          </div>
        )}

        {/* Movies Table */}
        <div className="bg-white border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-gray-600" />
            </div>
          ) : movies.length === 0 ? (
            <div className="text-center py-12 text-base font-medium text-gray-900">
              No movies found matching your criteria
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-900 uppercase tracking-wide w-12">#</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-900 uppercase tracking-wide">Title</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-900 uppercase tracking-wide w-20">Year</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-900 uppercase tracking-wide w-24">Rating</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-900 uppercase tracking-wide w-24">Votes</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-900 uppercase tracking-wide hidden md:table-cell">Genre</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-900 uppercase tracking-wide w-20 hidden lg:table-cell">Runtime</th>
                  </tr>
                </thead>
                <tbody>
                  {movies.map((movie, index) => (
                    <tr
                      key={`${movie.title}-${movie.year}-${index}`}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-semibold text-gray-900">{movie.title}</span>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {movie.year || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-sm font-bold ${
                          movie.rating >= 8.5 ? 'text-green-700' : 'text-gray-900'
                        }`}>
                          {movie.rating}/10
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {formatNumber(movie.votes)}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 hidden md:table-cell max-w-xs truncate">
                        {movie.genres || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 hidden lg:table-cell">
                        {formatRuntime(movie.runtime)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="mt-4 text-center text-xs text-gray-600">
          Showing top 100 results. Adjust filters to explore more movies.
        </div>
      </div>
    </div>
  )
}
