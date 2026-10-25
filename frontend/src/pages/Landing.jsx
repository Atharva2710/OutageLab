import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getScenarios, getRuns } from '../api/client.js';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Database,
  Layers,
  Play,
  RotateCcw,
  Search,
  Server,
  ShieldAlert,
  Terminal,
  Zap,
} from 'lucide-react';
import './Landing.css';

export default function Landing() {
  const navigate = useNavigate();
  const [scenarios, setScenarios] = useState([]);
  const [runCount, setRunCount] = useState(0);

  useEffect(() => {
    getScenarios()
      .then((res) => setScenarios(res.data.data || []))
      .catch(() => {});

    getRuns()
      .then((res) => setRunCount(res.data.data?.length || 0))
      .catch(() => {});
  }, []);

  return (
    <div className="landing-page">
      {/* Top Header Nav */}
      <header className="console-nav">
        <div className="console-nav-left">
          <Link to="/" className="console-brand">
            <div className="brand-icon-box">
              <Activity size={16} />
            </div>
            <span>OutageLab</span>
          </Link>
          <div className="system-status-indicator">
            <span className="pulse-indicator green" />
            <span>SIMULATION ENGINE ONLINE · ATLAS PERSISTENCE ACTIVE</span>
          </div>
        </div>

        <nav className="console-nav-links">
          <Link to="/scenarios" className="nav-link-item">
            Scenarios
          </Link>
          <Link to="/history" className="nav-link-item">
            Incident Log {runCount > 0 && `(${runCount})`}
          </Link>
          <Link to="/scenarios" className="btn btn-primary" style={{ padding: '6px 14px', fontSize: 12 }}>
            <Play size={13} /> Launch Simulator
          </Link>
        </nav>
      </header>

      {/* Hero Section with Live System Preview */}
      <section className="hero-section">
        <div className="container">
          <div className="hero-grid">
            {/* Left Column: Mission Briefing */}
            <div className="hero-content">
              <div className="hero-pill">
                <span className="pulse-indicator red" />
                <span>INTERACTIVE ON-CALL DRILL ENVIRONMENT</span>
              </div>

              <h1 className="hero-title">
                Master Incident Response <br />
                <span className="highlight">Under Simulated Outage Conditions</span>
              </h1>

              <p className="hero-desc">
                Step into the shoes of an on-call site reliability engineer. Triage telemetry spikes, parse
                cascading error logs across 6 interconnected microservices, execute targeted runbook actions,
                and receive a postmortem score based on MTTR and remediation accuracy.
              </p>

              <div className="hero-cta-group">
                <button className="btn btn-primary" onClick={() => navigate('/scenarios')} style={{ padding: '10px 20px', fontSize: 14 }}>
                  Launch Incident Simulation <ArrowRight size={16} />
                </button>
                <Link to="/history" className="btn btn-secondary" style={{ padding: '10px 18px', fontSize: 14 }}>
                  Explore Past Incidents
                </Link>
              </div>

              <div className="hero-metrics-bar">
                <div className="hero-metric-item">
                  <span className="hero-metric-value">6</span>
                  <span className="hero-metric-label">Simulated Services</span>
                </div>
                <div className="hero-metric-item">
                  <span className="hero-metric-value">{scenarios.length || 3}</span>
                  <span className="hero-metric-label">Deterministic Scenarios</span>
                </div>
                <div className="hero-metric-item">
                  <span className="hero-metric-value">5</span>
                  <span className="hero-metric-label">Runbook Actions</span>
                </div>
                <div className="hero-metric-item">
                  <span className="hero-metric-value">100%</span>
                  <span className="hero-metric-label">Backend Driven</span>
                </div>
              </div>
            </div>

            {/* Right Column: Authentic Component Preview */}
            <div className="console-preview-card">
              <div className="preview-card-header">
                <div className="preview-window-dots">
                  <span className="preview-dot" />
                  <span className="preview-dot" />
                  <span className="preview-dot" />
                </div>
                <span className="preview-title">INCIDENT #OL-9021 · TELEMETRY HUD</span>
                <span className="badge badge-hard">SEV-1 CRITICAL</span>
              </div>

              <div className="preview-incident-alert">
                <div className="preview-alert-left">
                  <AlertTriangle size={15} style={{ color: '#ef4444' }} />
                  <span>Product Service CrashLoopBackOff: Circuit Breaker Open</span>
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#f87171' }}>T+04:12</span>
              </div>

              <div className="preview-card-body">
                {/* 6 Microservices Grid */}
                <div className="preview-services-grid">
                  <div className="preview-svc-node status-degraded">
                    <div className="preview-svc-top">
                      <span>API Gateway</span>
                      <span style={{ color: '#f59e0b' }}>12% ERR</span>
                    </div>
                    <div className="preview-svc-bottom">
                      <span>850ms</span>
                      <span>2.4k r/m</span>
                    </div>
                  </div>

                  <div className="preview-svc-node status-healthy">
                    <div className="preview-svc-top">
                      <span>Auth Service</span>
                      <span style={{ color: '#10b981' }}>0.3% ERR</span>
                    </div>
                    <div className="preview-svc-bottom">
                      <span>45ms</span>
                      <span>800 r/m</span>
                    </div>
                  </div>

                  <div className="preview-svc-node status-failing">
                    <div className="preview-svc-top">
                      <span>Product Service</span>
                      <span style={{ color: '#ef4444' }}>78% ERR</span>
                    </div>
                    <div className="preview-svc-bottom">
                      <span>4200ms</span>
                      <span>320 r/m</span>
                    </div>
                  </div>

                  <div className="preview-svc-node status-degraded">
                    <div className="preview-svc-top">
                      <span>Inventory Svc</span>
                      <span style={{ color: '#f59e0b' }}>34% ERR</span>
                    </div>
                    <div className="preview-svc-bottom">
                      <span>1800ms</span>
                      <span>290 r/m</span>
                    </div>
                  </div>

                  <div className="preview-svc-node status-healthy">
                    <div className="preview-svc-top">
                      <span>Payment Svc</span>
                      <span style={{ color: '#10b981' }}>0.8% ERR</span>
                    </div>
                    <div className="preview-svc-bottom">
                      <span>120ms</span>
                      <span>150 r/m</span>
                    </div>
                  </div>

                  <div className="preview-svc-node status-healthy">
                    <div className="preview-svc-top">
                      <span>Database</span>
                      <span style={{ color: '#10b981' }}>0.2% ERR</span>
                    </div>
                    <div className="preview-svc-bottom">
                      <span>12ms</span>
                      <span>4.8k ops</span>
                    </div>
                  </div>
                </div>

                {/* Diagnostic Log Terminal Preview */}
                <div className="preview-terminal-snippet">
                  <div className="preview-log-line">
                    <span className="log-tag-crit">[CRIT]</span>
                    <span style={{ color: '#06b6d4' }}>product-service:</span>
                    <span className="log-txt">Unhandled NullReferenceException at line 247</span>
                  </div>
                  <div className="preview-log-line">
                    <span className="log-tag-warn">[WARN]</span>
                    <span style={{ color: '#06b6d4' }}>api-gateway:</span>
                    <span className="log-txt">Circuit breaker OPEN for product-service after 50 consecutive 503s</span>
                  </div>
                  <div className="preview-log-line">
                    <span className="log-tag-info">[INFO]</span>
                    <span style={{ color: '#06b6d4' }}>k8s-controller:</span>
                    <span className="log-txt">Pod restart count reached 8 — CrashLoopBackOff</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Incident Response Workflow: Detect -> Investigate -> Remediate -> Learn */}
      <section className="workflow-section">
        <div className="container">
          <div className="section-head">
            <h2>The Incident Engineering Lifecycle</h2>
            <p>Develop instincts for production observability, symptom triage, and post-incident analysis.</p>
          </div>

          <div className="workflow-steps-grid">
            <div className="step-card">
              <span className="step-number">PHASE 01</span>
              <div className="step-icon-wrap">
                <AlertTriangle size={18} />
              </div>
              <h3>1. Detect & Triage</h3>
              <p>
                Receive the automated PagerDuty alarm. Observe which microservice is alerting, review p95
                latency surges, and assess customer-facing blast radius.
              </p>
            </div>

            <div className="step-card">
              <span className="step-number">PHASE 02</span>
              <div className="step-icon-wrap">
                <Search size={18} />
              </div>
              <h3>2. Investigate Evidence</h3>
              <p>
                Cross-examine real-time stack traces, correlate deployment timestamps, and trace upstream
                HTTP 503 errors to the true root cause dependency.
              </p>
            </div>

            <div className="step-card">
              <span className="step-number">PHASE 03</span>
              <div className="step-icon-wrap">
                <Zap size={18} />
              </div>
              <h3>3. Remediate & Recover</h3>
              <p>
                Execute the appropriate operational runbook action: container rollback, horizontal scaling,
                connection pool reset, or circuit-breaker dependency isolation.
              </p>
            </div>

            <div className="step-card">
              <span className="step-number">PHASE 04</span>
              <div className="step-icon-wrap">
                <CheckCircle2 size={18} />
              </div>
              <h3>4. Retrospective & Learn</h3>
              <p>
                Review your operator score, Mean Time to Resolution (MTTR), penalty deductions, and automated
                postmortem report with actionable prevention lessons.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Architecture & Dependency Map Section */}
      <section className="arch-section">
        <div className="container">
          <div className="arch-layout">
            <div className="arch-info">
              <h2>Interconnected Microservices Platform</h2>
              <p>
                OutageLab models a realistic e-commerce platform where failure in one tier cascades through
                circuit breakers, connection pools, and thread queues.
              </p>

              <div className="arch-features-list">
                <div className="arch-feature-item">
                  <CheckCircle2 size={16} className="arch-feature-check" />
                  <span>
                    <strong>Cascading Degradation:</strong> A failing upstream blocks thread pools on dependent
                    services.
                  </span>
                </div>
                <div className="arch-feature-item">
                  <CheckCircle2 size={16} className="arch-feature-check" />
                  <span>
                    <strong>Action Consequences:</strong> Ineffective actions penalize MTTR and trigger secondary
                    outages.
                  </span>
                </div>
                <div className="arch-feature-item">
                  <CheckCircle2 size={16} className="arch-feature-check" />
                  <span>
                    <strong>Deterministic Logic:</strong> Every scenario is driven by consistent, verifiable
                    state transitions.
                  </span>
                </div>
              </div>
            </div>

            {/* Architecture Flow Visualizer */}
            <div className="arch-visual-box">
              <div className="arch-tier">
                <span className="arch-tier-title">Tier 1 · Ingress & Routing</span>
                <div className="arch-node-bar">
                  <div className="arch-pill-node">
                    <Server size={14} style={{ color: '#38bdf8' }} />
                    <span>API Gateway</span>
                    <span className="badge badge-cyan" style={{ fontSize: 9 }}>Ingress</span>
                  </div>
                </div>
              </div>

              <div className="arch-flow-arrow">↓ Routing & Auth Checks</div>

              <div className="arch-tier">
                <span className="arch-tier-title">Tier 2 · Domain Microservices</span>
                <div className="arch-node-bar">
                  <div className="arch-pill-node">
                    <Server size={14} style={{ color: '#10b981' }} />
                    <span>Auth</span>
                  </div>
                  <div className="arch-pill-node">
                    <Server size={14} style={{ color: '#ef4444' }} />
                    <span>Product</span>
                  </div>
                  <div className="arch-pill-node">
                    <Server size={14} style={{ color: '#f59e0b' }} />
                    <span>Inventory</span>
                  </div>
                  <div className="arch-pill-node">
                    <Server size={14} style={{ color: '#10b981' }} />
                    <span>Payment</span>
                  </div>
                </div>
              </div>

              <div className="arch-flow-arrow">↓ Connection Pool & Persistence</div>

              <div className="arch-tier">
                <span className="arch-tier-title">Tier 3 · Data Layer</span>
                <div className="arch-node-bar">
                  <div className="arch-pill-node">
                    <Database size={14} style={{ color: '#8b5cf6' }} />
                    <span>Primary Database Cluster</span>
                    <span className="badge badge-neutral" style={{ fontSize: 9 }}>Connection Pool</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Scenario Briefing Previews */}
      <section className="scenarios-preview-section">
        <div className="container">
          <div className="section-head">
            <h2>Active Simulation Scenarios</h2>
            <p>Choose an incident drill tailored to test specific site reliability competencies.</p>
          </div>

          <div className="scenario-cards-row">
            {scenarios.map((s) => (
              <div key={s._id} className="scenario-brief-card">
                <div className="scenario-brief-top">
                  <div className="scenario-brief-meta">
                    <span className={`badge badge-${s.difficulty}`}>{s.difficulty}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      ⏱ ~{s.estimatedMinutes}m
                    </span>
                  </div>
                  <h3 className="scenario-brief-title">{s.name}</h3>
                  <p className="scenario-brief-desc">{s.description}</p>
                </div>

                <button
                  className="btn btn-secondary"
                  onClick={() => navigate('/scenarios')}
                  style={{ width: '100%', justifyContent: 'space-between' }}
                >
                  <span>Review Scenario Briefing</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action Banner */}
      <section className="cta-banner">
        <div className="container">
          <div className="cta-box">
            <h2>Ready to Take the On-Call Rotation?</h2>
            <p>
              Launch an incident simulation, analyze real-time diagnostic evidence, and earn your SRE
              performance rating.
            </p>
            <button
              className="btn btn-primary"
              onClick={() => navigate('/scenarios')}
              style={{ padding: '12px 24px', fontSize: 14 }}
            >
              Select an Incident Scenario →
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="console-footer">
        <div className="container">
          <div className="footer-content">
            <div>
              <strong>OutageLab Operations Console</strong> — Interactive Production Incident Simulator.
            </div>
            <div>
              <span>Simulation environment only · No actual cloud resources or production traffic modified.</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
