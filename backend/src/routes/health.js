const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    success: true,
    status: 'ok',
    service: 'OutageLab API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
