import { Film, Database, Users, Star, BarChart3 } from 'lucide-react'

export function ImdbDashboard() {
  return (
    <div className="flex-1 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Film className="w-8 h-8 text-amber-600" />
            <h1 className="text-3xl font-bold text-slate-800">IMDb Analytics</h1>
          </div>
          <p className="text-slate-600 text-lg">
            Explore 28+ million titles, ratings, and people from the Internet Movie Database
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Film className="w-5 h-5 text-amber-600" />
              </div>
              <span className="text-slate-600 font-medium">Titles</span>
            </div>
            <div className="text-2xl font-bold text-slate-800">12.2M</div>
            <div className="text-sm text-slate-500">Movies, TV, Shorts</div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <Star className="w-5 h-5 text-emerald-600" />
              </div>
              <span className="text-slate-600 font-medium">Rated</span>
            </div>
            <div className="text-2xl font-bold text-slate-800">1.6M</div>
            <div className="text-sm text-slate-500">With user ratings</div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <span className="text-slate-600 font-medium">People</span>
            </div>
            <div className="text-2xl font-bold text-slate-800">15M</div>
            <div className="text-sm text-slate-500">Actors, Directors, Crew</div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Database className="w-5 h-5 text-purple-600" />
              </div>
              <span className="text-slate-600 font-medium">Database</span>
            </div>
            <div className="text-2xl font-bold text-slate-800">3 GB</div>
            <div className="text-sm text-slate-500">DuckDB indexed</div>
          </div>
        </div>

        {/* Coming Soon Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-amber-500 rounded-lg">
                <Star className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-800">Top Rated</h3>
            </div>
            <p className="text-slate-600 mb-4">
              Explore highest-rated movies and TV shows with 100K+ votes
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">
              <BarChart3 className="w-4 h-4" />
              Coming Soon
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-blue-500 rounded-lg">
                <Users className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-800">Actor Search</h3>
            </div>
            <p className="text-slate-600 mb-4">
              Search actors and explore their filmography and career stats
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
              <BarChart3 className="w-4 h-4" />
              Coming Soon
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-purple-500 rounded-lg">
                <Film className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-800">Genre Analytics</h3>
            </div>
            <p className="text-slate-600 mb-4">
              Analyze trends by genre, decade, and content type
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
              <BarChart3 className="w-4 h-4" />
              Coming Soon
            </div>
          </div>
        </div>

        {/* Data Source Info */}
        <div className="mt-8 p-6 bg-slate-50 rounded-xl border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-3">Data Source</h3>
          <p className="text-slate-600 mb-4">
            Official IMDb datasets from{' '}
            <a
              href="https://datasets.imdbws.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-600 hover:text-amber-700 underline"
            >
              datasets.imdbws.com
            </a>
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="font-medium text-slate-700">title_basics</div>
              <div className="text-slate-500">12.2M rows</div>
            </div>
            <div>
              <div className="font-medium text-slate-700">title_ratings</div>
              <div className="text-slate-500">1.6M rows</div>
            </div>
            <div>
              <div className="font-medium text-slate-700">name_basics</div>
              <div className="text-slate-500">15M rows</div>
            </div>
            <div>
              <div className="font-medium text-slate-700">Total</div>
              <div className="text-slate-500">28.8M rows</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
