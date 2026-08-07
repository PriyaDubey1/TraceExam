import { useState } from 'react';
import './ReportLeak.css';

const API_BASE = 'http://localhost:4000';

function ReportLeak() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = (selectedFile) => {
    setFile(selectedFile);
    setResult(null);
    setError(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API_BASE}/api/leak/report-file`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError('Something went wrong. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="report-leak">
      <header className="report-header">
        <h1>Report a Suspected Leak</h1>
        <p className="tagline">Upload an image, PDF, or document — AI will analyze it instantly.</p>
      </header>

      <div
        className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => document.getElementById('file-input').click()}
      >
        <input
          id="file-input"
          type="file"
          accept="image/*,.pdf,.pptx,.docx"
          style={{ display: 'none' }}
          onChange={(e) => e.target.files[0] && handleFile(e.target.files[0])}
        />
        <div className="upload-icon">⬆</div>
        <p className="upload-text">
          {file ? file.name : 'Drag a file here or click to browse'}
        </p>
        <p className="upload-hint">Supports JPG, PNG, PDF, PPTX up to 20MB</p>
      </div>

      {file && (
        <button className="analyze-btn" onClick={handleAnalyze} disabled={loading}>
          {loading ? 'Analyzing...' : 'Analyze File'}
        </button>
      )}

      {error && <p className="error-text">{error}</p>}

      {result && (
        <div className="result-panel">
          {result.match_found && (
            <>
              <span className="result-badge confirmed">Match Found</span>
              <p><strong>Matched Packet ID:</strong> {result.packet_id}</p>
              <p><strong>Traced to:</strong> {result.traced_to_stage} (Officer: {result.traced_to_official})</p>
              <p className="incident-note">New incident created: {result.new_incident_id}</p>
            </>
          )}

          {!result.match_found && result.ai_flagged && (
            <>
              <span className="result-badge suspected">AI Flagged — Suspected Leak</span>
              <p><strong>Confidence:</strong> {result.confidence}</p>
              <p className="incident-note">New incident created: {result.new_incident_id}</p>
            </>
          )}

          {!result.match_found && !result.ai_flagged && (
            <span className="result-badge clear">No Leak Detected</span>
          )}

          {result.ai_summary && (
            <div className="ai-analysis">
              <p className="ai-label">✨ AI Analysis</p>
              <p>{result.ai_summary}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ReportLeak;