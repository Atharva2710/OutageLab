import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getRun, getScenario, executeAction, finishRun } from '../api/client.js';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Compass,
  Copy,
  Database,
  ExternalLink,
  Filter,
  HelpCircle,
  Layers,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  Search,
  Server,
  ShieldAlert,
  Sliders,
  Terminal,
  TrendingDown,
  TrendingUp,
  X,
  Zap,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts';
import './Dashboard.css';

const ACTION_DEFINITIONS = {
  'restart-service': {
    name: 'Restart Service Instances',
    icon: RefreshCw,
    desc: 'Terminates unhealthy worker processes/pods for target service. Replaces faulty processes if transient.',
    requiresTarget: true,
  },
  'rollback-deployment': {
    name: 'Rollback Deployment Release',
    icon: RotateCcw,
    desc: 'Reverts container image and application release to the previous known stable version (v2.3.0).',
    requiresTarget: false,
  },
  'increase-capacity': {
    name: 'Horizontal Scale Out (Capacity)',
    icon: TrendingUp,
    desc: 'Scales replicas from 3 to 12 across services and raises queue ingress thresholds to absorb surges.',
    requiresTarget: false,
  },
  'restore-db-connections': {
    name: 'Reset Connection Pool & Timeouts',
    icon: Database,
    desc: 'Drains stale leaked sockets, resets connection pool configuration, and restores idle connection timeouts.',
    requiresTarget: false,
  },
  'disable-dependency': {
    name: 'Isolate Upstream Dependency',
    icon: ShieldAlert,
    desc: 'Opens downstream circuit breakers to isolate an upstream dependency from causing cascading failures.',
    requiresTarget: true,
  },
};

const SERVICE_META = {
  'api-gateway': { name: 'API Gateway', role: 'Ingress routing & circuit breaking', tier: 'ingress', upstream: ['Client Traffic'], downstream: ['auth-service', 'product-service', 'inventory-service', 'payment-service'] },
  'auth-service': { name: 'Auth Service', role: 'JWT session tokens & auth validation', tier: 'microservice', upstream: ['api-gateway'], downstream: ['database'] },
  'product-service': { name: 'Product Service', role: 'Catalog queries & inventory lookups', tier: 'microservice', upstream: ['api-gateway'], downstream: ['database', 'inventory-service'] },
  'inventory-service': { name: 'Inventory Service', role: 'Stock reservations & SKU quantities', tier: 'microservice', upstream: ['api-gateway', 'product-service'], downstream: ['database'] },
  'payment-service': { name: 'Payment Service', role: 'Transaction gateway & settlement', tier: 'microservice', upstream: ['api-gateway'], downstream: ['database'] },
  'database': { name: 'Primary Database', role: 'PostgreSQL/Mongo primary state cluster', tier: 'data', upstream: ['auth-service', 'product-service', 'inventory-service', 'payment-service'], downstream: [] },
};

