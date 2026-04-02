const express = require('express');
const router = express.Router();

const { success } = require('../utils/response');

// ── Health check ──────────────────────────────────────────────────────────────
router.get('/health', (req, res) => {
  success(res, {
    status: 'ok',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ── Feature routes ────────────────────────────────────────────────────────────
router.use('/majors',            require('./majors'));
router.use('/curriculum',        require('./curriculum'));
router.use('/courses',           require('./courses'));
router.use('/teaching',          require('./teaching'));
router.use('/analysis',          require('./analysis'));
router.use('/improvement',       require('./improvement'));
router.use('/data-integration',  require('./data-integration'));

module.exports = router;
