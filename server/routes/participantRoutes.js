const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getRoundStatus,
  getFinalResult,
  getRound1Questions,
  submitRound1,
  getRound2Questions,
  submitRound2,
  getRound3Questions,
  runRound3Code,
  submitRound3,
} = require('../controllers/participantController');

// All participant routes require auth
router.use(protect);

// Round status overview & final overall score
router.get('/status', getRoundStatus);
router.get('/final-result', getFinalResult);

// Round 1
router.get('/round1/questions', getRound1Questions);
router.post('/round1/submit', submitRound1);

// Round 2
router.get('/round2/questions', getRound2Questions);
router.post('/round2/submit', submitRound2);

// Round 3
router.get('/round3/questions', getRound3Questions);
router.post('/round3/run', runRound3Code);
router.post('/round3/submit', submitRound3);

module.exports = router;
