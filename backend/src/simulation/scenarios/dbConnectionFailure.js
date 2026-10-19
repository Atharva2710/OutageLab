/**
 * Scenario: Database Connection Failure
 * 
 * The database connection pool is exhausted due to a connection leak
 * introduced in a recent config change. Services are unable to acquire
 * connections and are timing out.
 * Root cause: connection pool exhaustion / connection leak
 * Resolution: Restore database connections (reset pool + fix leak)
 */

const { makeLog } = require('../helpers');

function getInitialState() {
  return {
    serviceStates: [
      { serviceId: 'api-gateway', name: 'API Gateway', status: 'degraded', errorRate: 28, latency: 6500, requestsPerMin: 1200, uptime: 91.2 },
      { serviceId: 'auth-service', name: 'Authentication Service', status: 'failing', errorRate: 65, latency: 8900, requestsPerMin: 120, uptime: 55.3 },
      { serviceId: 'product-service', name: 'Product Service', status: 'degraded', errorRate: 42, latency: 7200, requestsPerMin: 280, uptime: 68.7 },
      { serviceId: 'inventory-service', name: 'Inventory Service', status: 'failing', errorRate: 71, latency: 9100, requestsPerMin: 90, uptime: 48.2 },
      { serviceId: 'payment-service', name: 'Payment Service', status: 'degraded', errorRate: 38, latency: 6800, requestsPerMin: 75, uptime: 72.1 },
      { serviceId: 'database', name: 'Database', status: 'failing', errorRate: 85, latency: 320, requestsPerMin: 4800, uptime: 35.6 },
    ],
    logs: [
      makeLog('critical', 'database', 'Connection pool exhausted: 500/500 connections active, 847 requests queued', 'ERR_POOL_EXHAUSTED'),
      makeLog('error', 'auth-service', 'db.connect() timeout after 9000ms — cannot authenticate users', 'ERR_DB_TIMEOUT'),
      makeLog('error', 'inventory-service', 'Failed to acquire DB connection after 3 retries — stock checks failing', 'ERR_NO_CONN'),
      makeLog('critical', 'database', 'Connection leak detected: connections opened at 15x normal rate since config change', 'ERR_CONN_LEAK'),
      makeLog('warn', 'api-gateway', 'Multiple upstreams returning 503 — database appears to be the common dependency', 'WARN_MULTI_503'),
      makeLog('error', 'payment-service', 'Transaction write failed: connection pool timeout', 'ERR_PAYMENT_FAIL'),
      makeLog('info', 'database', 'DB server itself is healthy — CPU 12%, memory 34%, disk I/O normal', 'INFO_DB_SERVER_OK'),
      makeLog('warn', 'database', 'Config change 23 minutes ago modified connection_pool_max from 100 to 500 but disabled connection_timeout', 'WARN_CONFIG_CHANGE'),
      makeLog('error', 'product-service', 'Product listings unavailable: DB read timeout after 7200ms', 'ERR_DB_READ_FAIL'),
      makeLog('info', 'database', 'Stale connections not being released — application-layer connection leak', 'INFO_LEAK_DETAIL'),
    ],
    engineState: {
      scenario: 'db-connection-failure',
      poolRestored: false,
      serviceRestarted: false,
      rolledBack: false,
      capacityIncreased: false,
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

  if (action === 'restore-db-connections') {
    if (eng.poolRestored) {
      message = 'Connection pool has already been restored.';
      scoreChange = -25;
    } else {
      eng.poolRestored = true;
      eng.phase = 'resolved';
      effective = true;
      resolved = true;
      scoreChange = 150;
      message = 'Database connection pool reset. Leak patched by reverting connection_timeout config. All services recovering.';

      serviceStates = [
        { serviceId: 'api-gateway', name: 'API Gateway', status: 'healthy', errorRate: 0.8, latency: 110, requestsPerMin: 2200, uptime: 99.7 },
        { serviceId: 'auth-service', name: 'Authentication Service', status: 'healthy', errorRate: 0.4, latency: 48, requestsPerMin: 780, uptime: 99.8 },
        { serviceId: 'product-service', name: 'Product Service', status: 'healthy', errorRate: 0.6, latency: 95, requestsPerMin: 1500, uptime: 99.6 },
        { serviceId: 'inventory-service', name: 'Inventory Service', status: 'healthy', errorRate: 0.7, latency: 78, requestsPerMin: 920, uptime: 99.5 },
        { serviceId: 'payment-service', name: 'Payment Service', status: 'healthy', errorRate: 0.9, latency: 125, requestsPerMin: 155, uptime: 99.7 },
        { serviceId: 'database', name: 'Database', status: 'healthy', errorRate: 0.1, latency: 11, requestsPerMin: 4800, uptime: 99.9 },
      ];

      newLogs.push(makeLog('info', 'database', 'Connection pool reset: draining 500 stale connections', 'INFO_POOL_RESET'));
      newLogs.push(makeLog('info', 'database', 'connection_timeout re-enabled. Leak plugged. Pool: 0/100 connections.', 'INFO_CONFIG_FIX'));
      newLogs.push(makeLog('info', 'auth-service', 'DB connections restored — authentication back online', 'INFO_AUTH_OK'));
      newLogs.push(makeLog('info', 'inventory-service', 'Stock sync resumed. DB connections healthy.', 'INFO_INV_OK'));
    }
  } else if (action === 'restart-service') {
    message = 'Restarting individual services temporarily frees their connections, but new connections are immediately leaked again. The root cause — the connection leak — is in the database layer configuration.';
    scoreChange = -60;
    newLogs.push(makeLog('warn', 'product-service', 'Service restarted. Released 48 connections. New connections leaking again within 30s.', 'WARN_RESTART_PARTIAL'));
  } else if (action === 'rollback-deployment') {
    if (eng.rolledBack) {
      message = 'Already tried rollback — no deployment change correlates with this incident.';
      scoreChange = -25;
    } else {
      eng.rolledBack = true;
      message = 'No recent application deployments detected. The change that caused this incident was a configuration change to the database connection pool, not an application deployment.';
      scoreChange = -50;
      newLogs.push(makeLog('warn', 'api-gateway', 'Deployment history checked: last app deploy was 4 days ago. Current issue is a config change, not a deployment.', 'WARN_NO_DEPLOY'));
    }
  } else if (action === 'increase-capacity') {
    message = 'Adding more service replicas adds more connection demand to an already exhausted pool. Pool utilization worsens to 100%.';
    scoreChange = -60;
    newLogs.push(makeLog('error', 'database', 'Pool exhaustion worsening: new service replicas competing for connections. Now 1200 requests queued.', 'ERR_POOL_WORSE'));
  } else if (action === 'disable-dependency') {
    message = 'Disabling upstream dependencies does not release database connections. The leak is at the application-to-database layer.';
    scoreChange = -40;
    newLogs.push(makeLog('warn', 'api-gateway', 'Traffic rerouting attempted. DB pool still exhausted — not a traffic problem.', 'WARN_DISABLE_NO_FIX'));
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
    incidentTitle: 'Database Connection Pool Exhaustion',
    rootCause: 'A configuration change disabled connection_timeout, causing connections to leak and the pool to exhaust (500/500). All database-dependent services failed to acquire connections.',
    summary: 'A misconfiguration in the database connection pool settings caused a connection leak. All services that read from or write to the database began timing out, resulting in widespread degradation.',
    resolutionExplanation: 'Restoring database connections by resetting the pool and reverting the config change stopped the leak and allowed services to reconnect. Restarting services was ineffective because new connections leaked immediately.',
    lessonsLearned: [
      'Configuration changes to connection pools are high-risk — require peer review and staged rollout.',
      'Connection pool metrics should be monitored and alerted on.',
      'Service restarts as a first step rarely fix connection leaks at the infrastructure layer.',
      'Database health dashboards should include pool utilization, not just server CPU/RAM.',
    ],
    effectiveActions,
    ineffectiveActions,
    finalScore: run.score,
    timeTaken: elapsed,
    generatedAt: new Date(),
  };
}

module.exports = { getInitialState, getValidActions, applyAction, isResolved, generateReport };
