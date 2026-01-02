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

  // Header styling based on section
  const headerStyle = isImdb
    ? 'bg-gradient-to-r from-amber-900 to-amber-800'
    : 'bg-gradient-to-r from-indigo-950 to-indigo-900'

  const activeStyle = isImdb ? 'bg-amber-700' : 'bg-indigo-700'
  const hoverStyle = isImdb ? 'hover:bg-amber-800' : 'hover:bg-indigo-800'
  const textStyle = isImdb ? 'text-amber-200' : 'text-indigo-200'
  const iconColor = isImdb ? 'text-amber-300' : 'text-indigo-300'

  return (
    <div className={`${headerStyle} text-white shadow-lg border-b border-white/5`}>
      <div className="max-w-7xl mx-auto flex items-center gap-3 py-2 px-4">
        {/* Home Link */}
        <Link
          to="/"
          className={`flex items-center gap-2 px-2 py-1 rounded-md ${textStyle} hover:text-white transition-colors`}
        >
          <Home className="h-5 w-5" />
        </Link>

        {/* Divider */}
        <div className="h-4 w-px bg-white/20" />

        {/* Section Logo */}
        <div className="flex items-center gap-2">
          {isCricket ? (
            <>
              <Trophy className={`h-6 w-6 ${iconColor}`} />
              <span className="text-lg font-semibold">Cricket</span>
            </>
          ) : isImdb ? (
            <>
              <Film className={`h-6 w-6 ${iconColor}`} />
              <span className="text-lg font-semibold">IMDb</span>
            </>
          ) : (
            <span className="text-lg font-semibold">DuckDB Dashboards</span>
          )}
        </div>

        {/* Divider */}
        {navLinks.length > 0 && (
          <div className="hidden md:block h-4 w-px bg-white/20" />
        )}

        {/* Navigation */}
        <nav className="flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${
                isActive(link.path)
                  ? `${activeStyle} text-white`
                  : `${textStyle} ${hoverStyle} hover:text-white`
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
            className="flex items-center gap-1.5 px-3 py-1 rounded-md text-sm font-medium text-amber-300 hover:bg-white/10 transition-colors"
          >
            <Film className="h-4 w-4" />
            <span className="hidden sm:inline">IMDb</span>
          </Link>
        )}
        {isImdb && (
          <Link
            to="/cricket"
            className="flex items-center gap-1.5 px-3 py-1 rounded-md text-sm font-medium text-indigo-300 hover:bg-white/10 transition-colors"
          >
            <Trophy className="h-4 w-4" />
            <span className="hidden sm:inline">Cricket</span>
          </Link>
        )}

        {/* TIGZIG branding */}
        <span className={`text-xs ${textStyle}`}>TIGZIG</span>
      </div>
    </div>
  )
}
