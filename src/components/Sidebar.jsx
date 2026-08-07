import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import './Sidebar.css';

const navItems = [
  { path: '/public', label: 'Public Dashboard', icon: '🏛️' },
  { path: '/scan', label: 'Scan Custody', icon: '📦' },
  { path: '/dashboard', label: 'Verify Chain', icon: '✅' },
  { path: '/report-leak', label: 'Report a Leak', icon: '⚠️' },
  { path: '/monitor', label: 'Live Monitoring', icon: '📡' },
];

function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [dark, setDark] = useState(false);

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${dark ? 'dark' : ''}`}>
      <div className="sidebar-top">
        {!collapsed && <span className="sidebar-logo">TraceExam</span>}
        <button className="collapse-btn" onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? '»' : '«'}
        </button>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="nav-icon">{item.icon}</span>
            {!collapsed && <span className="nav-label">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-bottom">
        {!collapsed && <span className="status-text">System Status: Online</span>}
        <button className="theme-toggle" onClick={() => setDark(!dark)}>
          {dark ? '☀️' : '🌙'}
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;