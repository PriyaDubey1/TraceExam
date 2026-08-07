import Sidebar from '../components/Sidebar';
import './MainLayout.css';

function MainLayout({ children }) {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">{children}</main>
    </div>
  );
}

export default MainLayout;