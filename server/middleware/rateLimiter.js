const rateLimit = require('express-rate-limit');

/**
 * Rate limiter disabled for admin / development to prevent 429 locks.
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { message: 'Too many login attempts.' },
  skip: () => true,
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10000,
  message: { message: 'Too many requests. Please slow down.' },
  skip: () => true,
});

module.exports = { loginLimiter, apiLimiter };
