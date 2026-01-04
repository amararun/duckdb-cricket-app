import { useState, useEffect } from 'react'
import { Search, Loader2, Film } from 'lucide-react'
import { executeImdbQuery } from '../../../services/api'

interface Person {
  id: string
  name: string
  birthYear: number | null
  deathYear: number | null
  profession: string | null
  knownForTitles: string | null
}

interface PersonTitle {
  title: string
  year: number | null
  type: string
  rating: number | null
  votes: number | null
}

interface ProfessionCount {
  profession: string
  count: number
}

export function ActorSearch() {
  const [searchTerm, setSearchTerm] = useState('')
  const [people, setPeople] = useState<Person[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Selected person details
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null)
  const [personTitles, setPersonTitles] = useState<PersonTitle[]>([])
  const [titlesLoading, setTitlesLoading] = useState(false)

  // Stats
  const [totalPeople, setTotalPeople] = useState<number | null>(null)
  const [professions, setProfessions] = useState<ProfessionCount[]>([])
  const [statsLoading, setStatsLoading] = useState(true)

  // Load initial stats
  useEffect(() => {
    async function loadStats() {
      try {
        const [countResult, profResult] = await Promise.all([
          executeImdbQuery('SELECT COUNT(*) FROM name_basics'),
          executeImdbQuery(`
            SELECT primaryProfession, COUNT(*) as count
            FROM name_basics
            WHERE primaryProfession IS NOT NULL AND primaryProfession != '\\N'
            GROUP BY primaryProfession
            ORDER BY count DESC
            LIMIT 10
          `)
        ])

        setTotalPeople(countResult.rows[0][0] as number)
        setProfessions(profResult.rows.map(row => ({
          profession: row[0] as string,
          count: row[1] as number
        })))
      } catch (err) {
        console.error('Failed to load stats:', err)
      } finally {
        setStatsLoading(false)
      }
    }
    loadStats()
  }, [])

  // Search for people
  useEffect(() => {
    if (!searchTerm.trim() || searchTerm.length < 2) {
      setPeople([])
      return
    }

    const searchPeople = async () => {
      setLoading(true)
      setError(null)
      try {
        const result = await executeImdbQuery(`
          SELECT
            nconst,
            primaryName,
            birthYear,
            deathYear,
            primaryProfession,
            knownForTitles
          FROM name_basics
          WHERE LOWER(primaryName) LIKE '%${searchTerm.toLowerCase().trim()}%'
          ORDER BY
            CASE WHEN LOWER(primaryName) = '${searchTerm.toLowerCase().trim()}' THEN 0 ELSE 1 END,
            primaryName
          LIMIT 50
        `)

        setPeople(result.rows.map(row => ({
          id: row[0] as string,
          name: row[1] as string,
          birthYear: row[2] as number | null,
          deathYear: row[3] as number | null,
          profession: row[4] as string | null,
          knownForTitles: row[5] as string | null,
        })))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Search failed')
      } finally {
        setLoading(false)
      }
    }

    const debounce = setTimeout(searchPeople, 300)
    return () => clearTimeout(debounce)
  }, [searchTerm])

  // Load titles for selected person
  async function loadPersonTitles(person: Person) {
    setSelectedPerson(person)
    setPersonTitles([])

    if (!person.knownForTitles) return

    setTitlesLoading(true)
    try {
      const titleIds = person.knownForTitles.split(',').map(t => `'${t.trim()}'`).join(',')

      const result = await executeImdbQuery(`
        SELECT
          tb.primaryTitle,
          tb.startYear,
          tb.titleType,
          tr.averageRating,
          tr.numVotes
        FROM title_basics tb
        LEFT JOIN title_ratings tr ON tb.tconst = tr.tconst
        WHERE tb.tconst IN (${titleIds})
        ORDER BY tr.numVotes DESC NULLS LAST
      `)

      setPersonTitles(result.rows.map(row => ({
        title: row[0] as string,
        year: row[1] as number | null,
        type: row[2] as string,
        rating: row[3] as number | null,
        votes: row[4] as number | null,
      })))
    } catch (err) {
      console.error('Failed to load titles:', err)
    } finally {
      setTitlesLoading(false)
    }
  }

  function formatNumber(n: number): string {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
    return n.toLocaleString()
  }

  function formatProfession(prof: string | null): string {
    if (!prof || prof === '\\N') return 'Unknown'
    return prof.split(',').slice(0, 2).map(p =>
      p.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    ).join(', ')
  }

  function formatTitleType(type: string): string {
    const map: Record<string, string> = {
      'movie': 'Movie',
      'tvSeries': 'TV Series',
      'tvEpisode': 'Episode',
      'short': 'Short',
      'tvMovie': 'TV Movie',
      'video': 'Video',
    }
    return map[type] || type
  }

  const maxProfCount = Math.max(...professions.map(p => p.count), 1)

  return (
    <div className="flex-1 p-6 bg-white">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">People & Careers</h1>
          <p className="text-base font-medium text-gray-900 mt-1">
            Search {statsLoading ? '...' : formatNumber(totalPeople || 0)} actors, directors, and crew
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Search & Results */}
          <div className="lg:col-span-2 space-y-6">
            {/* Search Box */}
            <div className="bg-white border border-gray-200 p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-900" />
                <input
                  type="text"
                  placeholder="Search for actors, directors, writers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base font-medium text-gray-900 placeholder:text-gray-400"
                />
              </div>
              {searchTerm.length > 0 && searchTerm.length < 2 && (
                <p className="mt-2 text-sm font-medium text-gray-900">Type at least 2 characters to search</p>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="border border-red-200 p-4">
                <p className="text-red-700 font-semibold">Error</p>
                <p className="text-red-600 mt-1">{error}</p>
              </div>
            )}

            {/* Search Results */}
            {loading ? (
              <div className="bg-white border border-gray-200 p-8 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-gray-600" />
              </div>
            ) : people.length > 0 ? (
              <div className="bg-white border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200">
                  <span className="text-sm font-medium text-gray-900">
                    {people.length} results for "{searchTerm}"
                  </span>
                </div>
                <div className="divide-y divide-gray-100">
                  {people.map((person) => (
                    <button
                      key={person.id}
                      onClick={() => loadPersonTitles(person)}
                      className={`w-full text-left px-4 py-4 hover:bg-gray-50 transition-colors ${
                        selectedPerson?.id === person.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-900">{person.name}</h3>
                          <p className="text-sm font-medium text-gray-900 mt-1">
                            {formatProfession(person.profession)}
                          </p>
                        </div>
                        <div className="text-right text-sm font-medium text-gray-900">
                          {person.birthYear && (
                            <span>
                              {person.birthYear}
                              {person.deathYear ? ` - ${person.deathYear}` : ' - present'}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : searchTerm.length >= 2 && !loading ? (
              <div className="bg-white border border-gray-200 p-8 text-center text-base font-medium text-gray-900">
                No results found for "{searchTerm}"
              </div>
            ) : null}
          </div>

          {/* Right Column - Person Details or Stats */}
          <div className="space-y-6">
            {selectedPerson ? (
              /* Person Details */
              <div className="bg-white border border-gray-200 p-6">
                <div className="mb-4">
                  <h2 className="text-xl font-bold text-gray-900">{selectedPerson.name}</h2>
                  <p className="text-sm font-medium text-gray-900 mt-1">{formatProfession(selectedPerson.profession)}</p>
                </div>

                {selectedPerson.birthYear && (
                  <div className="text-sm font-medium text-gray-900 mb-4">
                    {selectedPerson.birthYear}
                    {selectedPerson.deathYear ? ` - ${selectedPerson.deathYear}` : ' - present'}
                  </div>
                )}

                {/* Known For Titles */}
                <div className="mt-6">
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <Film className="w-4 h-4" />
                    Known For
                  </h3>

                  {titlesLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-5 h-5 animate-spin text-gray-600" />
                    </div>
                  ) : personTitles.length > 0 ? (
                    <div className="space-y-3">
                      {personTitles.map((title, idx) => (
                        <div key={idx} className="border border-gray-200 p-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-semibold text-gray-900">{title.title}</p>
                              <p className="text-xs font-medium text-gray-900 mt-1">
                                {formatTitleType(title.type)} · {title.year || 'N/A'}
                              </p>
                            </div>
                            {title.rating && (
                              <span className={`text-sm font-bold ${title.rating >= 8 ? 'text-green-700' : 'text-gray-900'}`}>
                                {title.rating}/10
                              </span>
                            )}
                          </div>
                          {title.votes && (
                            <p className="text-xs text-gray-600 mt-1">
                              {formatNumber(title.votes)} votes
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm font-medium text-gray-900">No titles available</p>
                  )}
                </div>
              </div>
            ) : (
              /* Stats Panel */
              <div className="bg-white border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Professions</h3>
                {statsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-600" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    {professions.map((item, index) => (
                      <div key={item.profession} className="flex items-center gap-3">
                        <span className="w-5 text-sm font-medium text-gray-900 text-right">
                          {index + 1}
                        </span>
                        <span className="w-28 text-sm font-medium text-gray-900 truncate capitalize">
                          {item.profession.replace(/_/g, ' ')}
                        </span>
                        <div className="flex-1 bg-gray-100 h-5 overflow-hidden">
                          <div
                            className="h-full bg-gray-700 flex items-center justify-end pr-2"
                            style={{ width: `${(item.count / maxProfCount) * 100}%`, minWidth: '40px' }}
                          >
                            <span className="text-xs font-semibold text-white">
                              {formatNumber(item.count)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Quick Tips */}
            <div className="bg-white border border-gray-200 p-4">
              <h4 className="font-semibold text-gray-900 mb-2">Search Tips</h4>
              <ul className="text-sm font-medium text-gray-900 space-y-1">
                <li>Search by full name or partial name</li>
                <li>Click a result to see their filmography</li>
                <li>Professions include actors, directors, writers</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
