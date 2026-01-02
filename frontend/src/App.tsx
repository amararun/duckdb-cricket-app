import { Routes, Route, useLocation } from 'react-router-dom'
import { Header } from './components/layout/Header'
import { Footer } from './components/layout/Footer'

// Landing page
import { Landing } from './pages/Landing'

// Cricket feature
import {
  CricketDashboard,
  BattingStats,
  BowlingStats,
  HeadToHead,
  CricketSchema
} from './features/cricket'

// IMDb feature
import {
  ImdbDashboard,
  TopRated,
  ActorSearch,
  GenreAnalytics
} from './features/imdb'

function App() {
  const location = useLocation()
  const isLandingPage = location.pathname === '/'

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {!isLandingPage && <Header />}
      <Routes>
        {/* Landing */}
        <Route path="/" element={<Landing />} />

        {/* Cricket Routes */}
        <Route path="/cricket" element={<CricketDashboard />} />
        <Route path="/cricket/batting" element={<BattingStats />} />
        <Route path="/cricket/bowling" element={<BowlingStats />} />
        <Route path="/cricket/head-to-head" element={<HeadToHead />} />
        <Route path="/cricket/schema" element={<CricketSchema />} />

        {/* IMDb Routes */}
        <Route path="/imdb" element={<ImdbDashboard />} />
        <Route path="/imdb/top-rated" element={<TopRated />} />
        <Route path="/imdb/actors" element={<ActorSearch />} />
        <Route path="/imdb/genres" element={<GenreAnalytics />} />
      </Routes>
      {!isLandingPage && <Footer />}
    </div>
  )
}

export default App
