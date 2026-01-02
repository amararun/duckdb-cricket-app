import { useNavigate } from 'react-router-dom'
import { Database, ArrowRight, Trophy, Film, Zap, Server, BarChart3 } from 'lucide-react'

export function Landing() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Hero Section */}
        <div className="pt-8 pb-12">
          <h1
            className="text-4xl md:text-5xl font-extrabold leading-tight mb-6"
            style={{ letterSpacing: '-0.02em', color: '#0F172A' }}
          >
            Multi-GB Analytics.
            <br />
            <span style={{ color: '#DC2626' }}>Instant Queries.</span>
          </h1>

          <p className="text-xl md:text-2xl leading-relaxed mb-8 font-medium max-w-2xl text-slate-600">
            Live dashboards powered by DuckDB. Cricket ball-by-ball data. IMDb movie ratings.
            All queryable in milliseconds from a 3GB+ backend.
          </p>

          {/* Tech Stack */}
          <div className="flex flex-wrap items-center gap-6 mb-12">
            <span className="text-sm font-semibold uppercase tracking-widest text-slate-400">
              Powered by
            </span>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg">
              <Database className="w-4 h-4 text-amber-600" />
              <span className="font-semibold text-slate-700">DuckDB</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg">
              <Zap className="w-4 h-4 text-blue-600" />
              <span className="font-semibold text-slate-700">React</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg">
              <Server className="w-4 h-4 text-emerald-600" />
              <span className="font-semibold text-slate-700">Hetzner</span>
            </div>
          </div>
        </div>

        {/* Data Source Cards */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          {/* Cricket Card */}
          <div
            className="group rounded-2xl p-8 bg-white cursor-pointer transition-all hover:-translate-y-1"
            style={{
              boxShadow: '0 4px 20px -2px rgba(79, 70, 229, 0.2), 0 2px 8px -2px rgba(79, 70, 229, 0.15)'
            }}
            onClick={() => navigate('/cricket')}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 8px 30px -2px rgba(79, 70, 229, 0.3), 0 4px 12px -2px rgba(79, 70, 229, 0.2)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 20px -2px rgba(79, 70, 229, 0.2), 0 2px 8px -2px rgba(79, 70, 229, 0.15)'
            }}
          >
            <div className="flex items-start gap-4 mb-6">
              <div className="p-4 bg-indigo-600 rounded-xl">
                <Trophy className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-800 mb-1">Cricket Analytics</h2>
                <p className="text-lg font-semibold text-indigo-600">T20 International Data</p>
              </div>
            </div>

            <p className="text-slate-600 text-lg mb-6">
              Ball-by-ball analysis of T20 International matches. Batting averages, bowling economy,
              head-to-head matchups, and team performance trends.
            </p>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center p-3 bg-indigo-50 rounded-lg">
                <div className="text-xl font-bold text-indigo-700">500K+</div>
                <div className="text-sm text-slate-600">Ball Records</div>
              </div>
              <div className="text-center p-3 bg-indigo-50 rounded-lg">
                <div className="text-xl font-bold text-indigo-700">1,800+</div>
                <div className="text-sm text-slate-600">Matches</div>
              </div>
              <div className="text-center p-3 bg-indigo-50 rounded-lg">
                <div className="text-xl font-bold text-indigo-700">5</div>
                <div className="text-sm text-slate-600">Dashboard Views</div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-indigo-600 font-semibold group-hover:gap-3 transition-all">
              <span>Explore Cricket Data</span>
              <ArrowRight className="w-5 h-5" />
            </div>
          </div>

          {/* IMDb Card */}
          <div
            className="group rounded-2xl p-8 bg-white cursor-pointer transition-all hover:-translate-y-1"
            style={{
              boxShadow: '0 4px 20px -2px rgba(245, 158, 11, 0.2), 0 2px 8px -2px rgba(245, 158, 11, 0.15)'
            }}
            onClick={() => navigate('/imdb')}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 8px 30px -2px rgba(245, 158, 11, 0.3), 0 4px 12px -2px rgba(245, 158, 11, 0.2)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 20px -2px rgba(245, 158, 11, 0.2), 0 2px 8px -2px rgba(245, 158, 11, 0.15)'
            }}
          >
            <div className="flex items-start gap-4 mb-6">
              <div className="p-4 bg-amber-500 rounded-xl">
                <Film className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-800 mb-1">IMDb Analytics</h2>
                <p className="text-lg font-semibold text-amber-600">Movies & TV Data</p>
              </div>
            </div>

            <p className="text-slate-600 text-lg mb-6">
              Explore 28 million titles, ratings, and cast information from the Internet Movie Database.
              Top rated films, actor careers, and genre trends.
            </p>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center p-3 bg-amber-50 rounded-lg">
                <div className="text-xl font-bold text-amber-700">28M+</div>
                <div className="text-sm text-slate-600">Total Rows</div>
              </div>
              <div className="text-center p-3 bg-amber-50 rounded-lg">
                <div className="text-xl font-bold text-amber-700">12M</div>
                <div className="text-sm text-slate-600">Titles</div>
              </div>
              <div className="text-center p-3 bg-amber-50 rounded-lg">
                <div className="text-xl font-bold text-amber-700">3 GB</div>
                <div className="text-sm text-slate-600">Database</div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-amber-600 font-semibold group-hover:gap-3 transition-all">
              <span>Explore IMDb Data</span>
              <ArrowRight className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Technical Details */}
        <div className="bg-slate-50 rounded-2xl p-8 mb-12">
          <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-3">
            <BarChart3 className="w-6 h-6 text-slate-600" />
            How It Works
          </h3>

          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="text-3xl font-bold text-indigo-600 mb-2">1</div>
              <h4 className="font-bold text-slate-800 mb-2">DuckDB Backend</h4>
              <p className="text-slate-600">
                Multi-GB DuckDB files on persistent storage. Columnar format for fast analytical queries.
              </p>
            </div>
            <div>
              <div className="text-3xl font-bold text-indigo-600 mb-2">2</div>
              <h4 className="font-bold text-slate-800 mb-2">FastAPI Server</h4>
              <p className="text-slate-600">
                Python backend on Hetzner. Executes SQL queries and returns JSON. Handles concurrent requests.
              </p>
            </div>
            <div>
              <div className="text-3xl font-bold text-indigo-600 mb-2">3</div>
              <h4 className="font-bold text-slate-800 mb-2">React Frontend</h4>
              <p className="text-slate-600">
                Vercel-hosted React app. Dynamic charts, sortable tables, and real-time filtering.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="text-center text-slate-500">
          <p>
            Built by{' '}
            <a
              href="https://www.linkedin.com/in/amarharolikar/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Amar Harolikar
            </a>
            {' '}| Data from{' '}
            <a
              href="https://cricsheet.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:text-indigo-700"
            >
              Cricsheet
            </a>
            {' '}&{' '}
            <a
              href="https://datasets.imdbws.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:text-indigo-700"
            >
              IMDb
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
