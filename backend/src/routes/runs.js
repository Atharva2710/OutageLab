const express = require('express');
const router = express.Router();
const IncidentRun = require('../models/IncidentRun');
const Scenario = require('../models/Scenario');
const engine = require('../simulation/engine');
const { optionalAuth } = require('../middleware/auth');

// GET /api/runs — list runs (most recent first)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const filter = {};
    if (req.user) filter.userId = req.user._id;
    const runs = await IncidentRun.find(filter)
      .sort({ createdAt: -1 })
      .limit(50)
      .select('scenarioId scenarioName difficulty severity status score startedAt resolvedAt elapsedSeconds');
    res.json({ success: true, data: runs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/runs — create new run
router.post('/', optionalAuth, async (req, res) => {
  try {
    const { scenarioId } = req.body;
    if (!scenarioId) return res.status(400).json({ success: false, message: 'scenarioId is required' });

    const scenario = await Scenario.findOne({ scenarioId, active: true });
    if (!scenario) return res.status(404).json({ success: false, message: 'Scenario not found' });

    const initialState = engine.initializeRun(scenario.definition);

    const severity = scenario.severity || (scenario.difficulty === 'hard' ? 'SEV-1' : scenario.difficulty === 'medium' ? 'SEV-2' : 'SEV-3');

    const run = await IncidentRun.create({
      scenarioId: scenario.scenarioId,
      scenarioName: scenario.name,
      difficulty: scenario.difficulty,
      severity,
      userId: req.user ? req.user._id : null,
      serviceStates: initialState.serviceStates,
      logs: initialState.logs,
      actionHistory: [],
      score: 1000,
      engineState: initialState.engineState,
    });

    res.status(201).json({ success: true, data: run });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/runs/:id — get single run
router.get('/:id', async (req, res) => {
  try {
    const run = await IncidentRun.findById(req.params.id);
    if (!run) return res.status(404).json({ success: false, message: 'Run not found' });
    res.json({ success: true, data: run });
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ success: false, message: 'Invalid run ID' });
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/runs/:id/actions — execute an action
router.post('/:id/actions', async (req, res) => {
  try {
    const { action, targetService } = req.body;
    if (!action) return res.status(400).json({ success: false, message: 'action is required' });

    const run = await IncidentRun.findById(req.params.id);
    if (!run) return res.status(404).json({ success: false, message: 'Run not found' });
    if (run.status !== 'active') {
      return res.status(400).json({ success: false, message: `Cannot execute action on a ${run.status} incident.` });
    }

    const result = engine.processAction(run.scenarioId, run.toObject(), action, targetService);

    const scoreChange = result.scoreChange || 0;
    const newScore = Math.max(0, (run.score || 1000) + scoreChange);

    const actionEntry = {
      timestamp: new Date(),
      action,
      targetService: targetService || null,
      effective: result.effective,
      message: result.message,
      scoreChange,
    };

    // Build update object
    const updateFields = {
      score: newScore,
      $push: { actionHistory: actionEntry },
    };

    if (result.updates.serviceStates) updateFields.serviceStates = result.updates.serviceStates;
    if (result.updates.logs) updateFields.logs = result.updates.logs;
    if (result.updates.engineState) updateFields.engineState = result.updates.engineState;

    // If resolved
    if (result.resolved) {
      const resolvedAt = new Date();
      const elapsedSeconds = Math.floor((resolvedAt - run.startedAt) / 1000);
      updateFields.status = 'resolved';
      updateFields.resolvedAt = resolvedAt;
      updateFields.elapsedSeconds = elapsedSeconds;
    }

    const updatedRun = await IncidentRun.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { new: true }
    );

    res.json({
      success: true,
      effective: result.effective,
      resolved: result.resolved || false,
      message: result.message,
      scoreChange,
      data: updatedRun,
    });
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ success: false, message: 'Invalid run ID' });
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/runs/:id/finish — finish an incident and generate report
router.post('/:id/finish', async (req, res) => {
  try {
    const run = await IncidentRun.findById(req.params.id);
    if (!run) return res.status(404).json({ success: false, message: 'Run not found' });

    if (run.status === 'active' && !engine.checkResolution(run.scenarioId, run.engineState)) {
      return res.status(400).json({ success: false, message: 'Incident is not yet resolved. Execute the correct recovery action first.' });
    }

    const reportData = engine.generateReport(run.scenarioId, run.toObject());

    // Calculate final score with time bonus
    const elapsed = run.elapsedSeconds || Math.floor((Date.now() - run.startedAt) / 1000);
    const timeBonus = Math.max(0, 300 - Math.floor(elapsed / 10)); // Decreases as time passes
    const ineffectiveCount = run.actionHistory.filter(a => !a.effective).length;
    const penalty = ineffectiveCount * 30;
    const finalScore = Math.max(0, (run.score || 0) + timeBonus - penalty);

    reportData.finalScore = finalScore;

    const updatedRun = await IncidentRun.findByIdAndUpdate(
      req.params.id,
      {
        status: 'resolved',
        report: reportData,
        score: finalScore,
        timeBonus,
        penaltyTotal: penalty,
        resolvedAt: run.resolvedAt || new Date(),
        elapsedSeconds: elapsed,
      },
      { new: true }
    );

    res.json({ success: true, data: updatedRun });
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ success: false, message: 'Invalid run ID' });
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/runs/:id/report
router.get('/:id/report', async (req, res) => {
  try {
    const run = await IncidentRun.findById(req.params.id);
    if (!run) return res.status(404).json({ success: false, message: 'Run not found' });
    if (!run.report || !run.report.generatedAt) {
      return res.status(400).json({ success: false, message: 'Report not yet generated. Call POST /finish first.' });
    }
    res.json({ success: true, data: { run, report: run.report } });
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ success: false, message: 'Invalid run ID' });
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
