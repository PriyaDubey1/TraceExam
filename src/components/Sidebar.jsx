import { useState, useRef } from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
  Home,
  Landmark,
  PackageSearch,
  ShieldCheck,
  TriangleAlert,
  Radio,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
} from 'lucide-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { useTheme } from '../context/ThemeContext';
import './Sidebar.css';

const navItems = [
  { path: '/', label: 'Home', icon: Home, end: true },
  { path: '/public', label: 'Public Dashboard', icon: Landmark },
  { path: '/scan', label: 'Scan Custody', icon: PackageSearch },
  { path: '/dashboard', label: 'Verify Chain', icon: ShieldCheck },
  { path: '/report-leak', label: 'Report a Leak', icon: TriangleAlert },
  { path: '/monitor', label: 'Live Monitoring', icon: Radio },
];

function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { dark, toggleTheme } = useTheme();
  const navRef = useRef(null);

  useGSAP(() => {
    gsap.from('.nav-item', {
      opacity: 0,
      x: -12,
      duration: 0.4,
      stagger: 0.06,
      ease: 'power2.out',
      delay: 0.15,
    });
  }, { scope: navRef });

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${dark ? 'dark' : ''}`}>
      <div className="sidebar-top">
        {!collapsed && (
          <Link to="/" className="sidebar-logo">
            TraceExam
          </Link>
        )}
        <button
          className="collapse-btn"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <nav className="sidebar-nav" ref={navRef}>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="nav-icon" size={18} strokeWidth={1.75} />
              {!collapsed && <span className="nav-label">{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar-bottom">
        {!collapsed && (
          <span className="status-text">
            <span className="status-dot" />
            System Status: Online
          </span>
        )}
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {dark ? <Sun size={16} strokeWidth={1.75} /> : <Moon size={16} strokeWidth={1.75} />}
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;