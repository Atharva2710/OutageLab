/**
 * Scenario: Traffic Surge
 * 
 * A flash sale campaign just went live and traffic is 8x normal levels.
 * Services are overloaded; some are throttling or crashing under load.
 * Root cause: insufficient capacity for sudden traffic spike
 * Resolution: Increase service capacity (scale out)
 */

const { makeLog } = require('../helpers');

function getInitialState() {
  return {
    serviceStates: [
      { serviceId: 'api-gateway', name: 'API Gateway', status: 'failing', errorRate: 45, latency: 12000, requestsPerMin: 19200, uptime: 72.1 },
      { serviceId: 'auth-service', name: 'Authentication Service', status: 'degraded', errorRate: 22, latency: 3400, requestsPerMin: 6400, uptime: 84.3 },
      { serviceId: 'product-service', name: 'Product Service', status: 'failing', errorRate: 62, latency: 15000, requestsPerMin: 14000, uptime: 58.9 },
      { serviceId: 'inventory-service', name: 'Inventory Service', status: 'failing', errorRate: 58, latency: 14500, requestsPerMin: 13800, uptime: 61.2 },
      { serviceId: 'payment-service', name: 'Payment Service', status: 'degraded', errorRate: 18, latency: 2800, requestsPerMin: 3200, uptime: 88.4 },
      { serviceId: 'database', name: 'Database', status: 'degraded', errorRate: 15, latency: 280, requestsPerMin: 48000, uptime: 91.7 },
    ],
    logs: [
      makeLog('critical', 'api-gateway', 'Request queue depth at 45,000 — 29% of requests being dropped', 'ERR_QUEUE_FULL'),
      makeLog('error', 'product-service', 'CPU at 97%, memory at 92% — all 3 pods at capacity', 'ERR_RESOURCE_EXHAUSTED'),
      makeLog('warn', 'api-gateway', 'Traffic spike: 19,200 req/min (baseline: 2,400 req/min) — 8x normal load', 'WARN_TRAFFIC_SPIKE'),
      makeLog('error', 'inventory-service', 'Too many concurrent stock-check requests — thread pool exhausted', 'ERR_THREAD_POOL'),
      makeLog('info', 'api-gateway', 'Flash sale campaign "MegaSale2025" went live 8 minutes ago on marketing site', 'INFO_CAMPAIGN_START'),
      makeLog('warn', 'auth-service', 'Token issuance rate: 6,400/min vs capacity of 4,000/min', 'WARN_AUTH_OVER'),
      makeLog('error', 'product-service', 'Rate limiter rejecting 38% of requests with HTTP 429', 'ERR_RATE_LIMIT'),
      makeLog('warn', 'database', 'Query queue growing: 1,240 queries waiting. DB server not at capacity.', 'WARN_DB_QUEUE'),
      makeLog('info', 'payment-service', 'Payment success rate dropped to 82% — latency causing timeouts', 'WARN_PAYMENT_LATENCY'),
      makeLog('critical', 'inventory-service', 'Stock reservation failures causing oversell risk for popular items', 'ERR_OVERSELL_RISK'),
    ],
    engineState: {
      scenario: 'traffic-surge',
      capacityIncreased: false,
      dbScaled: false,
      rolledBack: false,
      phase: 'incident',
    },
  };
}

