/**
 * Scenario: Bad Deployment
 * 
 * A bad version of the Product Service was deployed 12 minutes ago.
 * The new code has a bug that crashes the service under load.
 * Root cause: faulty deployment of product-service v2.3.1
 * Resolution: Roll back the deployment
 */

const { makeLog, applyDegradationCascade } = require('../helpers');

function getInitialState() {
  return {
    serviceStates: [
      { serviceId: 'api-gateway', name: 'API Gateway', status: 'degraded', errorRate: 12, latency: 850, requestsPerMin: 2400, uptime: 98.2 },
      { serviceId: 'auth-service', name: 'Authentication Service', status: 'healthy', errorRate: 0.3, latency: 45, requestsPerMin: 800, uptime: 99.9 },
      { serviceId: 'product-service', name: 'Product Service', status: 'failing', errorRate: 78, latency: 4200, requestsPerMin: 320, uptime: 43.1 },
      { serviceId: 'inventory-service', name: 'Inventory Service', status: 'degraded', errorRate: 34, latency: 1800, requestsPerMin: 290, uptime: 72.4 },
      { serviceId: 'payment-service', name: 'Payment Service', status: 'healthy', errorRate: 0.8, latency: 120, requestsPerMin: 150, uptime: 99.7 },
      { serviceId: 'database', name: 'Database', status: 'healthy', errorRate: 0.2, latency: 12, requestsPerMin: 4800, uptime: 99.95 },
    ],
    logs: [
      makeLog('critical', 'product-service', 'Unhandled exception in ProductController.getProducts(): NullReferenceException at line 247', 'ERR_NULL_REF'),
      makeLog('error', 'api-gateway', 'Upstream product-service returning 503 Service Unavailable', 'ERR_BAD_GATEWAY'),
      makeLog('error', 'product-service', 'Health check failed: /health endpoint timeout after 5000ms', 'ERR_HEALTH_TIMEOUT'),
      makeLog('warn', 'inventory-service', 'Dependency product-service unreachable — stock sync paused', 'WARN_SYNC_PAUSED'),
      makeLog('error', 'product-service', 'Deployment v2.3.1 started 12 minutes ago — error rate spiked immediately after', 'INFO_DEPLOY'),
      makeLog('error', 'product-service', 'Memory usage at 94% — possible memory leak in new build', 'ERR_MEM_HIGH'),
      makeLog('warn', 'api-gateway', 'Circuit breaker OPEN for product-service after 50 consecutive failures', 'WARN_CIRCUIT_OPEN'),
      makeLog('info', 'product-service', 'Previous version v2.3.0 ran stable for 7 days with <0.5% error rate', 'INFO_PREV_STABLE'),
      makeLog('error', 'product-service', 'Pod crash-loop detected: restarted 8 times in last 10 minutes', 'ERR_CRASH_LOOP'),
      makeLog('warn', 'inventory-service', 'Product catalog sync 47 minutes behind schedule', 'WARN_SYNC_DELAY'),
    ],
    engineState: {
      scenario: 'bad-deployment',
      deploymentVersion: 'v2.3.1',
      previousVersion: 'v2.3.0',
      rolledBack: false,
      serviceRestarted: false,
      capacityIncreased: false,
      phase: 'incident', // incident → mitigated → resolved
    },
  };
}

function getValidActions(engineState) {
  if (engineState.phase === 'resolved') return [];

  // All actions are always surfaced to user, but only the right ones work
  return [
    'restart-service',
    'rollback-deployment',
    'increase-capacity',
    'restore-db-connections',
    'disable-dependency',
  ];
}

