import { Users, Clock } from 'lucide-react'

export function ActorSearch() {
  return (
    <div className="flex-1 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Users className="w-8 h-8 text-blue-500" />
          <h1 className="text-3xl font-bold text-slate-800">Actor Search</h1>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <Clock className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Coming Soon</h2>
          <p className="text-slate-600 max-w-md mx-auto">
            Search through 15 million actors, directors, and crew members.
            View filmography, career stats, and collaborations.
          </p>
        </div>
      </div>
    </div>
  )
}
