import { Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Home from './pages/Home';
import PublicDashboard from './pages/PublicDashboard';
import ReportLeak from './pages/ReportLeak';
import ScanCustody from './pages/ScanCustody';
import VerifyChain from './pages/VerifyChain';
import MonitorFeed from './pages/MonitorFeed';
import { useLenis } from './hooks/useLenis';
import './App.css';

function App() {
  return (
    <MainLayout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/public" element={<PublicDashboard />} />
        <Route path="/report-leak" element={<ReportLeak />} />
        <Route path="/scan" element={<ScanCustody />} />
        <Route path="/dashboard" element={<VerifyChain />} />
        <Route path="/monitor" element={<MonitorFeed />} />
      </Routes>
    </MainLayout>
  );
}

export default App;