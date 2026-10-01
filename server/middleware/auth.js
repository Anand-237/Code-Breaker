const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Verifies the JWT from the Authorization header.
 * Attaches req.user if valid.
 */
const protect = async (req, res, next) => {
  try {
    let token;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ message: 'Not authorized — no token provided' });
    }

    const secret = process.env.JWT_SECRET || 'codebreakers_secret_key_2026';
    const decoded = jwt.verify(token, secret);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({ message: 'Not authorized — user no longer exists' });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: 'Account deactivated. Contact admin.' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired — please log in again' });
    }
    return res.status(401).json({ message: 'Not authorized — invalid token' });
  }
};

/**
 * Restricts access to admin role only.
 * Must be used AFTER protect middleware.
 */
const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({ message: 'Forbidden — admin access required' });
};

/**
 * Restricts access to participants only.
 * Must be used AFTER protect middleware.
 */
const requireParticipant = (req, res, next) => {
  if (req.user && req.user.role === 'participant') {
    return next();
  }
  return res.status(403).json({ message: 'Forbidden — participant access required' });
};

module.exports = { protect, requireAdmin, requireParticipant };
