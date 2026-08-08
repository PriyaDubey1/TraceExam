import { Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import PublicDashboard from './pages/PublicDashboard';
import ReportLeak from './pages/ReportLeak';
import ScanCustody from './pages/ScanCustody';
import VerifyChain from './pages/VerifyChain';
import './App.css';

function App() {
  return (
    <MainLayout>
      <Routes>
        <Route path="/public" element={<PublicDashboard />} />
        <Route path="/report-leak" element={<ReportLeak />} />
        <Route path="/scan" element={<ScanCustody />} />
        <Route path="/dashboard" element={<VerifyChain />} />
        <Route path="/" element={<PublicDashboard />} />
        
      </Routes>
    </MainLayout>
  );
}

export default App;