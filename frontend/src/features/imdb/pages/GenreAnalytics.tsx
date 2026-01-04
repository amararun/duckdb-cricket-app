import { useState, useEffect } from 'react'
import { Search, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { executeImdbQuery } from '../../../services/api'

interface GenreCount {
  genre: string
  count: number
  avgRating: number
}

interface DecadeTrend {
  decade: number
  count: number
}

interface GenreMovie {
  title: string
  year: number | null
  rating: number
  votes: number
  genres: string
}

const POPULAR_GENRES = [
  'Drama', 'Comedy', 'Action', 'Thriller', 'Romance',
  'Horror', 'Sci-Fi', 'Adventure', 'Crime', 'Fantasy',
  'Animation', 'Documentary', 'Mystery', 'Biography', 'War'
]

export function GenreAnalytics() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Genre overview data
  const [genreCounts, setGenreCounts] = useState<GenreCount[]>([])
  const [totalMovies, setTotalMovies] = useState(0)

  // Selected genre for detailed view
  const [selectedGenre, setSelectedGenre] = useState<string>('Drama')
  const [genreMovies, setGenreMovies] = useState<GenreMovie[]>([])
  const [genreDecades, setGenreDecades] = useState<DecadeTrend[]>([])
  const [genreLoading, setGenreLoading] = useState(false)

  // Search within genre
  const [searchTerm, setSearchTerm] = useState('')
  const [showAllGenres, setShowAllGenres] = useState(false)

  // Load initial genre overview
  useEffect(() => {
    async function loadOverview() {
      setLoading(true)
      setError(null)
      try {
        const [countResult, genreResult] = await Promise.all([
          executeImdbQuery(`
            SELECT COUNT(*) FROM title_basics WHERE titleType = 'movie'
          `),
          executeImdbQuery(`
            SELECT
              SPLIT_PART(genres, ',', 1) as genre,
              COUNT(*) as count,
              ROUND(AVG(tr.averageRating), 1) as avg_rating
            FROM title_basics tb
            LEFT JOIN title_ratings tr ON tb.tconst = tr.tconst
            WHERE tb.titleType = 'movie'
              AND tb.genres IS NOT NULL
              AND tb.genres != '\\N'
            GROUP BY SPLIT_PART(genres, ',', 1)
            ORDER BY count DESC
            LIMIT 20
          `)
        ])

        setTotalMovies(countResult.rows[0][0] as number)
        setGenreCounts(genreResult.rows.map(row => ({
          genre: row[0] as string,
          count: row[1] as number,
          avgRating: row[2] as number || 0
        })))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }
    loadOverview()
  }, [])

  // Load genre-specific data when genre changes
  useEffect(() => {
    async function loadGenreData() {
      if (!selectedGenre) return

      setGenreLoading(true)
      try {
        const searchFilter = searchTerm.trim()
          ? `AND LOWER(tb.primaryTitle) LIKE '%${searchTerm.toLowerCase().trim()}%'`
          : ''

        const [moviesResult, decadesResult] = await Promise.all([
          executeImdbQuery(`
            SELECT
              tb.primaryTitle,
              tb.startYear,
              tr.averageRating,
              tr.numVotes,
              tb.genres
            FROM title_basics tb
            JOIN title_ratings tr ON tb.tconst = tr.tconst
            WHERE tb.titleType = 'movie'
              AND tb.genres LIKE '%${selectedGenre}%'
              AND tr.numVotes >= 10000
              ${searchFilter}
            ORDER BY tr.averageRating DESC, tr.numVotes DESC
            LIMIT 50
          `),
          executeImdbQuery(`
            SELECT
              (tb.startYear / 10) * 10 as decade,
              COUNT(*) as count
            FROM title_basics tb
            WHERE tb.titleType = 'movie'
              AND tb.genres LIKE '%${selectedGenre}%'
              AND tb.startYear IS NOT NULL
              AND tb.startYear >= 1920
              AND tb.startYear <= 2025
            GROUP BY decade
            ORDER BY decade
          `)
        ])

        setGenreMovies(moviesResult.rows.map(row => ({
          title: row[0] as string,
          year: row[1] as number | null,
          rating: row[2] as number,
          votes: row[3] as number,
          genres: row[4] as string
        })))

        setGenreDecades(decadesResult.rows.map(row => ({
          decade: row[0] as number,
          count: row[1] as number
        })))
      } catch (err) {
        console.error('Failed to load genre data:', err)
      } finally {
        setGenreLoading(false)
      }
    }

    const debounce = setTimeout(loadGenreData, searchTerm ? 300 : 0)
    return () => clearTimeout(debounce)
  }, [selectedGenre, searchTerm])

  function formatNumber(n: number): string {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
    return n.toLocaleString()
  }

  const maxGenreCount = Math.max(...genreCounts.map(g => g.count), 1)
  const maxDecadeCount = Math.max(...genreDecades.map(d => d.count), 1)
  const displayedGenres = showAllGenres ? genreCounts : genreCounts.slice(0, 10)

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 bg-white">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-gray-600 mx-auto mb-4" />
          <p className="text-base font-medium text-gray-900">Loading genre data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 p-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="border border-red-200 p-6">
            <p className="text-red-700 font-semibold">Error loading data</p>
            <p className="text-red-600 mt-2">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 p-6 bg-white">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Genre Analytics</h1>
          <p className="text-base font-medium text-gray-900 mt-1">
            Explore {formatNumber(totalMovies)} movies across genres and decades
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Genre Overview */}
          <div className="lg:col-span-1 space-y-6">
            {/* Genre Distribution */}
            <div className="bg-white border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Movies by Genre
              </h2>
              <div className="space-y-2">
                {displayedGenres.map((item, index) => (
                  <button
                    key={item.genre}
                    onClick={() => {
                      setSelectedGenre(item.genre)
                      setSearchTerm('')
                    }}
                    className={`w-full flex items-center gap-3 p-2 transition-colors ${
                      selectedGenre === item.genre
                        ? 'bg-blue-50 border-l-4 border-blue-600'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <span className="w-5 text-sm font-medium text-gray-900 text-right">
                      {index + 1}
                    </span>
                    <span className="w-24 text-sm font-medium text-gray-900 text-left truncate">
                      {item.genre}
                    </span>
                    <div className="flex-1 bg-gray-100 h-5 overflow-hidden">
                      <div
                        className="h-full bg-gray-700 flex items-center justify-end pr-2"
                        style={{ width: `${(item.count / maxGenreCount) * 100}%`, minWidth: '40px' }}
                      >
                        <span className="text-xs font-semibold text-white">
                          {formatNumber(item.count)}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              {genreCounts.length > 10 && (
                <button
                  onClick={() => setShowAllGenres(!showAllGenres)}
                  className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 border border-gray-200"
                >
                  {showAllGenres ? (
                    <>Show Less <ChevronUp className="w-4 h-4" /></>
                  ) : (
                    <>Show All {genreCounts.length} Genres <ChevronDown className="w-4 h-4" /></>
                  )}
                </button>
              )}
            </div>

            {/* Quick Genre Selector */}
            <div className="bg-white border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">
                Quick Select
              </h3>
              <div className="flex flex-wrap gap-2">
                {POPULAR_GENRES.map(genre => (
                  <button
                    key={genre}
                    onClick={() => {
                      setSelectedGenre(genre)
                      setSearchTerm('')
                    }}
                    className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                      selectedGenre === genre
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-900 border border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {genre}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Genre Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Genre Header with Stats */}
            <div className="bg-white border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">{selectedGenre} Movies</h2>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">
                    {formatNumber(genreCounts.find(g => g.genre === selectedGenre)?.count || 0)}
                  </p>
                  <p className="text-sm font-medium text-gray-900">total movies</p>
                </div>
              </div>

              {/* Decade Trend Chart */}
              {genreDecades.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">
                    {selectedGenre} Movies by Decade
                  </h3>
                  <div className="h-32 flex items-end gap-1 pb-6">
                    {genreDecades.map((item) => {
                      const heightPct = maxDecadeCount > 0 ? (item.count / maxDecadeCount) * 100 : 0
                      return (
                        <div key={item.decade} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                          <div
                            className="w-full bg-blue-500 hover:bg-blue-600 transition-colors"
                            style={{ height: `${Math.max(heightPct, 2)}%` }}
                            title={`${item.decade}s: ${formatNumber(item.count)} movies`}
                          />
                          <span className="text-xs font-medium text-gray-900 mt-1">
                            {item.decade.toString().slice(-2)}
                          </span>
                          {/* Tooltip */}
                          <div className="absolute bottom-full mb-2 hidden group-hover:block bg-gray-900 text-white text-xs px-2 py-1 whitespace-nowrap z-10">
                            {item.decade}s: {formatNumber(item.count)}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Search and Top Movies */}
            <div className="bg-white border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Top {selectedGenre} Movies
                </h3>
                <span className="text-sm font-medium text-gray-900">
                  {genreMovies.length} results
                </span>
              </div>

              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-900" />
                <input
                  type="text"
                  placeholder={`Search ${selectedGenre} movies...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base font-medium text-gray-900 placeholder:text-gray-400"
                />
              </div>

              {/* Movies Table */}
              {genreLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-600" />
                </div>
              ) : genreMovies.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b border-gray-200">
                      <tr>
                        <th className="text-left px-3 py-2 text-sm font-semibold text-gray-900 uppercase tracking-wide w-10">#</th>
                        <th className="text-left px-3 py-2 text-sm font-semibold text-gray-900 uppercase tracking-wide">Title</th>
                        <th className="text-left px-3 py-2 text-sm font-semibold text-gray-900 uppercase tracking-wide w-16">Year</th>
                        <th className="text-left px-3 py-2 text-sm font-semibold text-gray-900 uppercase tracking-wide w-20">Rating</th>
                        <th className="text-left px-3 py-2 text-sm font-semibold text-gray-900 uppercase tracking-wide w-20">Votes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {genreMovies.map((movie, index) => (
                        <tr key={`${movie.title}-${movie.year}-${index}`} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="px-3 py-2 text-sm font-medium text-gray-900">
                            {index + 1}
                          </td>
                          <td className="px-3 py-2">
                            <span className="text-sm font-semibold text-gray-900">{movie.title}</span>
                          </td>
                          <td className="px-3 py-2 text-sm font-medium text-gray-900">
                            {movie.year || '-'}
                          </td>
                          <td className="px-3 py-2">
                            <span className={`text-sm font-bold ${movie.rating >= 8 ? 'text-green-700' : 'text-gray-900'}`}>
                              {movie.rating}/10
                            </span>
                          </td>
                          <td className="px-3 py-2 text-sm font-medium text-gray-900">
                            {formatNumber(movie.votes)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-base font-medium text-gray-900">
                  No movies found {searchTerm && `for "${searchTerm}"`}
                </div>
              )}

              <p className="text-xs text-gray-600 mt-4">
                Showing top-rated {selectedGenre} movies with 10K+ votes
              </p>
            </div>

            {/* Genre Stats Summary */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white border border-gray-200 p-4">
                <p className="text-2xl font-bold text-gray-900">
                  {genreCounts.find(g => g.genre === selectedGenre)?.avgRating || '-'}
                </p>
                <p className="text-sm font-medium text-gray-900">Avg Rating</p>
              </div>
              <div className="bg-white border border-gray-200 p-4">
                <p className="text-2xl font-bold text-gray-900">
                  {genreDecades.length > 0
                    ? `${genreDecades[0].decade}s`
                    : '-'}
                </p>
                <p className="text-sm font-medium text-gray-900">First Decade</p>
              </div>
              <div className="bg-white border border-gray-200 p-4">
                <p className="text-2xl font-bold text-gray-900">
                  {genreDecades.length > 0
                    ? formatNumber(Math.max(...genreDecades.map(d => d.count)))
                    : '-'}
                </p>
                <p className="text-sm font-medium text-gray-900">Peak Decade</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
