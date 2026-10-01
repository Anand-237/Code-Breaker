const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect, requireAdmin } = require('../middleware/auth');
const { createUser, bulkCreateUsers, getUsers, updateUser, deleteUser } = require('../controllers/adminUserController');
const {
  getQuestions,
  getStats,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  reseedQuestions,
  round1Controller,
  round2Controller,
  round3Controller,
} = require('../controllers/adminQuestionController');
const { getRoundControl, updateRoundControl } = require('../controllers/roundControlController');
const { getResults, getUserAnswerSheet, reviewRound3 } = require('../controllers/adminResultsController');
const { exportRound, exportOverall } = require('../controllers/exportController');

// All admin routes require auth + admin role
router.use(protect, requireAdmin);

// ─── Multer (in-memory storage for CSV uploads) ───────────────────────────────
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// ─── Users ────────────────────────────────────────────────────────────────────
router.get('/users', getUsers);
router.post('/users', createUser);
router.post('/users/bulk', upload.single('file'), bulkCreateUsers);
router.patch('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

// ─── Unified Questions API ───────────────────────────────────────────────────
router.get('/question-stats', getStats);
router.get('/questions/stats', getStats);
router.get('/questions', getQuestions);
router.post('/questions', createQuestion);
router.post('/questions/reseed', reseedQuestions);
router.patch('/questions/:id', updateQuestion);
router.delete('/questions/:id', deleteQuestion);

// ─── Legacy Round Questions (backward compatibility) ──────────────────────────
router.get('/round1-questions', round1Controller.getAll);
router.post('/round1-questions', round1Controller.create);
router.patch('/round1-questions/reorder', round1Controller.reorder);
router.patch('/round1-questions/:id', round1Controller.update);
router.delete('/round1-questions/:id', round1Controller.hardDelete);

router.get('/round2-questions', round2Controller.getAll);
router.post('/round2-questions', round2Controller.create);
router.patch('/round2-questions/reorder', round2Controller.reorder);
router.patch('/round2-questions/:id', round2Controller.update);
router.delete('/round2-questions/:id', round2Controller.hardDelete);

router.get('/round3-questions', round3Controller.getAll);
router.post('/round3-questions', round3Controller.create);
router.patch('/round3-questions/reorder', round3Controller.reorder);
router.patch('/round3-questions/:id', round3Controller.update);
router.delete('/round3-questions/:id', round3Controller.hardDelete);

// ─── Round Control ────────────────────────────────────────────────────────────
router.get('/round-control', getRoundControl);
router.patch('/round-control/:round', updateRoundControl);

// ─── Results & Review ─────────────────────────────────────────────────────────
router.get('/results/user/:userId', getUserAnswerSheet);
router.get('/results', getResults);
router.patch('/results/review/:submissionId', reviewRound3);

// ─── Exports ─────────────────────────────────────────────────────────────────
router.get('/export/overall', exportOverall);
router.get('/export/:round', exportRound);

module.exports = router;