function getValidActions(engineState) {
  if (engineState.phase === 'resolved') return [];
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

  if (action === 'increase-capacity') {
    if (eng.capacityIncreased) {
      message = 'Capacity was already increased. System is now stable.';
      scoreChange = -25;
    } else {
      eng.capacityIncreased = true;
      eng.phase = 'resolved';
      effective = true;
      resolved = true;
      scoreChange = 150;
      message = 'Scaled all services to 12 replicas. Traffic is being absorbed. Error rates dropping rapidly.';

      serviceStates = [
        { serviceId: 'api-gateway', name: 'API Gateway', status: 'healthy', errorRate: 1.2, latency: 145, requestsPerMin: 19200, uptime: 99.1 },
        { serviceId: 'auth-service', name: 'Authentication Service', status: 'healthy', errorRate: 0.8, latency: 68, requestsPerMin: 6400, uptime: 99.4 },
        { serviceId: 'product-service', name: 'Product Service', status: 'healthy', errorRate: 1.5, latency: 180, requestsPerMin: 14000, uptime: 99.0 },
        { serviceId: 'inventory-service', name: 'Inventory Service', status: 'healthy', errorRate: 1.1, latency: 92, requestsPerMin: 13800, uptime: 99.2 },
        { serviceId: 'payment-service', name: 'Payment Service', status: 'healthy', errorRate: 0.9, latency: 135, requestsPerMin: 3200, uptime: 99.6 },
        { serviceId: 'database', name: 'Database', status: 'healthy', errorRate: 0.5, latency: 18, requestsPerMin: 48000, uptime: 99.8 },
      ];

      newLogs.push(makeLog('info', 'api-gateway', 'Auto-scaler triggered: scaling from 3 to 12 replicas across all services', 'INFO_SCALE_UP'));
      newLogs.push(makeLog('info', 'product-service', 'New pods healthy. CPU now at 42% across 12 replicas.', 'INFO_SCALE_OK'));
      newLogs.push(makeLog('info', 'inventory-service', 'Stock reservation queue clearing. Oversell risk eliminated.', 'INFO_STOCK_OK'));
      newLogs.push(makeLog('info', 'api-gateway', 'Drop rate: 29% → 0.3%. Queue depth normalizing.', 'INFO_QUEUE_CLEAR'));
    }
  } else if (action === 'restart-service') {
    message = 'Restarting services during a traffic surge causes momentary downtime without solving capacity constraints. Traffic is the problem, not a bug.';
    scoreChange = -70;
    newLogs.push(makeLog('error', 'product-service', 'Service restart during surge caused 45s full outage window — error rate spiked to 100%.', 'ERR_RESTART_SURGE'));
  } else if (action === 'rollback-deployment') {
    if (eng.rolledBack) {
      message = 'No previous rollback action to retry.';
      scoreChange = -25;
    } else {
      eng.rolledBack = true;
      message = 'No deployment was made today. Deployment history shows no changes in the past 3 days. This incident is caused by an unexpected traffic surge, not a faulty deployment.';
      scoreChange = -50;
      newLogs.push(makeLog('warn', 'api-gateway', 'Deployment check: last deploy 3 days ago — traffic surge predates any recent change.', 'WARN_NO_RECENT_DEPLOY'));
    }
  } else if (action === 'restore-db-connections') {
    message = 'Database connection pool is healthy (connections: 180/300, latency normal). The database is queuing requests due to application-layer traffic overload, not a connection pool issue.';
    scoreChange = -40;
    newLogs.push(makeLog('info', 'database', 'Connection pool: 180/300 — healthy. DB server CPU 34%. Issue is application-layer capacity.', 'INFO_DB_FINE'));
  } else if (action === 'disable-dependency') {
    message = 'Disabling a dependency during a traffic surge would reduce functionality for legitimate users. No faulty dependency is identified — all services are failing due to capacity constraints.';
    scoreChange = -50;
    newLogs.push(makeLog('warn', 'api-gateway', 'Dependency disable attempted but no single faulty dependency identified. Surge affects all services uniformly.', 'WARN_DISABLE_SURGE'));
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
    incidentTitle: 'Flash Sale Traffic Surge — MegaSale2025',
    rootCause: 'An unplanned 8x traffic spike from a flash sale campaign overwhelmed services operating at 3-replica capacity. Resource exhaustion caused request drops, timeouts, and oversell risk.',
    summary: 'The MegaSale2025 campaign launched without capacity pre-scaling. Services were immediately overwhelmed, causing widespread 429 errors, queue buildup, and partial database congestion.',
    resolutionExplanation: 'Increasing service capacity (horizontal scaling) distributed the load across 12 replicas, absorbing the traffic surge without any code changes. Restarting or rolling back services would have been counterproductive.',
    lessonsLearned: [
      'Coordinate marketing campaigns with engineering — capacity must be pre-scaled before launches.',
      'Auto-scaling policies should trigger at lower thresholds with proactive capacity buffers.',
      'Load testing with realistic spike profiles should be part of release readiness.',
      'Rate limiting and graceful degradation at the API Gateway protect downstream services.',
    ],
    effectiveActions,
    ineffectiveActions,
    finalScore: run.score,
    timeTaken: elapsed,
    generatedAt: new Date(),
  };
}

module.exports = { getInitialState, getValidActions, applyAction, isResolved, generateReport };
