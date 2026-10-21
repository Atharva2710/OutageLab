const express = require('express');
const router = express.Router();
const Scenario = require('../models/Scenario');

// GET /api/scenarios
router.get('/', async (req, res) => {
  try {
    const scenarios = await Scenario.find({ active: true }).select('-definition');
    res.json({ success: true, data: scenarios });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/scenarios/:id
router.get('/:id', async (req, res) => {
  try {
    const scenario = await Scenario.findOne({ scenarioId: req.params.id, active: true }).select('-definition');
    if (!scenario) return res.status(404).json({ success: false, message: 'Scenario not found' });
    res.json({ success: true, data: scenario });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
