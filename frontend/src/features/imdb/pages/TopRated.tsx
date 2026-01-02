import { Star, Clock } from 'lucide-react'

export function TopRated() {
  return (
    <div className="flex-1 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Star className="w-8 h-8 text-amber-500" />
          <h1 className="text-3xl font-bold text-slate-800">Top Rated Movies</h1>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 rounded-full mb-4">
            <Clock className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Coming Soon</h2>
          <p className="text-slate-600 max-w-md mx-auto">
            Explore the highest-rated movies and TV shows from IMDb's database of 1.6M rated titles.
            Filter by votes, year, and genre.
          </p>
        </div>
      </div>
    </div>
  )
}
