import { useState } from 'react';
import './ScanCustody.css';

const API_BASE = 'http://localhost:4000';

function ScanCustody() {
  const [packetId, setPacketId] = useState('');
  const [stage, setStage] = useState('');
  const [officialName, setOfficialName] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [trail, setTrail] = useState([]);

  const fetchTrail = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/api/packets/${id}`);
      if (!res.ok) return;
      const data = await res.json();
      setTrail(data.custody_trail || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch(`${API_BASE}/api/custody`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packet_id: packetId,
          stage,
          official_name: officialName,
          location,
        }),
      });

      if (!res.ok) throw new Error('Failed to log scan');

      setMessage('Custody scan logged successfully.');
      fetchTrail(packetId);
      setStage('');
      setOfficialName('');
      setLocation('');
    } catch (err) {
      setError('Something went wrong. Please check the Packet ID and try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="scan-page">
      <header className="scan-header">
        <h1>Log Custody Scan</h1>
        <p className="tagline">Record a physical handoff of an exam paper packet.</p>
      </header>

      <div className="scan-body">
        <form className="scan-form" onSubmit={handleSubmit}>
          <label>Packet ID</label>
          <input
            type="text"
            placeholder="e.g. PKT-001"
            value={packetId}
            onChange={(e) => setPacketId(e.target.value)}
            required
          />

          <label>Stage</label>
          <select value={stage} onChange={(e) => setStage(e.target.value)} required>
            <option value="">Select current custody stage</option>
            <option value="press">Press</option>
            <option value="warehouse">Warehouse</option>
            <option value="transport">Transport</option>
            <option value="exam_centre">Exam Centre</option>
          </select>

          <label>Official Name</label>
          <input
            type="text"
            placeholder="Name of receiving officer"
            value={officialName}
            onChange={(e) => setOfficialName(e.target.value)}
            required
          />

          <label>Location</label>
          <input
            type="text"
            placeholder="e.g. Centre #402, Main Vault"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            required
          />

          <button type="submit" disabled={loading}>
            {loading ? 'Logging...' : 'Log Scan'}
          </button>

          {message && <p className="success-text">{message}</p>}
          {error && <p className="error-text">{error}</p>}
        </form>

        <div className="trail-panel">
          <h2>Recent Scans</h2>
          {trail.length === 0 && <p className="empty-text">No scans logged yet for this packet.</p>}
          {trail.map((entry) => (
            <div key={entry.id} className="trail-item">
              <span className="trail-stage">{entry.stage}</span>
              <p className="trail-official">Officer: {entry.official_name}</p>
              <p className="trail-location">Loc: {entry.location}</p>
              <p className="trail-time">{new Date(entry.timestamp).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ScanCustody;