import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { executeImdbQuery } from '../../../services/api'

interface DashboardStats {
  totalTitles: number
  totalMovies: number
  totalRated: number
  totalPeople: number
  avgRating: number
}

interface TitleTypeCount {
  type: string
  count: number
}

interface DecadeCount {
  decade: number
  count: number
}

interface RatingBucket {
  bucket: number
  count: number
}

interface TopGenre {
  genre: string
  count: number
}

interface TopMovie {
  title: string
  year: number
  rating: number
  votes: number
}

export function ImdbDashboard() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [titleTypes, setTitleTypes] = useState<TitleTypeCount[]>([])
  const [decadeCounts, setDecadeCounts] = useState<DecadeCount[]>([])
  const [ratingDist, setRatingDist] = useState<RatingBucket[]>([])
  const [topGenres, setTopGenres] = useState<TopGenre[]>([])
  const [topMovie, setTopMovie] = useState<TopMovie | null>(null)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      setError(null)
      try {
        // Fetch all stats in parallel
        const [statsResult, typesResult, decadesResult, ratingsResult, genresResult, topMovieResult] = await Promise.all([
          // Basic counts
          executeImdbQuery(`
            SELECT
              (SELECT COUNT(*) FROM title_basics) as total_titles,
              (SELECT COUNT(*) FROM title_basics WHERE titleType = 'movie') as total_movies,
              (SELECT COUNT(*) FROM title_ratings) as total_rated,
              (SELECT COUNT(*) FROM name_basics) as total_people,
              (SELECT ROUND(AVG(averageRating), 1) FROM title_ratings) as avg_rating
          `),
          // Title types
          executeImdbQuery(`
            SELECT titleType, COUNT(*) as count
            FROM title_basics
            GROUP BY titleType
            ORDER BY count DESC
            LIMIT 8
          `),
          // Movies by decade
          executeImdbQuery(`
            SELECT
              (startYear / 10) * 10 as decade,
              COUNT(*) as count
            FROM title_basics
            WHERE titleType = 'movie' AND startYear IS NOT NULL AND startYear >= 1920 AND startYear <= 2025
            GROUP BY decade
            ORDER BY decade
          `),
          // Rating distribution
          executeImdbQuery(`
            SELECT
              FLOOR(averageRating) as rating_bucket,
              COUNT(*) as count
            FROM title_ratings
            GROUP BY rating_bucket
            ORDER BY rating_bucket
          `),
          // Top genres (extract first genre from each title)
          executeImdbQuery(`
            SELECT
              SPLIT_PART(genres, ',', 1) as genre,
              COUNT(*) as count
            FROM title_basics
            WHERE genres IS NOT NULL AND genres != '\\N' AND titleType = 'movie'
            GROUP BY SPLIT_PART(genres, ',', 1)
            ORDER BY count DESC
            LIMIT 10
          `),
          // Most voted movie
          executeImdbQuery(`
            SELECT tb.primaryTitle, tb.startYear, tr.averageRating, tr.numVotes
            FROM title_basics tb
            JOIN title_ratings tr ON tb.tconst = tr.tconst
            WHERE tb.titleType = 'movie'
            ORDER BY tr.numVotes DESC
            LIMIT 1
          `)
        ])

        // Process stats
        if (statsResult.rows.length > 0) {
          const row = statsResult.rows[0]
          setStats({
            totalTitles: row[0] as number,
            totalMovies: row[1] as number,
            totalRated: row[2] as number,
            totalPeople: row[3] as number,
            avgRating: row[4] as number
          })
        }

        // Process title types
        setTitleTypes(typesResult.rows.map(row => ({
          type: row[0] as string,
          count: row[1] as number
        })))

        // Process decades
        setDecadeCounts(decadesResult.rows.map(row => ({
          decade: row[0] as number,
          count: row[1] as number
        })))

        // Process ratings
        setRatingDist(ratingsResult.rows.map(row => ({
          bucket: row[0] as number,
          count: row[1] as number
        })))

        // Process genres
        setTopGenres(genresResult.rows.map(row => ({
          genre: row[0] as string,
          count: row[1] as number
        })))

        // Process top movie
        if (topMovieResult.rows.length > 0) {
          const row = topMovieResult.rows[0]
          setTopMovie({
            title: row[0] as string,
            year: row[1] as number,
            rating: row[2] as number,
            votes: row[3] as number
          })
        }

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const maxDecadeCount = Math.max(...decadeCounts.map(d => d.count), 1)
  const maxRatingCount = Math.max(...ratingDist.map(r => r.count), 1)
  const maxGenreCount = Math.max(...topGenres.map(g => g.count), 1)

  function formatNumber(n: number): string {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
    return n.toLocaleString()
  }

  function formatTitleType(type: string): string {
    const map: Record<string, string> = {
      'movie': 'Movies',
      'tvSeries': 'TV Series',
      'tvEpisode': 'TV Episodes',
      'short': 'Shorts',
      'tvMovie': 'TV Movies',
      'video': 'Videos',
      'tvMiniSeries': 'Mini-Series',
      'tvSpecial': 'TV Specials',
      'videoGame': 'Video Games'
    }
    return map[type] || type
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 bg-white">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-gray-600 mx-auto mb-4" />
          <p className="text-base font-medium text-gray-900">Loading IMDb data...</p>
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
          <h1 className="text-2xl font-bold text-gray-900">IMDb Analytics</h1>
          <p className="text-base font-medium text-gray-900 mt-1">
            Explore {formatNumber(stats?.totalTitles || 0)} titles and {formatNumber(stats?.totalPeople || 0)} people
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <StatCard
            label="Total Titles"
            value={formatNumber(stats?.totalTitles || 0)}
            subtext="Movies, TV, Shorts"
          />
          <StatCard
            label="Movies"
            value={formatNumber(stats?.totalMovies || 0)}
            subtext="Feature films"
          />
          <StatCard
            label="Rated Titles"
            value={formatNumber(stats?.totalRated || 0)}
            subtext={`Avg: ${stats?.avgRating || 0}/10`}
          />
          <StatCard
            label="People"
            value={formatNumber(stats?.totalPeople || 0)}
            subtext="Actors, Directors, Crew"
          />
          <StatCard
            label="Database"
            value="4.2 GB"
            subtext="DuckDB indexed"
          />
        </div>

        {/* Most Voted Movie */}
        {topMovie && (
          <div className="mb-8 bg-white border border-gray-200 p-6">
            <p className="text-sm font-medium text-gray-900 mb-1">Most Voted Movie</p>
            <p className="text-2xl font-bold text-gray-900">{topMovie.title} ({topMovie.year})</p>
            <p className="text-base font-medium text-gray-900 mt-1">
              {topMovie.rating}/10 · {formatNumber(topMovie.votes)} votes
            </p>
          </div>
        )}

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Title Types */}
          <div className="bg-white border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Content by Type
            </h3>
            <div className="space-y-2">
              {titleTypes.map((item, index) => (
                <div key={item.type} className="flex items-center gap-3">
                  <span className="w-5 text-sm font-medium text-gray-900 text-right">
                    {index + 1}
                  </span>
                  <span className="w-24 text-sm font-medium text-gray-900 truncate">
                    {formatTitleType(item.type)}
                  </span>
                  <div className="flex-1 bg-gray-100 h-5 overflow-hidden">
                    <div
                      className="h-full bg-blue-600 flex items-center justify-end pr-2"
                      style={{ width: `${(item.count / titleTypes[0].count) * 100}%`, minWidth: '40px' }}
                    >
                      <span className="text-xs font-semibold text-white">
                        {formatNumber(item.count)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Rating Distribution */}
          <div className="bg-white border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Rating Distribution
            </h3>
            <div className="h-48 flex items-end gap-2 pb-6">
              {ratingDist.map((item) => {
                const heightPct = maxRatingCount > 0 ? (item.count / maxRatingCount) * 100 : 0
                return (
                  <div key={item.bucket} className="flex-1 flex flex-col items-center h-full justify-end group">
                    <div
                      className="w-full bg-teal-500 hover:bg-teal-600 transition-colors"
                      style={{ height: `${Math.max(heightPct, 2)}%` }}
                      title={`${item.bucket}-${item.bucket + 1}: ${formatNumber(item.count)} titles`}
                    />
                    <span className="text-xs font-medium text-gray-900 mt-2">{item.bucket}</span>
                  </div>
                )
              })}
            </div>
            <p className="text-xs text-gray-600 text-center">Rating buckets (0-10)</p>
          </div>

          {/* Movies by Decade */}
          <div className="bg-white border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Movies by Decade
            </h3>
            <div className="h-48 flex items-end gap-1 pb-8">
              {decadeCounts.map((item) => {
                const heightPct = maxDecadeCount > 0 ? (item.count / maxDecadeCount) * 100 : 0
                return (
                  <div key={item.decade} className="flex-1 flex flex-col items-center h-full justify-end group">
                    <div
                      className="w-full bg-blue-500 hover:bg-blue-600 transition-colors"
                      style={{ height: `${Math.max(heightPct, 2)}%` }}
                      title={`${item.decade}s: ${formatNumber(item.count)} movies`}
                    />
                    <span className="text-xs font-medium text-gray-900 mt-1 whitespace-nowrap">
                      {item.decade.toString().slice(-2)}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Top Genres */}
          <div className="bg-white border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Top Movie Genres
            </h3>
            <div className="space-y-2">
              {topGenres.slice(0, 8).map((item, index) => (
                <div key={`${item.genre}-${index}`} className="flex items-center gap-3">
                  <span className="w-5 text-sm font-medium text-gray-900 text-right">
                    {index + 1}
                  </span>
                  <span className="w-28 text-sm font-medium text-gray-900 truncate" title={item.genre}>
                    {item.genre}
                  </span>
                  <div className="flex-1 bg-gray-100 h-5 overflow-hidden">
                    <div
                      className="h-full bg-gray-700 flex items-center justify-end pr-2"
                      style={{ width: `${maxGenreCount > 0 ? (item.count / maxGenreCount) * 100 : 0}%`, minWidth: '40px' }}
                    >
                      <span className="text-xs font-semibold text-white">
                        {formatNumber(item.count)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Data Source Info */}
        <div className="p-6 bg-white border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Data Source</h3>
          <p className="text-base font-medium text-gray-900 mb-4">
            Official IMDb datasets from{' '}
            <a
              href="https://datasets.imdbws.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700 underline"
            >
              datasets.imdbws.com
            </a>
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm font-semibold text-gray-900">title_basics</div>
              <div className="text-sm font-medium text-gray-900">{formatNumber(stats?.totalTitles || 0)} rows</div>
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-900">title_ratings</div>
              <div className="text-sm font-medium text-gray-900">{formatNumber(stats?.totalRated || 0)} rows</div>
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-900">name_basics</div>
              <div className="text-sm font-medium text-gray-900">{formatNumber(stats?.totalPeople || 0)} rows</div>
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-900">Total</div>
              <div className="text-sm font-medium text-gray-900">{formatNumber((stats?.totalTitles || 0) + (stats?.totalRated || 0) + (stats?.totalPeople || 0))} rows</div>
            </div>
          </div>
        </div>
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
