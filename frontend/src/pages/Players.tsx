export function Players() {
  return (
    <div className="flex-1 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">Players</h1>
          <p className="text-base text-slate-600 mt-1">
            Browse player profiles and statistics
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-8">
          <div className="text-base text-slate-600 text-center py-12 bg-slate-50 rounded-md">
            <i className="fas fa-users text-4xl text-slate-400 mb-4 block"></i>
            <p className="font-medium text-slate-700">Player data will appear here</p>
            <p className="mt-2">Connect to backend to load player statistics</p>
          </div>
        </div>
      </div>
    </div>
  )
}
