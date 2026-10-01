const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const { normalizeUsername } = require('../utils/normalize');

/** Generate JWT token */
const generateToken = (id) => {
  const secret = process.env.JWT_SECRET || 'codebreakers_secret_key_2026';
  return jwt.sign({ id }, secret, { expiresIn: '8h' });
};

/**
 * POST /api/auth/login
 * Login with team name / username + password
 */
const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (mongoose.connection.readyState === 0) {
      console.error('[AUTH] Database disconnected!');
      return res.status(500).json({ message: 'Database connection failed. Please configure MONGODB_URI in Vercel Environment Variables.' });
    }

    // Validate input
    const normalizedUsername = normalizeUsername(username);
    if (!normalizedUsername || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    console.log(`[AUTH] Login attempt for: "${normalizedUsername}"`);

    // Search by normalized username OR by teamName (case-insensitive, exact match)
    // This allows participants to type their team name in any case.
    // Both fields are checked because the admin UI displays "Team Name" but
    // the stored username is the lowercased version.
    const user = await User.findOne({
      $or: [
        { username: normalizedUsername },
        { teamName: { $regex: `^${normalizedUsername.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } },
      ],
    });

    console.log(`[AUTH] User found: ${!!user}`);

    if (!user) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    // Separate response for deactivated accounts so admin can debug easily
    if (!user.isActive) {
      console.log(`[AUTH] Account deactivated: ${user.username}`);
      return res.status(403).json({ message: 'Account deactivated. Contact admin.' });
    }

    console.log(`[AUTH] User active: true`);

    const isMatch = await user.comparePassword(password);
    console.log(`[AUTH] Password matched: ${isMatch}`);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const token = generateToken(user._id);
    console.log(`[AUTH] Login successful: ${user._id}`);

    res.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        username: user.username,
        role: user.role,
        teamName: user.teamName,
      },
    });
  } catch (err) {
    console.error('[AUTH] Login error:', err);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
};

/**
 * POST /api/auth/logout
 * Stateless JWT — client drops token; server just confirms
 */
const logout = (req, res) => {
  res.json({ message: 'Logged out successfully' });
};

/**
 * GET /api/auth/me
 * Returns current user data from JWT
 */
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * POST /api/admin/setup
 * One-time route to create the first admin account.
 * Protected by ADMIN_SETUP_SECRET from environment variables.
 */
const adminSetup = async (req, res) => {
  try {
    const { setupSecret, name, username, password } = req.body;

    if (setupSecret !== process.env.ADMIN_SETUP_SECRET) {
      return res.status(403).json({ message: 'Invalid setup secret' });
    }

    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      return res.status(409).json({ message: 'Admin account already exists' });
    }

    const admin = await User.create({
      name,
      username: normalizeUsername(username),
      password,
      role: 'admin',
    });

    const token = generateToken(admin._id);
    res.status(201).json({ message: 'Admin account created', token, user: admin });
  } catch (err) {
    console.error('Admin setup error:', err);
    res.status(500).json({ message: 'Server error during admin setup' });
  }
};

module.exports = { login, logout, getMe, adminSetup };
