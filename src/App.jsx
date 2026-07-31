import { Routes, Route } from 'react-router-dom'
import PublicDashboard from './pages/PublicDashboard'
import './App.css'

function App() {
  return (
    <Routes>
      <Route path="/public" element={<PublicDashboard />} />
      <Route path="/" element={<PublicDashboard />} />
    </Routes>
  )
}

export default App