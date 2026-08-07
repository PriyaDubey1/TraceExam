import { useState, useEffect } from 'react';
import './PublicDashboard.css';

const API_BASE = 'http://localhost:4000';

const STATUS_COLORS = {
  Confirmed: '#FF5D1F',
  Alleged: '#C9A227',
  Denied: '#8A8A8A',
  Suspected: '#7C5CBF',
};

function PublicDashboard() {
  const [stats, setStats] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/stats`)
      .then((res) => res.json())
      .then(setStats)
      .catch((err) => console.error('Stats fetch failed:', err));

    fetch(`${API_BASE}/api/incidents/demo`)
      .then((res) => res.json())
      .then((data) => {
        setIncidents(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Incidents fetch failed:', err);
        setLoading(false);
      });
  }, []);

  const filtered = incidents.filter((inc) => {
    const matchesSearch = inc.exam_name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'All' || inc.leak_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Public Accountability Dashboard</h1>
        <p className="tagline">From press to paper to public</p>
      </header>

      {stats && (
        <div className="stats-row">
          <div className="stat-card">
            <span className="stat-num">{stats.total_incidents}</span>
            <span className="stat-label">Incidents Tracked</span>
          </div>
          <div className="stat-card">
            <span className="stat-num">{stats.confirmed_leaks}</span>
            <span className="stat-label">Confirmed Leaks</span>
          </div>
          <div className="stat-card">
            <span className="stat-num">{stats.total_packets_tracked}</span>
            <span className="stat-label">Packets Tracked</span>
          </div>
          <div className="stat-card">
            <span className="stat-num">{stats.total_custody_scans}</span>
            <span className="stat-label">Custody Scans</span>
          </div>
        </div>
      )}

      <div className="controls">
        <input
          type="text"
          placeholder="Search incidents, regions, or exam names..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-box"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="status-filter"
        >
          <option value="All">All Statuses</option>
          <option value="Confirmed">Confirmed</option>
          <option value="Alleged">Alleged</option>
          <option value="Denied">Denied</option>
          <option value="Suspected">Suspected</option>
        </select>
      </div>

      <h2 className="section-title">Recent Cases</h2>

      {loading && <p className="loading-text">Loading records...</p>}
      {!loading && filtered.length === 0 && (
        <p className="empty-text">No incidents match your filters.</p>
      )}

      <div className="case-grid">
        {filtered.map((inc) => (
          <div key={inc.id} className="case-card">
            <span
              className="status-badge"
              style={{ color: STATUS_COLORS[inc.leak_status], borderColor: STATUS_COLORS[inc.leak_status] }}
            >
              {inc.leak_status}
            </span>
            <h3 className="case-title">{inc.exam_name}</h3>
            <p className="case-meta">{inc.year} · {inc.region}</p>
            <p className="case-desc">{inc.description}</p>
            <p className="case-action"><strong>Action:</strong> {inc.action_taken}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default PublicDashboard;