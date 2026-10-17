const mongoose = require('mongoose');

const serviceStateSchema = new mongoose.Schema({
  serviceId: { type: String, required: true },
  name: { type: String, required: true },
  status: { type: String, enum: ['healthy', 'degraded', 'failing', 'offline'], default: 'healthy' },
  errorRate: { type: Number, default: 0 },
  latency: { type: Number, default: 0 },
  requestsPerMin: { type: Number, default: 0 },
  uptime: { type: Number, default: 100 },
}, { _id: false });

const logEntrySchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  level: { type: String, enum: ['info', 'warn', 'error', 'critical'], default: 'info' },
  service: { type: String, required: true },
  message: { type: String, required: true },
  code: { type: String },
}, { _id: false });

const actionEntrySchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  action: { type: String, required: true },
  targetService: { type: String },
  effective: { type: Boolean, default: false },
  message: { type: String },
  scoreChange: { type: Number, default: 0 },
}, { _id: false });

const incidentRunSchema = new mongoose.Schema({
  scenarioId: { type: String, required: true },
  scenarioName: { type: String, required: true },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
  severity: { type: String, enum: ['SEV-1', 'SEV-2', 'SEV-3'], default: 'SEV-2' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  status: { type: String, enum: ['active', 'resolved', 'failed', 'abandoned'], default: 'active' },

  // Simulation state
  serviceStates: [serviceStateSchema],
  logs: [logEntrySchema],
  actionHistory: [actionEntrySchema],

  // Scoring
  score: { type: Number, default: 1000 },
  timeBonus: { type: Number, default: 0 },
  penaltyTotal: { type: Number, default: 0 },

  // Timing
  startedAt: { type: Date, default: Date.now },
  resolvedAt: { type: Date },
  elapsedSeconds: { type: Number },

  // Postmortem
  report: {
    rootCause: String,
    incidentTitle: String,
    summary: String,
    lessonsLearned: [String],
    resolutionExplanation: String,
    effectiveActions: [String],
    ineffectiveActions: [String],
    finalScore: Number,
    timeTaken: Number,
    generatedAt: Date,
  },

  // Internal engine state
  engineState: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

module.exports = mongoose.model('IncidentRun', incidentRunSchema);
