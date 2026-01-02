import { Film, Clock } from 'lucide-react'

export function GenreAnalytics() {
  return (
    <div className="flex-1 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Film className="w-8 h-8 text-purple-500" />
          <h1 className="text-3xl font-bold text-slate-800">Genre Analytics</h1>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-xl p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
            <Clock className="w-8 h-8 text-purple-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Coming Soon</h2>
          <p className="text-slate-600 max-w-md mx-auto">
            Analyze content trends by genre across decades. See how Drama, Comedy, Action,
            and other genres have evolved over 100+ years of film history.
          </p>
        </div>
      </div>
    </div>
  )
}
