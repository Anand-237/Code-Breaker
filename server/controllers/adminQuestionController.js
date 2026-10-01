const Question = require('../models/Question');
const { ROUND_CONFIG, getRoundMarks, getMaxQuestions, getMaxMarks } = require('../utils/roundConfig');

/** Get questions for a specific round or all rounds */
const getQuestions = async (req, res) => {
  try {
    const { round, search } = req.query;
    const query = {};

    if (round) {
      const rNum = parseInt(round, 10);
      if ([1, 2, 3].includes(rNum)) {
        query.round = rNum;
      }
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [{ questionText: regex }, { title: regex }, { explanation: regex }];
    }

    const questions = await Question.find(query).sort({ round: 1, order: 1, createdAt: 1 });
    res.json({ questions });
  } catch (err) {
    console.error('getQuestions error:', err);
    res.status(500).json({ message: 'Server error loading questions' });
  }
};

/** Get per-round stats and pre-start competition validation */
const getStats = async (req, res) => {
  try {
    const stats = {};
    let allReady = true;
    const missingDetails = [];

    for (const rNum of [1, 2, 3]) {
      const cfg = ROUND_CONFIG[rNum];
      const count = await Question.countDocuments({ round: rNum, isActive: true });
      const currentMarks = count * cfg.marksPerQuestion;
      const isFull = count === cfg.maxQuestions;
      const missing = cfg.maxQuestions - count;

      if (missing > 0) {
        allReady = false;
        missingDetails.push(`Round ${rNum}: ${count} / ${cfg.maxQuestions} (${missing} question${missing > 1 ? 's' : ''} missing)`);
      } else {
        missingDetails.push(`Round ${rNum}: ${count} / ${cfg.maxQuestions} ✓`);
      }

      stats[rNum] = {
        round: rNum,
        name: cfg.name,
        count,
        maxQuestions: cfg.maxQuestions,
        currentMarks,
        maxMarks: cfg.maxMarks,
        marksPerQuestion: cfg.marksPerQuestion,
        isFull,
        missing,
      };
    }

    res.json({
      stats,
      isReady: allReady,
      validationMessage: allReady
        ? 'All rounds ready for competition!'
        : `Competition cannot start.\n${missingDetails.join('\n')}`,
      missingDetails,
    });
  } catch (err) {
    console.error('getStats error:', err);
    res.status(500).json({ message: 'Server error calculating stats' });
  }
};

/** Create question with round limit enforcement and automatic marks */
const createQuestion = async (req, res) => {
  try {
    const { round } = req.body;
    const rNum = parseInt(round, 10);

    if (![1, 2, 3].includes(rNum)) {
      return res.status(400).json({ message: 'Select a valid round (Round 1, Round 2, or Round 3)' });
    }

    const cfg = ROUND_CONFIG[rNum];
    const currentCount = await Question.countDocuments({ round: rNum, isActive: true });

    if (currentCount >= cfg.maxQuestions) {
      return res.status(400).json({
        message: `Round ${rNum} already contains ${currentCount} questions. Maximum limit reached.`,
      });
    }

    // Force automatic marks allocation based on round
    const payload = {
      ...req.body,
      round: rNum,
      marks: cfg.marksPerQuestion,
      points: cfg.marksPerQuestion,
    };

    // If options passed, format options array
    if (payload.options && Array.isArray(payload.options)) {
      payload.options = payload.options.map((opt) => String(opt || '').trim());
    }

    const question = await Question.create(payload);
    res.status(201).json({ message: 'Question added successfully', question });
  } catch (err) {
    console.error('createQuestion error:', err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: 'Server error creating question' });
  }
};

/** Update existing question */
const updateQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const question = await Question.findById(id);
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    const rNum = parseInt(req.body.round || question.round, 10);
    const cfg = ROUND_CONFIG[rNum];

    // Force automatic marks assignment based on round
    const payload = {
      ...req.body,
      round: rNum,
      marks: cfg.marksPerQuestion,
      points: cfg.marksPerQuestion,
    };

    if (payload.options && Array.isArray(payload.options)) {
      payload.options = payload.options.map((opt) => String(opt || '').trim());
    }

    const updated = await Question.findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true,
    });

    res.json({ message: 'Question updated successfully', question: updated });
  } catch (err) {
    console.error('updateQuestion error:', err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: 'Server error updating question' });
  }
};

/** Delete question */
const deleteQuestion = async (req, res) => {
  try {
    const question = await Question.findByIdAndDelete(req.params.id);
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }
    res.json({ message: 'Question deleted successfully' });
  } catch (err) {
    console.error('deleteQuestion error:', err);
    res.status(500).json({ message: 'Server error deleting question' });
  }
};

// Legacy controllers factory for backward compatibility
const makeQuestionController = (roundNum) => ({
  getAll: async (req, res) => {
    req.query.round = roundNum;
    return getQuestions(req, res);
  },
  create: async (req, res) => {
    req.body.round = roundNum;
    return createQuestion(req, res);
  },
  update: updateQuestion,
  hardDelete: deleteQuestion,
  softDelete: deleteQuestion,
  reorder: async (req, res) => {
    res.json({ message: 'Questions reordered' });
  },
});

const round1Controller = makeQuestionController(1);
const round2Controller = makeQuestionController(2);
const round3Controller = makeQuestionController(3);

/** Reseed questions across rounds */
const reseedQuestions = async (req, res) => {
  try {
    const seed = require('../seed/seed');
    await seed();
    res.json({ message: 'Questions reseeded successfully!' });
  } catch (err) {
    console.error('reseedQuestions error:', err);
    res.status(500).json({ message: 'Error reseeding questions' });
  }
};

module.exports = {
  getQuestions,
  getStats,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  reseedQuestions,
  round1Controller,
  round2Controller,
  round3Controller,
};
