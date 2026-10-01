const express = require('express');
const router = express.Router();
const { login, logout, getMe, adminSetup } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { loginLimiter } = require('../middleware/rateLimiter');

router.post('/login', loginLimiter, login);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);

// One-time admin creation route — protected by ADMIN_SETUP_SECRET
router.post('/admin/setup', adminSetup);

module.exports = router;
