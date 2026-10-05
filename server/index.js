require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

const { initFirebase } = require('./config/firebase');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const participantRoutes = require('./routes/participantRoutes');
const leaderboardRoutes = require('./routes/leaderboardRoutes');
const { apiLimiter } = require('./middleware/rateLimiter');
const seed = require('./seed/seed'); // Auto-seed configuration

const app = express();

// Trust reverse proxy headers (Vercel, Render, Nginx)
app.set('trust proxy', 1);

// ─── Security & Logging ──────────────────────────────────────────────────────
app.use(helmet());
app.use(morgan('dev'));

// ─── CORS ────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:5173',
  'http://localhost:5000',
  'http://localhost:3000',
  'https://aidex-code-breaker.vercel.app',
  'https://aidex-code-breakers.vercel.app',
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin) || /\.vercel\.app$/.test(origin)) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// ─── Body Parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── General Rate Limit ──────────────────────────────────────────────────────
app.use('/api', apiLimiter);

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/rounds', participantRoutes);
app.use('/api/leaderboard', leaderboardRoutes);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString(), database: 'firebase' }));
app.get('/api/health', (req, res) => res.json({ status: 'OK', timestamp: new Date().toISOString(), database: 'firebase' }));

// 404 fallback
app.use((req, res) => res.status(404).json({ message: `Route ${req.method} ${req.path} not found` }));

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Internal server error' });
});

// ─── Database & Server ───────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  // Initialize Firebase Firestore
  initFirebase();

  // Auto-seed initial data if not present
  try {
    await seed();
  } catch (seedErr) {
    console.error('  Auto-seed error:', seedErr.message);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 Code Breakers Backend Server running on port ${PORT} (Firebase Firestore Database)`);
    console.log(`🔑 Default Admin: username=admin / password=CodeBreaker123\n`);
  });
};

if (require.main === module) {
  startServer();
}

module.exports = app;
