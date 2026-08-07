import { Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import PublicDashboard from './pages/PublicDashboard';
import './App.css';

function App() {
  return (
    <MainLayout>
      <Routes>
        <Route path="/public" element={<PublicDashboard />} />
        <Route path="/" element={<PublicDashboard />} />
      </Routes>
    </MainLayout>
  );
}

export default App;