export default function Dashboard() {
  const { runId } = useParams();
  const navigate = useNavigate();

  const [run, setRun] = useState(null);
  const [scenarioMeta, setScenarioMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Tabs: 'topology' | 'telemetry' | 'logs' | 'timeline'
  const [activeTab, setActiveTab] = useState('topology');
  const [selectedServiceId, setSelectedServiceId] = useState('product-service');

  // Remediation action state
  const [selectedAction, setSelectedAction] = useState('restart-service');
  const [targetService, setTargetService] = useState('product-service');
  const [executing, setExecuting] = useState(false);
  const [lastActionResult, setLastActionResult] = useState(null);
  const [finishing, setFinishing] = useState(false);

  // Guided investigation modal
  const [showHintsModal, setShowHintsModal] = useState(false);
  const [revealedHintIndex, setRevealedHintIndex] = useState(0);

  // Log terminal filters
  const [logSearch, setLogSearch] = useState('');
  const [logLevelFilter, setLogLevelFilter] = useState('ALL');
  const [logServiceFilter, setLogServiceFilter] = useState('ALL');
  const [logsCopied, setLogsCopied] = useState(false);

  // Timer
  const [elapsed, setElapsed] = useState(0);
  const terminalEndRef = useRef(null);

  // Load run details
  const fetchRunDetails = async () => {
    try {
      const res = await getRun(runId);
      const runData = res.data.data;
      setRun(runData);

      if (runData.scenarioId) {
        getScenario(runData.scenarioId)
          .then((sRes) => setScenarioMeta(sRes.data.data))
          .catch(() => {});
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load incident telemetry');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRunDetails();
  }, [runId]);

  // Live simulation timer
  useEffect(() => {
    if (!run) return;
    if (run.status === 'resolved') {
      setElapsed(run.elapsedSeconds || 0);
      return;
    }

    const startMs = new Date(run.startedAt).getTime();
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startMs) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [run]);

  const formatTimer = (totalSecs) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Execute remediation action
  const handleExecuteAction = async () => {
    if (!selectedAction || executing) return;
    setExecuting(true);
    setLastActionResult(null);

    try {
      const res = await executeAction(runId, selectedAction, targetService);
      setLastActionResult(res.data);
      setRun(res.data.data);
    } catch (err) {
      setLastActionResult({
        success: false,
        effective: false,
        message: err.response?.data?.message || 'Action execution failed.',
        scoreChange: -25,
      });
    } finally {
      setExecuting(false);
    }
  };

  // Complete run and redirect to postmortem
  const handleFinishRun = async () => {
    setFinishing(true);
    try {
      await finishRun(runId);
      navigate(`/report/${runId}`);
    } catch (err) {
      alert(err.response?.data?.message || 'Error compiling postmortem report');
      setFinishing(false);
    }
  };

  // Copy logs
  const copyTerminalLogs = () => {
    if (!run?.logs) return;
    const text = run.logs
      .map((l) => `[${new Date(l.timestamp).toLocaleTimeString()}] [${l.level.toUpperCase()}] [${l.service}] ${l.message}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    setLogsCopied(true);
    setTimeout(() => setLogsCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="command-center" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <div className="spinner" style={{ width: 24, height: 24 }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-secondary)' }}>
            CONNECTING TO INCIDENT TELEMETRY BUS...
          </span>
        </div>
      </div>
    );
  }

  if (error || !run) {
    return (
      <div className="command-center" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div className="error-banner" style={{ maxWidth: 520 }}>
          <AlertTriangle size={20} />
          <div>
            <div style={{ fontWeight: 600 }}>Failed to join incident war room</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>{error || 'Run record not found'}</div>
          </div>
          <Link to="/scenarios" className="btn btn-secondary" style={{ marginLeft: 'auto' }}>
            Back to Scenarios
          </Link>
        </div>
      </div>
    );
  }

  const isResolved = run.status === 'resolved';
  const failingCount = (run.serviceStates || []).filter((s) => s.status === 'failing').length;
  const degradedCount = (run.serviceStates || []).filter((s) => s.status === 'degraded').length;
  const affectedTotal = failingCount + degradedCount;

  // Selected service telemetry
  const selectedServiceState =
    (run.serviceStates || []).find((s) => s.serviceId === selectedServiceId) ||
    run.serviceStates?.[0];

  // Filtered log list
  const filteredLogs = (run.logs || []).filter((l) => {
    if (logLevelFilter !== 'ALL' && l.level !== logLevelFilter.toLowerCase()) return false;
    if (logServiceFilter !== 'ALL' && l.service !== logServiceFilter) return false;
    if (logSearch.trim()) {
      const q = logSearch.toLowerCase();
      return (
        (l.message || '').toLowerCase().includes(q) ||
        (l.code || '').toLowerCase().includes(q) ||
        (l.service || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Resolve incident severity dynamically from run
  const incidentSeverity = run.severity || (run.difficulty === 'hard' ? 'SEV-1' : run.difficulty === 'medium' ? 'SEV-2' : 'SEV-3');
  const SEVERITY_CONFIG = {
    'SEV-1': { code: 'SEV-1', label: 'CRITICAL OUTAGE', badgeClass: 'badge-hard' },
    'SEV-2': { code: 'SEV-2', label: 'HIGH SEVERITY', badgeClass: 'badge-medium' },
    'SEV-3': { code: 'SEV-3', label: 'MODERATE INCIDENT', badgeClass: 'badge-easy' },
  };
  const currentSev = SEVERITY_CONFIG[incidentSeverity] || SEVERITY_CONFIG['SEV-2'];

  // Telemetry chart data
  const chartData = (run.serviceStates || []).map((s) => ({
    name: s.name.replace(' Service', ''),
    errorRate: s.errorRate,
    latency: s.latency,
    throughput: s.requestsPerMin,
    status: s.status,
  }));

  // Identify highest error rate service for truthful trendline modeling
  const peakService = (run.serviceStates || []).reduce(
    (max, s) => (s.errorRate > (max?.errorRate || 0) ? s : max),
    null
  );
  const currentPeakError = peakService ? peakService.errorRate : 0;

  // Realistic rolling 5-minute telemetry timeline sampled at 1-minute intervals
  const trendData = [
    { time: 'T-04m', errors: isResolved ? 38 : Math.max(8, Math.round(currentPeakError * 0.45)) },
    { time: 'T-03m', errors: isResolved ? 65 : Math.max(18, Math.round(currentPeakError * 0.72)) },
    { time: 'T-02m', errors: isResolved ? 82 : Math.max(25, Math.round(currentPeakError * 0.95)) },
    { time: 'T-01m', errors: isResolved ? 18 : currentPeakError },
    { time: 'Now', errors: isResolved ? 0.3 : currentPeakError },
  ];

  return (
    <div className="command-center">
      {/* Top HUD Bar */}
      <header className="hud-header">
        <div className="hud-left">
          <Link to="/" className="console-brand" style={{ marginRight: 8 }}>
            <div className="brand-icon-box">
              <Activity size={15} />
            </div>
            <span>OutageLab</span>
          </Link>

          <div className="hud-title-wrap">
            <span className="hud-incident-id">RUN #OL-{run._id.slice(-6).toUpperCase()}</span>
            <span className="hud-scenario-name">{run.scenarioName}</span>
            <span className={`badge ${currentSev.badgeClass}`}>{currentSev.code}</span>
          </div>
        </div>

        <div className="hud-right">
          {/* Affected Services Counter */}
          <div className="hud-telemetry-pill">
            <Server size={14} style={{ color: affectedTotal > 0 ? '#ef4444' : '#10b981' }} />
            <span className="hud-label">Impact:</span>
            <span className={`hud-val ${affectedTotal > 0 ? 'alert' : 'score'}`}>
              {affectedTotal} / {run.serviceStates?.length || 6} Affected
            </span>
          </div>

          {/* Real-time Timer */}
          <div className="hud-telemetry-pill">
            <Clock size={14} className="hud-val time" />
            <span className="hud-label">Elapsed:</span>
            <span className="hud-val time">{formatTimer(elapsed)}</span>
          </div>

          {/* SRE Investigation Score */}
          <div className="hud-telemetry-pill" title="Score formula: Base (1000) + MTTR Speed Bonus - Ineffective Action Penalties">
            <Zap size={14} style={{ color: '#fbbf24' }} />
            <span className="hud-label">Score:</span>
            <span className={`hud-val ${run.score > 700 ? 'score' : run.score > 400 ? 'hud-val time' : 'alert'}`}>
              {run.score} pts
            </span>
          </div>

          {/* SRE Guided Hints Button */}
          <button
            className="btn btn-secondary"
            onClick={() => setShowHintsModal(true)}
            style={{ padding: '6px 12px', fontSize: 12 }}
          >
            <Compass size={13} style={{ color: '#38bdf8' }} /> SRE Field Guide
          </button>

          {/* Postmortem CTA when resolved */}
          {isResolved ? (
            <button
              className="btn btn-primary"
              onClick={handleFinishRun}
              disabled={finishing}
              style={{ background: '#10b981', borderColor: '#059669', padding: '6px 14px', fontSize: 12 }}
            >
              {finishing ? 'Compiling Postmortem...' : 'Compile Postmortem Report →'}
            </button>
          ) : (
            <Link to="/scenarios" className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }}>
              Exit War Room
            </Link>
          )}
        </div>
      </header>

      {/* Incident Status Alert Ribbon */}
      <div className={`status-ribbon ${isResolved ? 'resolved' : 'active'}`}>
        <div className="ribbon-info">
          <span className={`pulse-indicator ${isResolved ? 'green' : 'red'}`} />
          <span>
            {isResolved ? (
              <strong>SYSTEM HEALTH RESTORED · ALL SERVICES STABILIZED:</strong>
            ) : (
              <strong>ACTIVE {currentSev.code} PRODUCTION INCIDENT:</strong>
            )}{' '}
            {isResolved
              ? 'Recovery verified. Downstream error rates normalized. Compile postmortem report to lock in your score.'
              : `${affectedTotal} service(s) reporting abnormal telemetry. Trace logs and execute remediation.`}
          </span>
        </div>

        {isResolved && (
          <button className="btn btn-primary" onClick={handleFinishRun} style={{ padding: '3px 10px', fontSize: 11 }}>
            View Postmortem →
          </button>
        )}
      </div>

      {/* Main War Room Body */}
      <div className="war-room-body">
        {/* Left Section: Workspace Tabs */}
        <div className="war-room-main">
          {/* Navigation Tabs */}
          <div className="war-room-tabs">
            <button
              className={`tab-btn ${activeTab === 'topology' ? 'active' : ''}`}
              onClick={() => setActiveTab('topology')}
            >
              <Server size={14} /> Service Topology
            </button>
            <button
              className={`tab-btn ${activeTab === 'telemetry' ? 'active' : ''}`}
              onClick={() => setActiveTab('telemetry')}
            >
              <Activity size={14} /> Telemetry & Trends
            </button>
            <button
              className={`tab-btn ${activeTab === 'logs' ? 'active' : ''}`}
              onClick={() => setActiveTab('logs')}
            >
              <Terminal size={14} /> Diagnostic Logs ({run.logs?.length || 0})
            </button>
            <button
              className={`tab-btn ${activeTab === 'timeline' ? 'active' : ''}`}
              onClick={() => setActiveTab('timeline')}
            >
              <Clock size={14} /> Incident Timeline
            </button>
          </div>

          {/* TAB 1: SERVICE TOPOLOGY & DEPENDENCY MATRIX */}
          {activeTab === 'topology' && (
            <div className="tab-content-area topology-section">
              <div className="topology-canvas-card">
                <div className="topology-canvas-head">
                  <div className="canvas-title">
                    <Layers size={16} style={{ color: '#38bdf8' }} />
                    <span>Microservices Architecture & Request Flow</span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 11, fontFamily: 'var(--font-mono)' }}>
                    <span style={{ color: '#10b981' }}>● Healthy</span>
                    <span style={{ color: '#f59e0b' }}>● Degraded</span>
                    <span style={{ color: '#ef4444' }}>● Failing</span>
                  </div>
                </div>

                {/* Directed Node Layout */}
                <div className="topology-flow-graph">
                  {/* Tier 1: Ingress */}
                  <div className="tier-ingress">
                    {run.serviceStates
                      ?.filter((s) => s.serviceId === 'api-gateway')
                      .map((s) => (
                        <div
                          key={s.serviceId}
                          className={`service-node-card node-${s.status} ${
                            selectedServiceId === s.serviceId ? 'selected' : ''
                          }`}
                          onClick={() => {
                            setSelectedServiceId(s.serviceId);
                            setTargetService(s.serviceId);
                          }}
                          style={{ width: 280 }}
                        >
                          <div className="node-header">
                            <div className="node-name-block">
                              <div className="node-icon-box">🌐</div>
                              <div>
                                <div className="node-title">{s.name}</div>
                                <div className="node-id-sub">Ingress Router</div>
                              </div>
                            </div>
                            <span className={`badge badge-${s.status === 'healthy' ? 'easy' : s.status === 'degraded' ? 'medium' : 'hard'}`}>
                              {s.status}
                            </span>
                          </div>

                          <div className="node-metrics-row">
                            <div className="metric-cell">
                              <span className="metric-label-txt">ERR RATE</span>
                              <span className="metric-val-txt" style={{ color: s.errorRate > 5 ? '#f87171' : '#10b981' }}>
                                {s.errorRate}%
                              </span>
                            </div>
                            <div className="metric-cell">
                              <span className="metric-label-txt">p95 LATENCY</span>
                              <span className="metric-val-txt">{s.latency} ms</span>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>

                  {/* Flow Arrow */}
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
                    ↓ Service Ingress & RPC Routing
                  </div>

                  {/* Tier 2: Domain Microservices */}
                  <div className="tier-microservices">
                    {run.serviceStates
                      ?.filter((s) => s.serviceId !== 'api-gateway' && s.serviceId !== 'database')
                      .map((s) => {
                        const icons = {
                          'auth-service': '🔐',
                          'product-service': '📦',
                          'inventory-service': '📊',
                          'payment-service': '💳',
                        };

                        return (
                          <div
                            key={s.serviceId}
                            className={`service-node-card node-${s.status} ${
                              selectedServiceId === s.serviceId ? 'selected' : ''
                            }`}
                            onClick={() => {
                              setSelectedServiceId(s.serviceId);
                              setTargetService(s.serviceId);
                            }}
                          >
                            <div className="node-header">
                              <div className="node-name-block">
                                <div className="node-icon-box">{icons[s.serviceId] || '⚙️'}</div>
                                <div>
                                  <div className="node-title">{s.name}</div>
                                  <div className="node-id-sub">{s.serviceId}</div>
                                </div>
                              </div>
                              <span className={`badge badge-${s.status === 'healthy' ? 'easy' : s.status === 'degraded' ? 'medium' : 'hard'}`}>
                                {s.status}
                              </span>
                            </div>

                            <div className="node-metrics-row">
                              <div className="metric-cell">
                                <span className="metric-label-txt">ERR RATE</span>
                                <span className="metric-val-txt" style={{ color: s.errorRate > 15 ? '#ef4444' : s.errorRate > 2 ? '#f59e0b' : '#10b981' }}>
                                  {s.errorRate}%
                                </span>
                              </div>
                              <div className="metric-cell">
                                <span className="metric-label-txt">p95 LATENCY</span>
                                <span className="metric-val-txt">{s.latency} ms</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>

                  {/* Flow Arrow */}
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
                    ↓ Connection Pool Sockets
                  </div>

                  {/* Tier 3: Data Store */}
                  <div className="tier-database">
                    {run.serviceStates
                      ?.filter((s) => s.serviceId === 'database')
                      .map((s) => (
                        <div
                          key={s.serviceId}
                          className={`service-node-card node-${s.status} ${
                            selectedServiceId === s.serviceId ? 'selected' : ''
                          }`}
                          onClick={() => {
                            setSelectedServiceId(s.serviceId);
                            setTargetService(s.serviceId);
                          }}
                          style={{ width: 340 }}
                        >
                          <div className="node-header">
                            <div className="node-name-block">
                              <div className="node-icon-box">🗄️</div>
                              <div>
                                <div className="node-title">{s.name}</div>
                                <div className="node-id-sub">Shared Persistence Cluster</div>
                              </div>
                            </div>
                            <span className={`badge badge-${s.status === 'healthy' ? 'easy' : s.status === 'degraded' ? 'medium' : 'hard'}`}>
                              {s.status}
                            </span>
                          </div>

                          <div className="node-metrics-row">
                            <div className="metric-cell">
                              <span className="metric-label-txt">ERR RATE</span>
                              <span className="metric-val-txt" style={{ color: s.errorRate > 10 ? '#ef4444' : '#10b981' }}>
                                {s.errorRate}%
                              </span>
                            </div>
                            <div className="metric-cell">
                              <span className="metric-label-txt">ACTIVE QUERIES</span>
                              <span className="metric-val-txt">{s.requestsPerMin.toLocaleString()} ops/m</span>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>

              {/* Service Deep Dive Drawer / Inspection Panel */}
              {selectedServiceState && (
                <div className="service-detail-drawer">
                  <div className="drawer-header">
                    <div>
                      <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                        NODE INSPECTOR · {selectedServiceState.serviceId}
                      </span>
                      <h3 style={{ fontSize: 16, fontWeight: 600 }}>{selectedServiceState.name}</h3>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span className={`badge badge-${selectedServiceState.status === 'healthy' ? 'easy' : selectedServiceState.status === 'degraded' ? 'medium' : 'hard'}`}>
                        {selectedServiceState.status.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div className="drawer-stats-grid">
                    <div className="drawer-stat-item">
                      <span className="hud-label">Error Rate</span>
                      <div className="hud-val" style={{ color: selectedServiceState.errorRate > 10 ? '#ef4444' : '#10b981', fontSize: 16 }}>
                        {selectedServiceState.errorRate}%
                      </div>
                    </div>

                    <div className="drawer-stat-item">
                      <span className="hud-label">p95 Latency</span>
                      <div className="hud-val" style={{ fontSize: 16 }}>
                        {selectedServiceState.latency} ms
                      </div>
                    </div>

                    <div className="drawer-stat-item">
                      <span className="hud-label">Throughput</span>
                      <div className="hud-val" style={{ fontSize: 16 }}>
                        {selectedServiceState.requestsPerMin.toLocaleString()} req/m
                      </div>
                    </div>

                    <div className="drawer-stat-item">
                      <span className="hud-label">Service Availability</span>
                      <div className="hud-val" style={{ color: selectedServiceState.uptime < 90 ? '#ef4444' : '#10b981', fontSize: 16 }}>
                        {selectedServiceState.uptime}%
                      </div>
                    </div>
                  </div>

                  <div className="drawer-actions-row">
                    <button
                      className="btn btn-secondary"
                      onClick={() => {
                        setLogServiceFilter(selectedServiceState.serviceId);
                        setActiveTab('logs');
                      }}
                      style={{ fontSize: 12, padding: '6px 12px' }}
                    >
                      <Terminal size={13} /> Filter Logs for {selectedServiceState.serviceId}
                    </button>

                    <button
                      className="btn btn-secondary"
                      onClick={() => {
                        setTargetService(selectedServiceState.serviceId);
                      }}
                      style={{ fontSize: 12, padding: '6px 12px' }}
                    >
                      <Zap size={13} /> Select as Action Target
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: TELEMETRY & METRIC CHARTS */}
          {activeTab === 'telemetry' && (
            <div className="tab-content-area telemetry-view">
              {/* Historical Trendline Chart */}
              <div className="telemetry-chart-card">
                <div className="chart-top-bar">
                  <div className="chart-heading">
                    <Activity size={16} style={{ color: '#38bdf8' }} />
                    <span>System Error Rate Timeline ({peakService?.name?.replace(' Service', '') || 'System'}: {currentPeakError}% Current)</span>
                  </div>
                  <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                    Sampling: 1-minute intervals · Rolling 5m window
                  </span>
                </div>

                <div style={{ height: 200, width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData} margin={{ top: 10, right: 20, left: -15, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#192130" />
                      <XAxis dataKey="time" stroke="#475569" fontSize={11} />
                      <YAxis stroke="#475569" fontSize={11} domain={[0, 100]} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0e121b',
                          borderColor: '#222d42',
                          borderRadius: 6,
                          fontSize: 12,
                          color: '#f1f5f9',
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="errors"
                        name="Error Rate %"
                        stroke="#ef4444"
                        strokeWidth={2}
                        dot={{ r: 4, fill: '#ef4444' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Service Error Rate Comparison */}
              <div className="telemetry-chart-card">
                <div className="chart-top-bar">
                  <div className="chart-heading">
                    <AlertTriangle size={16} style={{ color: '#f59e0b' }} />
                    <span>Service Error Rates (% Failure Rate)</span>
                  </div>
                  <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                    SLA Threshold: &lt; 1.0%
                  </span>
                </div>

                <div style={{ height: 220, width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                      <XAxis dataKey="name" stroke="#475569" fontSize={11} />
                      <YAxis stroke="#475569" fontSize={11} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0e121b',
                          borderColor: '#222d42',
                          borderRadius: 6,
                          fontSize: 12,
                          color: '#f1f5f9',
                        }}
                      />
                      <Bar dataKey="errorRate" radius={[4, 4, 0, 0]}>
                        {chartData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.errorRate > 20 ? '#ef4444' : entry.errorRate > 3 ? '#f59e0b' : '#10b981'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Latency Breakdown */}
              <div className="telemetry-chart-card">
                <div className="chart-top-bar">
                  <div className="chart-heading">
                    <Clock size={16} style={{ color: '#06b6d4' }} />
                    <span>Latency (p95 milliseconds)</span>
                  </div>
                  <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                    Target SLA: &lt; 200ms
                  </span>
                </div>

                <div style={{ height: 220, width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                      <XAxis dataKey="name" stroke="#475569" fontSize={11} />
                      <YAxis stroke="#475569" fontSize={11} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0e121b',
                          borderColor: '#222d42',
                          borderRadius: 6,
                          fontSize: 12,
                          color: '#f1f5f9',
                        }}
                      />
                      <Bar dataKey="latency" fill="#38bdf8" radius={[4, 4, 0, 0]}>
                        {chartData.map((entry, index) => (
                          <Cell
                            key={`lat-${index}`}
                            fill={entry.latency > 3000 ? '#ef4444' : entry.latency > 500 ? '#f59e0b' : '#38bdf8'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DIAGNOSTIC LOGS TERMINAL */}
          {activeTab === 'logs' && (
            <div className="tab-content-area log-viewer-pane">
              <div className="log-filter-toolbar">
                <div className="log-search-wrapper">
                  <Search size={14} />
                  <input
                    type="text"
                    className="log-search-input"
                    placeholder="Search logs by keyword, code, or error message..."
                    value={logSearch}
                    onChange={(e) => setLogSearch(e.target.value)}
                  />
                </div>

                <select
                  className="log-select"
                  value={logLevelFilter}
                  onChange={(e) => setLogLevelFilter(e.target.value)}
                >
                  <option value="ALL">Severity: All</option>
                  <option value="CRITICAL">Critical</option>
                  <option value="ERROR">Error</option>
                  <option value="WARN">Warn</option>
                  <option value="INFO">Info</option>
                </select>

                <select
                  className="log-select"
                  value={logServiceFilter}
                  onChange={(e) => setLogServiceFilter(e.target.value)}
                >
                  <option value="ALL">Service: All</option>
                  {(run.serviceStates || []).map((s) => (
                    <option key={s.serviceId} value={s.serviceId}>
                      {s.name}
                    </option>
                  ))}
                </select>

                <button
                  className="btn btn-secondary"
                  onClick={copyTerminalLogs}
                  style={{ padding: '7px 12px', fontSize: 12 }}
                >
                  {logsCopied ? (
                    <>
                      <CheckCircle2 size={13} style={{ color: '#10b981' }} /> Copied
                    </>
                  ) : (
                    <>
                      <Copy size={13} /> Copy Logs
                    </>
                  )}
                </button>
              </div>

              {/* Monospaced Log Stream */}
              <div className="log-terminal-window">
                {filteredLogs.length === 0 ? (
                  <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                    No diagnostic logs match your filter criteria.
                  </div>
                ) : (
                  filteredLogs.map((log, index) => (
                    <div key={index} className="terminal-line">
                      <span className="t-time">{new Date(log.timestamp).toLocaleTimeString()}</span>
                      <span className={`t-level ${log.level}`}>{log.level}</span>
                      <span className="t-service">{log.service}</span>
                      {log.code && <span className="t-code">[{log.code}]</span>}
                      <span className="t-message">{log.message}</span>
                    </div>
                  ))
                )}
                <div ref={terminalEndRef} />
              </div>
            </div>
          )}

          {/* TAB 4: INCIDENT TIMELINE */}
          {activeTab === 'timeline' && (
            <div className="tab-content-area timeline-pane">
              <div className="timeline-list">
                {/* Event 0: Trigger */}
                <div className="timeline-event-card crit">
                  <div className="timeline-top">
                    <span className="timeline-title">Automated PagerDuty Alarm: Incident Triggered</span>
                    <span className="timeline-stamp">
                      T+00:00 · {new Date(run.startedAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    Ingress telemetry thresholds breached. Initial alarms fired on {run.scenarioName}.
                  </p>
                </div>

                {/* Event: Cascading alarms */}
                <div className="timeline-event-card">
                  <div className="timeline-top">
                    <span className="timeline-title">Cascading Degradation Detected</span>
                    <span className="timeline-stamp">T+00:15</span>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {run.logs?.[1]?.message || 'Upstream service timeouts reported across dependent tiers.'}
                  </p>
                </div>

                {/* Action attempts */}
                {run.actionHistory?.map((act, idx) => (
                  <div key={idx} className={`timeline-event-card ${act.effective ? 'success' : 'crit'}`}>
                    <div className="timeline-top">
                      <span className="timeline-title">
                        Remediation Attempt: {ACTION_DEFINITIONS[act.action]?.name || act.action}
                        {act.targetService ? ` (${act.targetService})` : ''}
                      </span>
                      <span className="timeline-stamp">
                        {new Date(act.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      <strong>Result:</strong> {act.message}
                    </p>
                    <div style={{ marginTop: 4 }}>
                      <span
                        className={`badge ${act.effective ? 'badge-easy' : 'badge-hard'}`}
                        style={{ fontSize: 10 }}
                      >
                        {act.effective ? 'EFFECTIVE RESOLUTION (+150 PTS)' : `INEFFECTIVE (${act.scoreChange} PTS)`}
                      </span>
                    </div>
                  </div>
                ))}

                {/* Final status if resolved */}
                {isResolved && (
                  <div className="timeline-event-card success">
                    <div className="timeline-top">
                      <span className="timeline-title">Incident Mitigated & System Health Verified</span>
                      <span className="timeline-stamp">
                        T+{formatTimer(run.elapsedSeconds || 0)} · {new Date(run.resolvedAt).toLocaleTimeString()}
                      </span>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      All microservice error rates decreased below SLA thresholds. Ready to compile postmortem.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Section: Remediation Runbook & Command Sidebar */}
        <aside className="war-room-sidebar">
          <div className="sidebar-header-bar">
            <div className="sidebar-heading">
              <Zap size={15} style={{ color: '#38bdf8' }} />
              <span>Remediation Runbook</span>
            </div>
            <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
              Interactive Actions
            </span>
          </div>

          <div className="runbook-form-area">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span className="hud-label">Select Operational Action</span>
              <div className="action-options-list">
                {Object.entries(ACTION_DEFINITIONS).map(([actionKey, def]) => {
                  const Icon = def.icon;
                  const isSelected = selectedAction === actionKey;

                  return (
                    <div
                      key={actionKey}
                      className={`action-option-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => setSelectedAction(actionKey)}
                    >
                      <div className="action-opt-icon">
                        <Icon size={16} />
                      </div>
                      <div className="action-opt-content">
                        <div className="action-opt-name">{def.name}</div>
                        <div className="action-opt-desc">{def.desc}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {ACTION_DEFINITIONS[selectedAction]?.requiresTarget && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span className="hud-label">Target Microservice</span>
                <select
                  className="log-select"
                  value={targetService}
                  onChange={(e) => setTargetService(e.target.value)}
                >
                  {(run.serviceStates || []).map((s) => (
                    <option key={s.serviceId} value={s.serviceId}>
                      {s.name} ({s.serviceId})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              className="btn btn-primary"
              onClick={handleExecuteAction}
              disabled={executing || isResolved}
              style={{ width: '100%', padding: '10px 16px', fontSize: 13 }}
            >
              {executing ? (
                <>
                  <div className="spinner" />
                  <span>Executing Remediation Pipeline...</span>
                </>
              ) : isResolved ? (
                <span>System Health Stabilized</span>
              ) : (
                <>
                  <Play size={14} />
                  <span>Execute Remediation Action</span>
                </>
              )}
            </button>

            {/* In-Line Action Feedback Banner */}
            {lastActionResult && (
              <div className={`action-feedback-alert ${lastActionResult.effective ? 'effective' : 'ineffective'}`}>
                {lastActionResult.effective ? (
                  <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                ) : (
                  <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                )}
                <div>
                  <div style={{ fontWeight: 600 }}>
                    {lastActionResult.effective
                      ? 'Action Verified: Incident Resolved (+150 pts)'
                      : 'Action Ineffective (Penalty Incurred)'}
                  </div>
                  <div>{lastActionResult.message}</div>
                </div>
              </div>
            )}
          </div>

          {/* Action History Audit Log */}
          <div className="audit-log-area">
            <span className="audit-title">Audit Log ({run.actionHistory?.length || 0} Actions Taken)</span>
            {(!run.actionHistory || run.actionHistory.length === 0) ? (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                No actions attempted yet. Investigate telemetry and logs before executing remediation.
              </div>
            ) : (
              run.actionHistory.map((act, index) => (
                <div key={index} className="audit-item">
                  <div className="audit-top">
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {ACTION_DEFINITIONS[act.action]?.name || act.action}
                      {act.targetService ? ` [${act.targetService}]` : ''}
                    </span>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 700,
                        color: act.scoreChange >= 0 ? '#10b981' : '#ef4444',
                      }}
                    >
                      {act.scoreChange >= 0 ? `+${act.scoreChange}` : act.scoreChange}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{act.message}</div>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {new Date(act.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </aside>
      </div>

      {/* Guided Investigation Mode: SRE Field Guide Modal */}
      {showHintsModal && (
        <div className="hints-modal-backdrop" onClick={() => setShowHintsModal(false)}>
          <div className="hints-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="hints-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Compass size={18} style={{ color: '#38bdf8' }} />
                <h3 style={{ fontSize: 16, fontWeight: 600 }}>SRE Field Guide & Diagnostic Triage</h3>
              </div>
              <button
                onClick={() => setShowHintsModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Progressive hints designed to teach incident response fundamentals without spoiling the root cause.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(scenarioMeta?.hints || [
                { level: 1, title: 'Initial Triage', content: 'Examine which microservice has the highest error rate and recent pod crash restarts.' },
                { level: 2, title: 'Correlate Logs', content: 'Check recent log events for stack traces or deployment timestamps.' },
                { level: 3, title: 'Remediation Decision', content: 'Differentiate between application code defects and infrastructure resource limits.' },
              ]).map((hint, idx) => {
                const isRevealed = revealedHintIndex >= idx;

                return (
                  <div key={idx} className="hint-accordion-item">
                    <div
                      className="hint-accordion-header"
                      onClick={() => setRevealedHintIndex(Math.max(revealedHintIndex, idx))}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="badge badge-cyan" style={{ fontSize: 10 }}>
                          HINT {idx + 1}
                        </span>
                        <span>{hint.title}</span>
                      </div>
                      <ChevronRight size={14} style={{ transform: isRevealed ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }} />
                    </div>

                    {isRevealed ? (
                      <p style={{ fontSize: 12.5, color: 'var(--text-primary)', lineHeight: 1.5, marginTop: 4 }}>
                        {hint.content}
                      </p>
                    ) : (
                      <button
                        className="btn btn-secondary"
                        onClick={() => setRevealedHintIndex(idx)}
                        style={{ alignSelf: 'flex-start', fontSize: 11, padding: '4px 8px' }}
                      >
                        Reveal Hint {idx + 1}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              className="btn btn-primary"
              onClick={() => setShowHintsModal(false)}
              style={{ alignSelf: 'flex-end', padding: '8px 16px', fontSize: 13 }}
            >
              Back to War Room
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
