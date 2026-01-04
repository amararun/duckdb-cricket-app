import { Trophy, Database, Users, Film, Home, Star } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

export function Header() {
  const location = useLocation()
  const path = location.pathname

  // Determine current section
  const isCricket = path.startsWith('/cricket')
  const isImdb = path.startsWith('/imdb')

  const isActive = (checkPath: string) => path === checkPath

  // Cricket navigation links
  const cricketLinks = [
    { path: '/cricket', label: 'Dashboard' },
    { path: '/cricket/batting', label: 'Batting' },
    { path: '/cricket/bowling', label: 'Bowling' },
    { path: '/cricket/head-to-head', label: 'H2H', icon: Users },
    { path: '/cricket/schema', label: 'Schema', icon: Database },
  ]

  // IMDb navigation links
  const imdbLinks = [
    { path: '/imdb', label: 'Dashboard' },
    { path: '/imdb/top-rated', label: 'Top Rated', icon: Star },
    { path: '/imdb/actors', label: 'Actors', icon: Users },
    { path: '/imdb/genres', label: 'Genres' },
  ]

  // Select nav links based on current section
  const navLinks = isCricket ? cricketLinks : isImdb ? imdbLinks : []

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto flex items-center gap-4 py-3 px-4">
        {/* Home Link */}
        <Link
          to="/"
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <Home className="h-5 w-5" />
        </Link>

        {/* Divider */}
        <div className="h-5 w-px bg-gray-200" />

        {/* Section Logo */}
        <div className="flex items-center gap-2">
          {isCricket ? (
            <>
              <Trophy className="h-5 w-5 text-gray-900" />
              <span className="text-lg font-bold text-gray-900">Cricket</span>
            </>
          ) : isImdb ? (
            <>
              <Film className="h-5 w-5 text-gray-900" />
              <span className="text-lg font-bold text-gray-900">IMDb</span>
            </>
          ) : (
            <span className="text-lg font-bold text-gray-900">DuckDB Dashboards</span>
          )}
        </div>

        {/* Divider */}
        {navLinks.length > 0 && (
          <div className="hidden md:block h-5 w-px bg-gray-200" />
        )}

        {/* Navigation */}
        <nav className="flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`px-3 py-1.5 text-sm font-medium transition-colors flex items-center gap-1.5 ${
                isActive(link.path)
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {link.icon && <link.icon className="h-4 w-4" />}
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Switch Section Links */}
        {isCricket && (
          <Link
            to="/imdb"
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
          >
            <Film className="h-4 w-4" />
            <span className="hidden sm:inline">IMDb</span>
          </Link>
        )}
        {isImdb && (
          <Link
            to="/cricket"
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
          >
            <Trophy className="h-4 w-4" />
            <span className="hidden sm:inline">Cricket</span>
          </Link>
        )}

        {/* TIGZIG branding */}
        <span className="text-xs font-medium text-gray-500">TIGZIG</span>
      </div>
    </div>
  )
}
