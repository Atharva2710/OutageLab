import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getScenarios, createRun } from '../api/client.js';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Layers,
  Play,
  Server,
  ShieldAlert,
} from 'lucide-react';
import './Scenarios.css';

const SEVERITY_MAP = {
  'SEV-1': { code: 'SEV-1', label: 'SEV-1 · Critical Outage', badgeClass: 'badge-hard' },
  'SEV-2': { code: 'SEV-2', label: 'SEV-2 · High Severity', badgeClass: 'badge-medium' },
  'SEV-3': { code: 'SEV-3', label: 'SEV-3 · Moderate Incident', badgeClass: 'badge-easy' },
  hard: { code: 'SEV-1', label: 'SEV-1 · Critical Outage', badgeClass: 'badge-hard' },
  medium: { code: 'SEV-2', label: 'SEV-2 · High Severity', badgeClass: 'badge-medium' },
  easy: { code: 'SEV-3', label: 'SEV-3 · Moderate Incident', badgeClass: 'badge-easy' },
};

export default function Scenarios() {
  const [scenarios, setScenarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    getScenarios()
      .then((r) => {
        const sorted = (r.data.data || []).sort((a, b) => {
          const order = { easy: 0, medium: 1, hard: 2 };
          return (order[a.difficulty] ?? 1) - (order[b.difficulty] ?? 1);
        });
        setScenarios(sorted);
      })
      .catch((e) => setError(e.response?.data?.message || 'Failed to load scenarios from simulation engine.'))
      .finally(() => setLoading(false));
  }, []);

  async function handleStart(scenarioId) {
    setStarting(scenarioId);
    setError(null);
    try {
      const r = await createRun(scenarioId);
      navigate(`/incident/${r.data.data._id}`);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to initialize incident run');
      setStarting(null);
    }
  }

  return (
    <div className="scenarios-page">
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
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Incident Scenario Catalog</span>
        </div>

        <div className="console-nav-links">
          <Link to="/history" className="nav-link-item">
            Incident Log
          </Link>
          <Link to="/" className="nav-link-item">
            Documentation
          </Link>
        </div>
      </header>

      <div className="scenarios-container">
        <div className="scenarios-header">
          <h1>Incident Drills & Operational Briefings</h1>
          <p>
            Select an incident scenario to take the on-call pager. Each drill simulates a real production
            outage pattern in our distributed architecture. Review the reported symptoms, inspect the affected
            topology, and restore system health.
          </p>
        </div>

        {loading && (
          <div className="loading" style={{ padding: 60, textAlign: 'center' }}>
            <div className="spinner" style={{ width: 24, height: 24, margin: '0 auto 16px' }} />
            <span>Loading simulation scenarios from Atlas cluster...</span>
          </div>
        )}

        {error && (
          <div className="error-banner">
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
        )}

        {!loading && !error && (
          <div className="scenarios-grid">
            {scenarios.map((s) => {
              const sevKey = s.severity || s.difficulty;
              const sev = SEVERITY_MAP[sevKey] || SEVERITY_MAP.medium;
              const isStarting = starting === s.scenarioId;

              return (
                <div key={s._id} className="scenario-brief-card-full">
                  {/* Left Main Body */}
                  <div className="scenario-card-main">
                    <div className="scenario-top-meta">
                      <span className={`badge ${sev.badgeClass}`}>{sev.label}</span>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        ⏱ Target MTTR: ~{s.estimatedMinutes} mins
                      </span>
                    </div>

                    <h2 className="scenario-card-title">{s.name}</h2>
                    <p className="scenario-card-desc">{s.description}</p>

                    {/* Initial Reported Symptoms */}
                    <div className="scenario-symptoms-box">
                      <div className="symptoms-title">
                        <AlertTriangle size={13} />
                        <span>Telemetry & Anomaly Symptoms</span>
                      </div>
                      <div className="symptoms-list">
                        {(s.symptoms && s.symptoms.length > 0
                          ? s.symptoms
                          : [
                              'Multiple 5xx errors reported on customer ingress gateway',
                              'Degraded response times detected across core services',
                              'Telemetry thresholds exceeded baseline SLAs',
                            ]
                        ).map((symptom, idx) => (
                          <div key={idx} className="symptom-item">
                            <span className="symptom-bullet">•</span>
                            <span>{symptom}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right Sidebar: Objectives, Affected, and Launch */}
                  <div className="scenario-card-sidebar">
                    <div className="objectives-block">
                      <div className="objectives-title">Learning Objectives</div>
                      <div className="objectives-list">
                        {(s.learningObjectives && s.learningObjectives.length > 0
                          ? s.learningObjectives
                          : [
                              'Perform systematic root-cause isolation across microservice tiers',
                              'Evaluate blast radius using telemetry and error rates',
                              'Select and execute accurate remediation without compounding outage',
                            ]
                        ).map((obj, idx) => (
                          <div key={idx} className="objective-item">
                            <CheckCircle2 size={14} className="objective-check" />
                            <span>{obj}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="affected-services-wrap">
                      <div className="affected-label">Affected Services</div>
                      <div className="affected-tags">
                        {(s.affectedServices && s.affectedServices.length > 0
                          ? s.affectedServices
                          : ['api-gateway', 'product-service']
                        ).map((svc) => (
                          <span key={svc} className="affected-tag">
                            {svc}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="launch-btn-wrap">
                      <button
                        className="btn btn-primary launch-btn"
                        onClick={() => handleStart(s.scenarioId)}
                        disabled={isStarting}
                      >
                        {isStarting ? (
                          <>
                            <div className="spinner" />
                            <span>Spinning up War Room...</span>
                          </>
                        ) : (
                          <>
                            <Play size={14} />
                            <span>Accept On-Call Pager & Start Drill →</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
