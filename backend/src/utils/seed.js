/**
 * Seed script — populates the database with scenario definitions
 * Run: node src/utils/seed.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const Scenario = require('../models/Scenario');

const SCENARIOS = [
  {
    scenarioId: 'bad-deployment',
    name: 'Bad Deployment — Crash Looping Product Service',
    description: 'A faulty deployment of the Product Service (v2.3.1) introduced an unhandled NullReferenceException. The service is crash-looping under load, triggering circuit breakers on the API Gateway and stalling downstream inventory synchronization.',
    difficulty: 'easy',
    severity: 'SEV-3',
    estimatedMinutes: 8,
    tags: ['deployment', 'crash-loop', 'rollback', 'circuit-breaker', 'p0-incident'],
    symptoms: [
      'API Gateway throwing HTTP 503 Service Unavailable on catalog routes',
      'Product Service pods restarting continuously in CrashLoopBackOff',
      'Circuit breaker OPEN for product-service after 50 consecutive failures',
      'Inventory sync delayed by 47 minutes',
    ],
    affectedServices: ['product-service', 'api-gateway', 'inventory-service'],
    learningObjectives: [
      'Differentiate between code-level defects and infrastructure resource constraints',
      'Recognize why restarting or horizontally scaling crash-looping code fails',
      'Execute rapid version rollbacks to restore customer traffic flow',
    ],
    hints: [
      {
        level: 1,
        title: 'Correlate Deployment Timestamps',
        content: 'Check the incident logs for deployment events. Notice that Product Service v2.3.1 went live 12 minutes ago, exactly when error rates spiked.',
      },
      {
        level: 2,
        title: 'Inspect Crash Logs',
        content: 'Review product-service logs: an unhandled NullReferenceException in ProductController.getProducts() is crashing pods repeatedly.',
      },
      {
        level: 3,
        title: 'Remediation Triage',
        content: 'Restarting or scaling pods with broken code will not fix the crash. Roll back to the previous stable release v2.3.0.',
      },
    ],
    active: true,
    definition: { scenarioId: 'bad-deployment' },
  },
  {
    scenarioId: 'db-connection-failure',
    name: 'Database Connection Pool Exhaustion & Leak',
    description: 'A recent database configuration change disabled connection timeouts, causing an application-level connection leak. The connection pool is exhausted at 500/500 handles, causing all database-dependent services to time out.',
    difficulty: 'medium',
    severity: 'SEV-2',
    estimatedMinutes: 12,
    tags: ['database', 'connection-pool', 'leak', 'cascading-failure', 'config-drift'],
    symptoms: [
      'Connection pool saturated at 500/500 active connections with 840+ queued requests',
      'Auth, Product, and Inventory services timing out on db.connect() queries',
      'Database host CPU is normal (12%), indicating an application-layer connection leak',
      'Checkout transactions stalling on payment verification',
    ],
    affectedServices: ['database', 'auth-service', 'product-service', 'inventory-service'],
    learningObjectives: [
      'Diagnose connection pool exhaustion vs database CPU/memory bottlenecks',
      'Identify connection leaks resulting from disabled connection timeouts',
      'Safely flush connection pools and restore timeout guardrails',
    ],
    hints: [
      {
        level: 1,
        title: 'Identify Common Downstream Dependency',
        content: 'Multiple independent microservices (Auth, Inventory, Product) are failing simultaneously. What single shared dependency links them all?',
      },
      {
        level: 2,
        title: 'Inspect Database Metrics',
        content: 'Look at Database telemetry: server CPU is low (12%), but active connections are capped at 500/500 with hundreds of requests queued.',
      },
      {
        level: 3,
        title: 'Remediation Triage',
        content: 'Restarting individual services only provides temporary relief before leaking again. Reset the database connection pool and restore connection timeouts.',
      },
    ],
    active: true,
    definition: { scenarioId: 'db-connection-failure' },
  },
  {
    scenarioId: 'traffic-surge',
    name: 'Traffic Surge — Flash Sale Ingress Saturation',
    description: 'An unannounced marketing flash sale drove an 8x traffic spike (19,200 req/min) across all platform tiers. Request queues are overflowing, CPU capacity is saturated, and inventory reservation queues are risking over-sell.',
    difficulty: 'hard',
    severity: 'SEV-1',
    estimatedMinutes: 15,
    tags: ['scalability', 'traffic-surge', 'capacity', 'auto-scaling', 'queue-overflow'],
    symptoms: [
      'Ingress traffic spiked 8x to 19,200 req/min (baseline: 2,400 req/min)',
      'API Gateway dropping 29% of inbound requests due to full request queues',
      'Product and Inventory pods pinned at 97% CPU utilization',
      'Critical oversell risk as inventory stock reservation threads deplete',
    ],
    affectedServices: ['api-gateway', 'product-service', 'inventory-service', 'auth-service'],
    learningObjectives: [
      'Mitigate sudden traffic spikes before cascading queue overflows drop revenue',
      'Understand why service restarts during a load surge create complete service blackouts',
      'Perform coordinated horizontal replica scaling to absorb ingress volume',
    ],
    hints: [
      {
        level: 1,
        title: 'Check Request Throughput',
        content: 'Review the API Gateway throughput metrics: requests spiked from 2,400 to 19,200 req/min following an unannounced flash sale.',
      },
      {
        level: 2,
        title: 'Differentiate Bug vs Capacity',
        content: 'Errors are caused by HTTP 429 rate limits and dropped queue packets, not code-level exceptions. Services are starving for compute capacity.',
      },
      {
        level: 3,
        title: 'Remediation Triage',
        content: 'Do NOT restart services under load (this causes 100% outage). Scale out service capacity horizontally to 12 replicas.',
      },
    ],
    active: true,
    definition: { scenarioId: 'traffic-surge' },
  },
];

async function seed() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ Configuration error: MONGODB_URI environment variable is required.');
    process.exit(1);
  }
  await mongoose.connect(uri);
  const host = mongoose.connection.host || 'remote cluster';
  console.log(`✅ Connected to MongoDB Atlas [database: ${mongoose.connection.name}] at ${host}`);

  for (const s of SCENARIOS) {
    const existing = await Scenario.findOne({ scenarioId: s.scenarioId });
    if (existing) {
      await Scenario.updateOne({ scenarioId: s.scenarioId }, s);
      console.log(`✅ Updated scenario with rich metadata: ${s.scenarioId}`);
    } else {
      await Scenario.create(s);
      console.log(`✅ Created scenario: ${s.scenarioId}`);
    }
  }

  console.log('\n🌱 Seeding complete.');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
