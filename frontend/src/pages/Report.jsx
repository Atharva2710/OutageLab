import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getReport } from '../api/client.js';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Award,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  FileText,
  Layers,
  RotateCcw,
  ShieldAlert,
  Zap,
} from 'lucide-react';
import './Report.css';

export default function Report() {
  const { runId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getReport(runId)
      .then((res) => setData(res.data.data))
      .catch((err) => setError(err.response?.data?.message || 'Failed to compile postmortem report'))
      .finally(() => setLoading(false));
  }, [runId]);

  if (loading) {
    return (
      <div className="report-page" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <div className="spinner" style={{ width: 24, height: 24 }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-secondary)' }}>
            ANALYZING INCIDENT TELEMETRY AND AUDIT LOGS...
          </span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="report-page" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div className="error-banner" style={{ maxWidth: 520 }}>
          <AlertTriangle size={20} />
          <div>
            <div style={{ fontWeight: 600 }}>Postmortem Report Not Found</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>{error || 'Unable to locate report record.'}</div>
          </div>
          <Link to={`/incident/${runId}`} className="btn btn-secondary" style={{ marginLeft: 'auto' }}>
            Return to War Room
          </Link>
        </div>
      </div>
    );
  }

  const { run, report } = data;
  const score = report.finalScore ?? run.score ?? 0;

  // Grade calculation
  let grade = 'B';
  let gradeTitle = 'Site Reliability Engineer';
  let gradeClass = 'grade-b';

  if (score >= 1000) {
    grade = 'S';
    gradeTitle = 'Staff Reliability Engineer (Flawless)';
    gradeClass = 'grade-s';
  } else if (score >= 850) {
    grade = 'A';
    gradeTitle = 'Senior Systems Engineer (Rapid)';
    gradeClass = 'grade-a';
  } else if (score >= 700) {
    grade = 'B';
    gradeTitle = 'Site Reliability Engineer (Nominal)';
    gradeClass = 'grade-b';
  } else if (score >= 500) {
    grade = 'C';
    gradeTitle = 'Associate DevOps Operator';
    gradeClass = 'grade-c';
  } else {
    grade = 'F';
    gradeTitle = 'Incident Operator (Needs Retraining)';
    gradeClass = 'grade-f';
  }

  const formatDuration = (secs) => {
    const m = Math.floor((secs || 0) / 60);
    const s = (secs || 0) % 60;
    return `${m}m ${s}s`;
  };

  const incidentSeverity = run.severity || (run.difficulty === 'hard' ? 'SEV-1' : run.difficulty === 'medium' ? 'SEV-2' : 'SEV-3');
  const severityBadgeClass = incidentSeverity === 'SEV-1' ? 'badge-hard' : incidentSeverity === 'SEV-2' ? 'badge-medium' : 'badge-easy';

  const copyPostmortemMarkdown = () => {
    const md = `# OutageLab Incident Postmortem: ${report.incidentTitle}
**Incident ID:** #OL-${run._id.slice(-6).toUpperCase()}
**Severity:** ${incidentSeverity}
**Generated:** ${new Date(report.generatedAt).toLocaleString()}
**Operator Score:** ${score} pts (Rating: ${grade} · ${gradeTitle})
**Mean Time to Resolution (MTTR):** ${formatDuration(report.timeTaken)}
**Total Actions Executed:** ${run.actionHistory?.length || 0} (Penalties: -${run.penaltyTotal || 0} pts)

---

## 1. Executive Summary
${report.summary}

## 2. Root Cause Analysis (RCA)
${report.rootCause}

## 3. Resolution Verification
${report.resolutionExplanation}

## 4. Key Engineering Lessons Learned & Prevention
${(report.lessonsLearned || []).map((l, i) => `${i + 1}. ${l}`).join('\n')}

## 5. Operator Remediation Audit Trail
| Timestamp | Remediation Action | Target | Outcome | Score Delta |
|---|---|---|---|---|
${(run.actionHistory || [])
  .map(
    (act) =>
      `| ${new Date(act.timestamp).toLocaleTimeString()} | ${act.action} | ${act.targetService || 'All'} | ${
        act.effective ? 'SUCCESS' : 'INEFFECTIVE'
      } | ${act.scoreChange >= 0 ? `+${act.scoreChange}` : act.scoreChange} |`
  )
  .join('\n')}
`;

    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="report-page">
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
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Incident Postmortem Report</span>
        </div>

        <div className="console-nav-links">
          <Link to="/scenarios" className="nav-link-item">
            Scenarios
          </Link>
          <Link to="/history" className="nav-link-item">
            Incident Log
          </Link>
        </div>
      </header>

      <div className="report-container">
        {/* Hero Card */}
        <div className="postmortem-hero-card">
          <div className="postmortem-hero-left">
            <div className="postmortem-meta-row">
              <span className="badge badge-easy">INCIDENT RESOLVED</span>
              <span className={`badge ${severityBadgeClass}`}>{incidentSeverity}</span>
              <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                INCIDENT ID #OL-{run._id.slice(-6).toUpperCase()}
              </span>
            </div>

            <h1 className="postmortem-title">{report.incidentTitle}</h1>
            <p className="postmortem-desc">
              Comprehensive Post-Incident Engineering Retrospective. Review the root cause diagnosis,
              remediation timeline, and your on-call performance scorecard.
            </p>
          </div>

          <div className="rating-stamp-card">
            <div className={`rating-badge-large ${gradeClass}`}>{grade}</div>
            <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Performance Grade
            </span>
            <div className="rating-title-txt">{gradeTitle}</div>
          </div>
        </div>

        {/* Operational Scorecard KPI Grid */}
        <div className="report-kpi-grid">
          <div className="report-kpi-card">
            <span className="report-kpi-label">Final Operator Score</span>
            <div className="report-kpi-val" style={{ color: '#10b981' }}>
              {score} pts
            </div>
          </div>

          <div className="report-kpi-card">
            <span className="report-kpi-label">Time to Resolution (MTTR)</span>
            <div className="report-kpi-val" style={{ color: '#38bdf8' }}>
              {formatDuration(report.timeTaken)}
            </div>
          </div>

          <div className="report-kpi-card">
            <span className="report-kpi-label">Remediation Attempts</span>
            <div className="report-kpi-val">{run.actionHistory?.length || 0}</div>
          </div>

          <div className="report-kpi-card">
            <span className="report-kpi-label">Deducted Penalties</span>
            <div className="report-kpi-val" style={{ color: run.penaltyTotal > 0 ? '#ef4444' : '#10b981' }}>
              -{run.penaltyTotal || 0} pts
            </div>
          </div>
        </div>

        {/* 1. Executive Summary */}
        <section className="report-doc-section">
          <div className="doc-section-head">
            <FileText size={16} style={{ color: '#38bdf8' }} />
            <span>1. Executive Summary</span>
          </div>
          <div className="doc-section-body">{report.summary}</div>
        </section>

        {/* 2. Root Cause Analysis (RCA) */}
        <section className="report-doc-section">
          <div className="doc-section-head">
            <ShieldAlert size={16} style={{ color: '#ef4444' }} />
            <span>2. Root Cause Analysis (RCA)</span>
          </div>
          <div className="rca-callout-box">{report.rootCause}</div>
        </section>

        {/* 3. Resolution Verification */}
        <section className="report-doc-section">
          <div className="doc-section-head">
            <CheckCircle2 size={16} style={{ color: '#10b981' }} />
            <span>3. Resolution Verification</span>
          </div>
          <div className="resolution-callout-box">{report.resolutionExplanation}</div>
        </section>

        {/* 4. SRE Key Takeaways & Prevention */}
        <section className="report-doc-section">
          <div className="doc-section-head">
            <Award size={16} style={{ color: '#8b5cf6' }} />
            <span>4. SRE Key Lessons Learned & Architectural Mitigations</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(report.lessonsLearned || []).map((lesson, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  padding: 12,
                  background: 'var(--bg-panel)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 13,
                  lineHeight: 1.5,
                }}
              >
                <CheckCircle2 size={15} style={{ color: '#10b981', flexShrink: 0, marginTop: 2 }} />
                <span>{lesson}</span>
              </div>
            ))}
          </div>
        </section>

        {/* 5. Operator Action Audit Trail */}
        <section className="report-doc-section">
          <div className="doc-section-head">
            <Clock size={16} style={{ color: '#06b6d4' }} />
            <span>5. Operator Remediation Audit Trail</span>
          </div>
          <table className="report-action-table">
            <thead>
              <tr>
                <th>Execution Time</th>
                <th>Remediation Action</th>
                <th>Target Microservice</th>
                <th>Outcome</th>
                <th>Score Impact</th>
              </tr>
            </thead>
            <tbody>
              {run.actionHistory?.map((act, i) => (
                <tr key={i}>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>
                    {new Date(act.timestamp).toLocaleTimeString()}
                  </td>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{act.action}</td>
                  <td>{act.targetService || 'System-Wide'}</td>
                  <td>
                    <span
                      className={`badge ${act.effective ? 'badge-easy' : 'badge-hard'}`}
                      style={{ fontSize: 10 }}
                    >
                      {act.effective ? 'SUCCESS' : 'INEFFECTIVE'}
                    </span>
                  </td>
                  <td
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 700,
                      color: act.scoreChange >= 0 ? '#10b981' : '#ef4444',
                    }}
                  >
                    {act.scoreChange >= 0 ? `+${act.scoreChange}` : act.scoreChange}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Footer Actions */}
        <div className="report-bottom-bar">
          <div style={{ display: 'flex', gap: 10 }}>
            <Link to="/scenarios" className="btn btn-primary">
              Launch Another Scenario <ArrowRight size={14} />
            </Link>
            <Link to="/history" className="btn btn-secondary">
              View Incident History
            </Link>
          </div>

          <button className="btn btn-secondary" onClick={copyPostmortemMarkdown}>
            {copied ? (
              <>
                <Check size={14} style={{ color: '#10b981' }} /> Copied to Clipboard
              </>
            ) : (
              <>
                <Copy size={14} /> Export Postmortem (Markdown)
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
