import { useState, useEffect } from 'react';
import { Send, AtSign, MessageCircle, Smartphone } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import './MonitorFeed.css';

const API_BASE = 'http://localhost:4000';

const PLATFORM_ICONS = {
  Telegram: Send,
  Twitter: AtSign,
  WhatsApp: MessageCircle,
};

function MonitorFeed() {
  const [posts, setPosts] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastScanTime, setLastScanTime] = useState(null);
  const { showToast } = useToast();

  const loadFeed = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/monitor/feed`);
      if (!res.ok) throw new Error('Failed to load feed');
      const data = await res.json();
      setPosts(data);
    } catch (err) {
      console.error(err);
      showToast('Could not load the monitoring feed. Is the backend running?', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeed();
  }, []);

  const handleScan = async () => {
    setScanning(true);
    try {
      const res = await fetch(`${API_BASE}/api/monitor/scan`, { method: 'POST' });
      if (!res.ok) throw new Error('Scan failed');
      const data = await res.json();
      setLastScanTime(data.scan_time);
      await loadFeed();
      if (data.flagged > 0) {
        showToast(`${data.new_posts_found} new post(s) found — ${data.flagged} flagged as leaks.`, 'error');
      } else {
        showToast(`${data.new_posts_found} new post(s) found — all clear, no leaks detected.`, 'success');
      }
    } catch (err) {
      console.error(err);
      showToast('Monitoring scan failed. Please try again.', 'error');
    } finally {
      setScanning(false);
    }
  };

  const flaggedCount = posts.filter((p) => p.flagged).length;

  return (
    <div className="monitor-page">
      <header className="monitor-header">
        <span className="page-eyebrow">Live Feed</span>
        <h1>Live Monitoring Feed</h1>
        <p className="tagline">Simulated social-media scanning for leaked exam content.</p>
      </header>

      <button className="scan-btn" onClick={handleScan} disabled={scanning}>
        {scanning ? 'Scanning...' : 'Run Monitoring Scan'}
      </button>

      <div className="scan-stats">
        <span>Posts scanned: {posts.filter((p) => p.checked).length} / {posts.length}</span>
        <span>Leaks flagged: {flaggedCount}</span>
        {lastScanTime && <span>Last scan: {new Date(lastScanTime).toLocaleTimeString()}</span>}
      </div>

      {loading && <p className="loading-text">Loading feed...</p>}

      <div className="feed-list">
        {posts.map((post) => {
          const PlatformIcon = PLATFORM_ICONS[post.platform] || Smartphone;
          return (
            <div key={post.id} className={`feed-item ${post.flagged ? 'flagged' : ''}`}>
              <div className="feed-item-header">
                <PlatformIcon className="platform-icon" size={15} strokeWidth={1.75} />
                <span className="author-handle">{post.author_handle}</span>
                {post.flagged && <span className="leak-tag">Leak detected · {post.matched_packet_id}</span>}
                <span className="post-time">{new Date(post.posted_at).toLocaleTimeString()}</span>
              </div>
              <p className="post-text">{post.post_text}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default MonitorFeed;