import { Trophy, Users, Calendar, TrendingUp } from 'lucide-react'

export function Dashboard() {
  return (
    <div className="flex-1 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Page Title */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">Cricket Analytics Dashboard</h1>
          <p className="text-base text-slate-600 mt-1">
            Explore player statistics, match data, and performance analytics
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={<Users className="h-6 w-6" />}
            label="Total Players"
            value="--"
            color="indigo"
          />
          <StatCard
            icon={<Calendar className="h-6 w-6" />}
            label="Total Matches"
            value="--"
            color="emerald"
          />
          <StatCard
            icon={<Trophy className="h-6 w-6" />}
            label="Tournaments"
            value="--"
            color="amber"
          />
          <StatCard
            icon={<TrendingUp className="h-6 w-6" />}
            label="Avg. Score"
            value="--"
            color="rose"
          />
        </div>

        {/* Placeholder Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Recent Matches</h2>
            <div className="text-base text-slate-600 text-center py-8 bg-slate-50 rounded-md">
              Connect to backend to view match data
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Top Performers</h2>
            <div className="text-base text-slate-600 text-center py-8 bg-slate-50 rounded-md">
              Connect to backend to view player stats
            </div>
          </div>
        </div>

        {/* Backend Status */}
        <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-base font-medium text-amber-800">
            <i className="fas fa-info-circle mr-2"></i>
            Backend not connected. Configure API endpoint to load data.
          </p>
        </div>
      </div>
    </div>
  )
}

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: string
  color: 'indigo' | 'emerald' | 'amber' | 'rose'
}

function StatCard({ icon, label, value, color }: StatCardProps) {
  const colorClasses = {
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-200',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    amber: 'bg-amber-50 text-amber-600 border-amber-200',
    rose: 'bg-rose-50 text-rose-600 border-rose-200',
  }

  return (
    <div className={`rounded-lg border p-4 ${colorClasses[color]}`}>
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <p className="text-base font-medium text-slate-700">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </div>
    </div>
  )
}
