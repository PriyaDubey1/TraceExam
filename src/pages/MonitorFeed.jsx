import { useState, useEffect } from 'react';
import './MonitorFeed.css';

const API_BASE = 'http://localhost:4000';

const PLATFORM_ICONS = {
  Telegram: '✈️',
  Twitter: '🐦',
  WhatsApp: '💬',
};

function MonitorFeed() {
  const [posts, setPosts] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [lastScan, setLastScan] = useState(null);

  const loadFeed = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/monitor/feed`);
      const data = await res.json();
      setPosts(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadFeed();
  }, []);

  const handleScan = async () => {
    setScanning(true);
    try {
      const res = await fetch(`${API_BASE}/api/monitor/scan`, { method: 'POST' });
      const data = await res.json();
      setLastScan(data);
      await loadFeed();
    } catch (err) {
      console.error(err);
    } finally {
      setScanning(false);
    }
  };

  const flaggedCount = posts.filter((p) => p.flagged).length;

  return (
    <div className="monitor-page">
      <header className="monitor-header">
        <h1>Live Monitoring Feed</h1>
        <p className="tagline">Simulated social-media scanning for leaked exam content.</p>
      </header>

      <button className="scan-btn" onClick={handleScan} disabled={scanning}>
        {scanning ? 'Scanning...' : 'Run Monitoring Scan'}
      </button>

      <div className="scan-stats">
        <span>Posts scanned: {posts.filter((p) => p.checked).length} / {posts.length}</span>
        <span>Leaks flagged: {flaggedCount}</span>
        {lastScan && <span>Last scan: {new Date().toLocaleTimeString()}</span>}
      </div>

      <div className="feed-list">
        {posts.map((post) => (
          <div key={post.id} className={`feed-item ${post.flagged ? 'flagged' : ''}`}>
            <div className="feed-item-header">
              <span className="platform-icon">{PLATFORM_ICONS[post.platform] || '📱'}</span>
              <span className="author-handle">{post.author_handle}</span>
              {post.flagged && <span className="leak-tag">Leak detected · {post.matched_packet_id}</span>}
              <span className="post-time">{new Date(post.posted_at).toLocaleTimeString()}</span>
            </div>
            <p className="post-text">{post.post_text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default MonitorFeed;