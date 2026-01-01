import { Trophy, Database, Users } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

export function Header() {
  const location = useLocation()

  const isActive = (path: string) => location.pathname === path

  return (
    <div className="bg-gradient-to-r from-indigo-950 to-indigo-900 text-white shadow-lg border-b border-white/5">
      <div className="max-w-7xl mx-auto flex items-center gap-3 py-2 px-4">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <Trophy className="h-6 w-6 text-indigo-300" />
          <span className="text-lg font-semibold">Cricket Analytics</span>
        </div>

        {/* Divider */}
        <div className="hidden md:block h-4 w-px bg-indigo-300/20" />

        {/* Navigation */}
        <nav className="flex items-center gap-1">
          <Link
            to="/"
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              isActive('/')
                ? 'bg-indigo-700 text-white'
                : 'text-indigo-200 hover:bg-indigo-800 hover:text-white'
            }`}
          >
            Dashboard
          </Link>
          <Link
            to="/batting"
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              isActive('/batting')
                ? 'bg-indigo-700 text-white'
                : 'text-indigo-200 hover:bg-indigo-800 hover:text-white'
            }`}
          >
            Batting
          </Link>
          <Link
            to="/bowling"
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              isActive('/bowling')
                ? 'bg-indigo-700 text-white'
                : 'text-indigo-200 hover:bg-indigo-800 hover:text-white'
            }`}
          >
            Bowling
          </Link>
          <Link
            to="/head-to-head"
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${
              isActive('/head-to-head')
                ? 'bg-indigo-700 text-white'
                : 'text-indigo-200 hover:bg-indigo-800 hover:text-white'
            }`}
          >
            <Users className="h-4 w-4" />
            H2H
          </Link>
          <Link
            to="/schema"
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${
              isActive('/schema')
                ? 'bg-indigo-700 text-white'
                : 'text-indigo-200 hover:bg-indigo-800 hover:text-white'
            }`}
          >
            <Database className="h-4 w-4" />
            Schema
          </Link>
          <Link
            to="/players"
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              isActive('/players')
                ? 'bg-indigo-700 text-white'
                : 'text-indigo-200 hover:bg-indigo-800 hover:text-white'
            }`}
          >
            Players
          </Link>
          <Link
            to="/matches"
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              isActive('/matches')
                ? 'bg-indigo-700 text-white'
                : 'text-indigo-200 hover:bg-indigo-800 hover:text-white'
            }`}
          >
            Matches
          </Link>
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* TIGZIG branding */}
        <span className="text-xs text-indigo-300">TIGZIG</span>
      </div>
    </div>
  )
}
