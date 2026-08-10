import { Link } from 'react-router-dom';
import './Home.css';

function Home() {
  return (
    <div className="home-page">
      <section className="hero">
        <h1>From press to paper to public</h1>
        <p className="hero-sub">Nobody leaks. Nobody hides.</p>
        <Link to="/public" className="cta-btn">View Public Dashboard</Link>
      </section>

      <div className="feature-grid">
        <Link to="/scan" className="feature-card">
          <span className="feature-icon">📦</span>
          <h3>Custody Chain</h3>
          <p>Track every handoff with immutable logs.</p>
        </Link>
        <Link to="/report-leak" className="feature-card">
          <span className="feature-icon">✨</span>
          <h3>AI Leak Detection</h3>
          <p>Automated scanning for leaked content.</p>
        </Link>
        <Link to="/dashboard" className="feature-card">
          <span className="feature-icon">✅</span>
          <h3>Chain Verification</h3>
          <p>Detect tampering across the custody trail.</p>
        </Link>
        <Link to="/monitor" className="feature-card">
          <span className="feature-icon">📡</span>
          <h3>Live Monitoring</h3>
          <p>Simulated scanning of public channels.</p>
        </Link>
      </div>
    </div>
  );
}

export default Home;