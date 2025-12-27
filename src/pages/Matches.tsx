export function Matches() {
  return (
    <div className="flex-1 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">Matches</h1>
          <p className="text-base text-slate-600 mt-1">
            View match history and results
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-8">
          <div className="text-base text-slate-600 text-center py-12 bg-slate-50 rounded-md">
            <i className="fas fa-calendar-alt text-4xl text-slate-400 mb-4 block"></i>
            <p className="font-medium text-slate-700">Match data will appear here</p>
            <p className="mt-2">Connect to backend to load match history</p>
          </div>
        </div>
      </div>
    </div>
  )
}
