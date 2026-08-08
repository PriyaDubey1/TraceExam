import { useState } from 'react';
import './VerifyChain.css';

const API_BASE = 'http://localhost:4000';

const STAGE_ORDER = ['press', 'warehouse', 'transport', 'exam_centre'];
const STAGE_LABELS = {
  press: 'Press',
  warehouse: 'Warehouse',
  transport: 'Transport',
  exam_centre: 'Exam Centre',
};

function VerifyChain() {
  const [packetId, setPacketId] = useState('');
  const [packet, setPacket] = useState(null);
  const [trail, setTrail] = useState([]);
  const [verifyResult, setVerifyResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = async () => {
    if (!packetId) return;
    setLoading(true);
    setError(null);
    setPacket(null);
    setTrail([]);
    setVerifyResult(null);

    try {
      const res = await fetch(`${API_BASE}/api/packets/${packetId}`);
      if (!res.ok) throw new Error('Packet not found');
      const data = await res.json();
      setPacket(data.packet);
      setTrail(data.custody_trail || []);
    } catch (err) {
      setError('Packet not found. Check the ID and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setVerifying(true);
    setVerifyResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/packets/${packetId}/verify`);
      const data = await res.json();
      setVerifyResult(data);
    } catch (err) {
      setError('Verification failed. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="verify-page">
      <header className="verify-header">
        <h1>Custody Chain Verification</h1>
        <p className="tagline">Authenticate the lifecycle of exam packets across all custody nodes.</p>
      </header>

      <div className="search-row">
        <input
          type="text"
          placeholder="Enter Packet ID (e.g. PKT-001)"
          value={packetId}
          onChange={(e) => setPacketId(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button onClick={handleSearch} disabled={loading}>
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>

      {error && <p className="error-text">{error}</p>}

      {packet && (
        <div className="packet-card">
          <div className="packet-meta">
            <div>
              <span className="meta-label">Packet ID</span>
              <p className="meta-value">{packet.id}</p>
            </div>
            <div>
              <span className="meta-label">Exam Name</span>
              <p className="meta-value">{packet.exam_name}</p>
            </div>
            <div>
              <span className="meta-label">Paper Hash</span>
              <p className="meta-value mono">{packet.paper_hash?.slice(0, 16)}...</p>
            </div>
          </div>

          <h3 className="timeline-title">Custody Timeline</h3>
          <div className="timeline">
            {STAGE_ORDER.map((stageKey) => {
              const entry = trail.find((t) => t.stage === stageKey);
              return (
                <div key={stageKey} className={`timeline-node ${entry ? 'filled' : 'empty'}`}>
                  <div className="node-dot" />
                  <span className="node-label">{STAGE_LABELS[stageKey]}</span>
                  {entry ? (
                    <span className="node-time">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                  ) : (
                    <span className="node-time pending">Pending</span>
                  )}
                </div>
              );
            })}
          </div>

          <button className="verify-btn" onClick={handleVerify} disabled={verifying}>
            {verifying ? 'Verifying...' : 'Verify Chain Integrity'}
          </button>

          {verifyResult && (
            <p className={`verify-result ${verifyResult.chain_valid ? 'valid' : 'invalid'}`}>
              {verifyResult.chain_valid
                ? '✓ Chain valid — no tampering detected'
                : `⚠ Tampering detected at: ${verifyResult.broken_at}`}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default VerifyChain;