function applyAction(action, targetService, currentRun) {
  const eng = { ...currentRun.engineState };
  let serviceStates = currentRun.serviceStates.map(s => ({ ...s }));
  const newLogs = [];
  let scoreChange = 0;
  let effective = false;
  let message = '';
  let resolved = false;

  if (action === 'rollback-deployment') {
    if (eng.rolledBack) {
      message = 'Deployment has already been rolled back.';
      scoreChange = -25;
    } else {
      // Correct action — resolves the scenario
      eng.rolledBack = true;
      eng.phase = 'resolved';
      effective = true;
      resolved = true;
      scoreChange = 150;
      message = 'Rollback to v2.3.0 initiated successfully. Product Service is recovering.';

      serviceStates = [
        { serviceId: 'api-gateway', name: 'API Gateway', status: 'healthy', errorRate: 0.5, latency: 95, requestsPerMin: 2400, uptime: 99.8 },
        { serviceId: 'auth-service', name: 'Authentication Service', status: 'healthy', errorRate: 0.3, latency: 45, requestsPerMin: 800, uptime: 99.9 },
        { serviceId: 'product-service', name: 'Product Service', status: 'healthy', errorRate: 0.4, latency: 98, requestsPerMin: 1800, uptime: 99.6 },
        { serviceId: 'inventory-service', name: 'Inventory Service', status: 'healthy', errorRate: 0.5, latency: 82, requestsPerMin: 890, uptime: 99.5 },
        { serviceId: 'payment-service', name: 'Payment Service', status: 'healthy', errorRate: 0.8, latency: 120, requestsPerMin: 150, uptime: 99.7 },
        { serviceId: 'database', name: 'Database', status: 'healthy', errorRate: 0.2, latency: 12, requestsPerMin: 4800, uptime: 99.95 },
      ];

      newLogs.push(makeLog('info', 'product-service', 'Rolling back to v2.3.0 — previous stable version', 'INFO_ROLLBACK'));
      newLogs.push(makeLog('info', 'product-service', 'v2.3.0 deployment complete. Error rate normalizing.', 'INFO_DEPLOY_OK'));
      newLogs.push(makeLog('info', 'api-gateway', 'Circuit breaker CLOSED — product-service responding normally', 'INFO_CIRCUIT_CLOSED'));
      newLogs.push(makeLog('info', 'inventory-service', 'Product sync resumed. Catching up on 47 min backlog.', 'INFO_SYNC_RESUME'));
    }
  } else if (action === 'restart-service') {
    if (eng.serviceRestarted) {
      message = 'Service was already restarted — it crashed again immediately. The bug is in the code, not the process.';
      scoreChange = -50;
      newLogs.push(makeLog('error', 'product-service', 'Service restarted but crashed again within 30s — crash loop continues', 'ERR_RESTART_FAILED'));
    } else {
      eng.serviceRestarted = true;
      message = 'Restarted product-service — service came up briefly but crash-looped again. The fault is in the deployed code, not a transient process issue.';
      scoreChange = -75;
      // Minimal temporary improvement, then degrades
      newLogs.push(makeLog('warn', 'product-service', 'Service restarted. Monitoring for stability...', 'WARN_RESTART'));
      newLogs.push(makeLog('error', 'product-service', 'Crash loop continues after restart: v2.3.1 code fault detected', 'ERR_RESTART_NO_FIX'));
    }
  } else if (action === 'increase-capacity') {
    if (eng.capacityIncreased) {
      message = 'Capacity already increased. Spinning up more failing pods does not fix a code bug.';
      scoreChange = -30;
    } else {
      eng.capacityIncreased = true;
      message = 'Scaled product-service to 6 replicas. All new pods are crash-looping with the same error. Adding capacity cannot fix a code-level defect.';
      scoreChange = -50;
      newLogs.push(makeLog('warn', 'product-service', 'Scaled to 6 replicas — all pods entering crash-loop with NullReferenceException', 'WARN_SCALE_NO_FIX'));
      newLogs.push(makeLog('error', 'product-service', 'Auto-scaler is thrashing — 6 pods failing simultaneously', 'ERR_SCALE_THRASH'));
    }
  } else if (action === 'restore-db-connections') {
    message = 'Database connection pool is healthy (connections: 45/100, idle: 28). This action has no effect on the current incident.';
    scoreChange = -40;
    newLogs.push(makeLog('info', 'database', 'Connection pool status: 45/100 active, all healthy. No remediation needed.', 'INFO_DB_OK'));
  } else if (action === 'disable-dependency') {
    message = 'No faulty upstream dependency to disable. The product-service itself is the source of failure due to its own bad deployment.';
    scoreChange = -40;
    newLogs.push(makeLog('warn', 'api-gateway', 'Dependency graph analysis: product-service v2.3.1 is origin of failure.', 'WARN_DEP_ANALYSIS'));
  } else {
    message = `Unknown action: ${action}`;
    scoreChange = -25;
  }

  return {
    success: true,
    effective,
    message,
    scoreChange,
    resolved,
    updates: {
      serviceStates,
      logs: [...currentRun.logs, ...newLogs],
      engineState: eng,
    },
  };
}

function isResolved(engineState) {
  return engineState.phase === 'resolved';
}

function generateReport(run) {
  const effectiveActions = run.actionHistory.filter(a => a.effective).map(a => a.action);
  const ineffectiveActions = run.actionHistory.filter(a => !a.effective).map(a => a.action);
  const elapsed = run.elapsedSeconds || Math.floor((Date.now() - new Date(run.startedAt).getTime()) / 1000);

  return {
    incidentTitle: 'Bad Deployment — Product Service v2.3.1',
    rootCause: 'A NullReferenceException bug introduced in product-service v2.3.1 caused crash-looping pods and a cascading degradation of the API Gateway and Inventory Service.',
    summary: `The on-call engineer detected a sudden spike in error rates on the Product Service shortly after deployment v2.3.1 went live. The service entered a crash loop, causing the API Gateway circuit breaker to open and inventory sync to stall.`,
    resolutionExplanation: 'Rolling back to v2.3.0 restored the stable codebase, ended the crash loop, and allowed all downstream services to recover. Code-level bugs cannot be fixed by restarting processes, scaling replicas, or adjusting capacity.',
    lessonsLearned: [
      'Monitor error rates immediately after deployments; automated rollback thresholds should be set.',
      'Canary releases or blue/green deployments would have limited blast radius.',
      'Crash-looping pods are almost always a code or configuration problem — not a resource problem.',
      'Circuit breakers provide valuable cascading-failure protection but do not fix root causes.',
    ],
    effectiveActions,
    ineffectiveActions,
    finalScore: run.score,
    timeTaken: elapsed,
    generatedAt: new Date(),
  };
}

module.exports = { getInitialState, getValidActions, applyAction, isResolved, generateReport };
