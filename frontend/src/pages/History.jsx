import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getRuns } from '../api/client.js';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Award,
  CheckCircle2,
  Clock,
  Filter,
  Layers,
  Play,
  Search,
  Server,
  Zap,
} from 'lucide-react';
import './History.css';

export default function History() {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [difficultyFilter, setDifficultyFilter] = useState('ALL');

  useEffect(() => {
    getRuns()
      .then((res) => setRuns(res.data.data || []))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load incident history from Atlas.'))
      .finally(() => setLoading(false));
  }, []);

  const formatDuration = (secs) => {
    if (!secs) return '—';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s}s`;
  };

  const getScoreGrade = (score) => {
    if (score >= 1000) return { grade: 'S', color: '#8b5cf6' };
    if (score >= 850) return { grade: 'A', color: '#10b981' };
    if (score >= 700) return { grade: 'B', color: '#38bdf8' };
    if (score >= 500) return { grade: 'C', color: '#f59e0b' };
    return { grade: 'F', color: '#ef4444' };
  };

  const filteredRuns = runs.filter((r) => {
    if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
    if (difficultyFilter !== 'ALL') {
      const runSev = r.severity || (r.difficulty === 'hard' ? 'SEV-1' : r.difficulty === 'medium' ? 'SEV-2' : 'SEV-3');
      if (runSev !== difficultyFilter && r.difficulty !== difficultyFilter) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const name = (r.scenarioName || '').toLowerCase();
      const id = (r._id || '').toLowerCase();
      return name.includes(q) || id.includes(q);
    }
    return true;
  });

  return (
    <div className="history-page">
      {/* Console Nav */}
      <header className="console-nav">
        <div className="console-nav-left">
          <Link to="/" className="console-brand">
            <div className="brand-icon-box">
              <Activity size={16} />
            </div>
            <span>OutageLab</span>
          </Link>
          <span style={{ color: 'var(--text-muted)' }}>/</span>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Incident Run Log & Retrospective History</span>
        </div>

        <div className="console-nav-links">
          <Link to="/scenarios" className="nav-link-item">
            Scenarios
          </Link>
          <Link to="/scenarios" className="btn btn-primary" style={{ padding: '6px 14px', fontSize: 12 }}>
            <Play size={13} /> New Drill
          </Link>
        </div>
      </header>

      <div className="history-container">
        <div className="history-header-block">
          <div className="history-title-group">
            <h1>On-Call Incident Log & Performance Records</h1>
            <p>
              Auditable records of all past incident simulations, Mean Time to Resolution (MTTR),
              and SRE performance scores persisted in MongoDB Atlas.
            </p>
          </div>

          <Link to="/scenarios" className="btn btn-primary">
            Launch New Incident Drill →
          </Link>
        </div>

        {/* Filter Toolbar */}
        <div className="history-filter-bar">
          <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="history-search-input"
              placeholder="Filter by scenario name or incident run ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <select
            className="log-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">Status: All</option>
            <option value="resolved">Resolved</option>
            <option value="active">Active</option>
          </select>

          <select
            className="log-select"
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value)}
          >
            <option value="ALL">Severity: All</option>
            <option value="SEV-1">SEV-1 Critical</option>
            <option value="SEV-2">SEV-2 High</option>
            <option value="SEV-3">SEV-3 Moderate</option>
          </select>
        </div>

        {loading && (
          <div style={{ padding: 60, textAlign: 'center' }}>
            <div className="spinner" style={{ width: 24, height: 24, margin: '0 auto 16px' }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-secondary)' }}>
              QUERYING ATLAS INCIDENT LOGS...
            </span>
          </div>
        )}

        {error && (
          <div className="error-banner">
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
        )}

        {!loading && !error && (
          <div className="history-table-card">
            {filteredRuns.length === 0 ? (
              <div className="empty-state-box">
                <Activity size={36} style={{ color: 'var(--text-muted)' }} />
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 600 }}>No matching incident runs found</h3>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
                    Launch an incident simulation to record your on-call performance.
                  </p>
                </div>
                <Link to="/scenarios" className="btn btn-primary" style={{ marginTop: 8 }}>
                  Start Incident Drill →
                </Link>
              </div>
            ) : (
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Incident ID</th>
                    <th>Scenario Drill</th>
                    <th>Severity</th>
                    <th>Status</th>
                    <th>Operator Score</th>
                    <th>MTTR</th>
                    <th>Timestamp</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRuns.map((r) => {
                    const gradeInfo = getScoreGrade(r.score || 0);

                    return (
                      <tr key={r._id}>
                        <td>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#38bdf8' }}>
                            #OL-{r._id.slice(-6).toUpperCase()}
                          </span>
                        </td>
                        <td>
                          <div className="history-run-title">{r.scenarioName || r.scenarioId}</div>
                        </td>
                        <td>
                          {(() => {
                            const sevCode = r.severity || (r.difficulty === 'hard' ? 'SEV-1' : r.difficulty === 'medium' ? 'SEV-2' : 'SEV-3');
                            const sevClass = sevCode === 'SEV-1' ? 'badge-hard' : sevCode === 'SEV-2' ? 'badge-medium' : 'badge-easy';
                            return <span className={`badge ${sevClass}`}>{sevCode}</span>;
                          })()}
                        </td>
                        <td>
                          <span
                            className={`badge ${r.status === 'resolved' ? 'badge-easy' : 'badge-hard'}`}
                          >
                            {r.status === 'resolved' ? '✓ RESOLVED' : '● ACTIVE'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span
                              style={{
                                fontFamily: 'var(--font-mono)',
                                fontWeight: 700,
                                fontSize: 11,
                                padding: '1px 5px',
                                borderRadius: 3,
                                background: `${gradeInfo.color}20`,
                                color: gradeInfo.color,
                              }}
                            >
                              {gradeInfo.grade}
                            </span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                              {r.score || 0} pts
                            </span>
                          </div>
                        </td>
                        <td>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                            {formatDuration(r.elapsedSeconds)}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            {new Date(r.startedAt).toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </td>
                        <td>
                          {r.status === 'resolved' ? (
                            <Link
                              to={`/report/${r._id}`}
                              className="btn btn-secondary"
                              style={{ padding: '5px 10px', fontSize: 12 }}
                            >
                              Postmortem →
                            </Link>
                          ) : (
                            <Link
                              to={`/incident/${r._id}`}
                              className="btn btn-primary"
                              style={{ padding: '5px 10px', fontSize: 12 }}
                            >
                              <Play size={12} /> Resume War Room
                            </Link>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
