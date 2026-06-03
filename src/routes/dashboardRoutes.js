// dashboardRoutes.js
const express = require('express');
const router = express.Router();
const { getSummary } = require('../controllers/dashboardController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// Admin-only dashboard summary route
router.get('/summary', protect, adminOnly, getSummary);

module.exports = router;
