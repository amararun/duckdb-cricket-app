import { Routes, Route } from 'react-router-dom'
import { Header } from './components/layout/Header'
import { Footer } from './components/layout/Footer'
import { Dashboard } from './pages/Dashboard'
import { Players } from './pages/Players'
import { Matches } from './pages/Matches'
import { Schema } from './pages/Schema'
import { BattingStats } from './pages/BattingStats'
import { BowlingStats } from './pages/BowlingStats'
import { Admin } from './pages/Admin'

function App() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/schema" element={<Schema />} />
        <Route path="/batting" element={<BattingStats />} />
        <Route path="/bowling" element={<BowlingStats />} />
        <Route path="/players" element={<Players />} />
        <Route path="/matches" element={<Matches />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
      <Footer />
    </div>
  )
}

export default App
