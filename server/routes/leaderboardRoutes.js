const express = require('express');
const router = express.Router();
const { protect, requireAdmin } = require('../middleware/auth');
const { getTop3, getFullLeaderboard } = require('../controllers/leaderboardController');

// Top 3 — available to all authenticated users
router.get('/top3', protect, getTop3);

// Full leaderboard — admin only
router.get('/full', protect, requireAdmin, getFullLeaderboard);

module.exports = router;
