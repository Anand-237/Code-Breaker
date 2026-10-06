const User = require('../models/User');
const RoundControl = require('../models/RoundControl');
const Question = require('../models/Question');
const Submission = require('../models/Submission');
const { executeCode, isOutputMatch } = require('../utils/codeExecutor');
const { ROUND_CONFIG } = require('../utils/roundConfig');
const { generateRankingsPdf } = require('../utils/pdfGenerator');

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Normalize a string answer for comparison (trim + lowercase) */
const normalize = (str) => String(str ?? '').trim().toLowerCase();

/**
 * Fisher-Yates array shuffle algorithm to randomize question order uniquely per participant.
 */
const shuffleArray = (arr) => {
  const array = [...arr];
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

/** Check if round is unlocked, participant hasn't submitted, and deadline not passed */
const checkRoundAccess = async (userId, roundNum) => {
  const control = await RoundControl.findOne({ round: roundNum });
  if (!control || !control.isUnlocked) {
    return { allowed: false, reason: `Round ${roundNum} is locked Wait for a moment`, status: 403 };
  }

  // Check time limit
  if (control.durationMinutes && control.unlockedAt) {
    const elapsed = (Date.now() - new Date(control.unlockedAt).getTime()) / 60000;
    if (elapsed > control.durationMinutes) {
      return { allowed: false, reason: 'Time limit has expired for this round', status: 403 };
    }
  }

  const existingSubmit = await Submission.findOne({
    userId,
    round: roundNum,
    status: { $in: ['submitted', 'pending-review'] },
  });

  if (existingSubmit) {
    return { allowed: false, reason: 'Already submitted', status: 409, submission: existingSubmit };
  }

  return { allowed: true };
};

// ─── GET /api/rounds/status ───────────────────────────────────────────────────
const getRoundStatus = async (req, res) => {
  try {
    const controls = await RoundControl.find().sort({ round: 1 });
    const submissions = await Submission.find({
      userId: req.user._id,
      status: { $in: ['submitted', 'pending-review'] },
    }).select('round totalScore status submittedAt');

    const submissionMap = {};
    submissions.forEach((s) => (submissionMap[s.round] = s));

    const status = [1, 2, 3].map((round) => {
      const ctrl = controls.find((c) => c.round === round) || { isUnlocked: false };
      const sub = submissionMap[round];
      const cfg = ROUND_CONFIG[round];

      let timeRemaining = null;
      if (ctrl.isUnlocked && ctrl.durationMinutes && ctrl.unlockedAt) {
        const elapsed = (Date.now() - new Date(ctrl.unlockedAt).getTime()) / 1000;
        timeRemaining = Math.max(0, ctrl.durationMinutes * 60 - elapsed);
      }

      return {
        round,
        name: cfg.name,
        maxQuestions: cfg.maxQuestions,
        marksPerQuestion: cfg.marksPerQuestion,
        maxMarks: cfg.maxMarks,
        isUnlocked: ctrl.isUnlocked,
        durationMinutes: ctrl.durationMinutes,
        unlockedAt: ctrl.unlockedAt,
        timeRemainingSeconds: timeRemaining,
        submitted: !!sub,
        score: sub ? sub.totalScore : null,
        submissionStatus: sub ? sub.status : null,
        submittedAt: sub ? sub.submittedAt : null,
      };
    });

    res.json({ rounds: status });
  } catch (err) {
    console.error('getRoundStatus error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── Leaderboard & Event Completion Engine ──────────────────────────────────
const getEventLeaderboard = async () => {
  const participants = await User.find({ role: 'participant', isActive: true })
    .select('name username teamName')
    .sort({ createdAt: 1 });

  const validParticipants = participants.filter((p) => p && (p.teamName || p.name || p.username));

  const submissions = await Submission.find({ status: { $in: ['submitted', 'pending-review'] } })
    .populate('userId', 'name username teamName')
    .sort({ submittedAt: 1 });

  const userMap = {};
  validParticipants.forEach((p) => {
    const uid = p._id.toString();
    userMap[uid] = {
      userId: uid,
      name: p.name,
      username: p.username,
      teamName: p.teamName || p.name || p.username,
      roundScores: { 1: 0, 2: 0, 3: 0 },
      completedRounds: new Set(),
      totalScore: 0,
      earliestSubmit: null,
      latestSubmit: null,
    };
  });

  submissions.forEach((sub) => {
    if (!sub.userId) return;
    const uid = String(sub.userId._id || sub.userId.id || sub.userId);
    if (!userMap[uid]) return;

    userMap[uid].roundScores[sub.round] = sub.totalScore || 0;
    userMap[uid].completedRounds.add(sub.round);
    if (sub.submittedAt) {
      if (!userMap[uid].earliestSubmit || sub.submittedAt < userMap[uid].earliestSubmit) {
        userMap[uid].earliestSubmit = sub.submittedAt;
      }
      if (!userMap[uid].latestSubmit || sub.submittedAt > userMap[uid].latestSubmit) {
        userMap[uid].latestSubmit = sub.submittedAt;
      }
    }
  });

  // Calculate cumulative scores
  Object.values(userMap).forEach((u) => {
    u.totalScore = (u.roundScores[1] || 0) + (u.roundScores[2] || 0) + (u.roundScores[3] || 0);
  });

  let completedParticipants = 0;
  Object.values(userMap).forEach((u) => {
    if (u.completedRounds.has(1) && u.completedRounds.has(2) && u.completedRounds.has(3)) {
      completedParticipants++;
    }
  });

  const totalParticipants = validParticipants.length;
  const allCompleted = totalParticipants > 0 && completedParticipants >= totalParticipants;

  const leaderboard = Object.values(userMap).map((u) => ({
    userId: u.userId,
    name: u.name,
    username: u.username,
    teamName: u.teamName,
    roundScores: u.roundScores,
    totalScore: u.totalScore,
    isFullyCompleted: u.completedRounds.has(1) && u.completedRounds.has(2) && u.completedRounds.has(3),
    completedRoundsCount: u.completedRounds.size,
    submittedAt: u.latestSubmit,
    earliestSubmit: u.earliestSubmit,
  })).sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    if (a.earliestSubmit && b.earliestSubmit) {
      return new Date(a.earliestSubmit) - new Date(b.earliestSubmit);
    }
    return 0;
  }).map((p, idx) => ({
    ...p,
    rank: idx + 1,
  }));

  return {
    totalParticipants,
    completedParticipants,
    allCompleted,
    leaderboard,
  };
};

// ─── GET /api/rounds/final-result ─────────────────────────────────────────────
const getFinalResult = async (req, res) => {
  try {
    const { totalParticipants, completedParticipants, allCompleted, leaderboard } = await getEventLeaderboard();

    const userSubmissions = await Submission.find({
      userId: req.user._id,
      status: { $in: ['submitted', 'pending-review'] },
    });
    const userRounds = new Set(userSubmissions.map((s) => s.round));
    const userCompleted = userRounds.has(1) && userRounds.has(2) && userRounds.has(3);

    // If not all participants have completed all rounds, do NOT show final scores
    if (!allCompleted && req.user.role !== 'admin') {
      return res.json({
        allCompleted: false,
        userCompleted,
        totalParticipants,
        completedParticipants,
        message: 'Waiting for all participants to complete all rounds before releasing final rankings and PDF leaderboard.',
      });
    }

    // When all participants completed (or for admin), return leaderboard and my rank
    const myEntry = leaderboard.find((p) => p.userId === req.user._id.toString());

    res.json({
      allCompleted: true,
      userCompleted,
      totalParticipants,
      completedParticipants,
      myRank: myEntry ? myEntry.rank : null,
      leaderboard,
    });
  } catch (err) {
    console.error('getFinalResult error:', err);
    res.status(500).json({ message: 'Server error getting final result' });
  }
};

// ─── GET /api/rounds/rankings-pdf ─────────────────────────────────────────────
const getRankingsPdf = async (req, res) => {
  try {
    const { allCompleted, leaderboard } = await getEventLeaderboard();

    if (!allCompleted && req.user.role !== 'admin') {
      return res.status(403).json({
        message: 'PDF rankings will be available once all participants finish all rounds.',
      });
    }

    const pdfBuffer = await generateRankingsPdf(leaderboard);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="CodeBreakers_Final_Rankings.pdf"');
    res.setHeader('Content-Length', pdfBuffer.length);
    return res.send(pdfBuffer);
  } catch (err) {
    console.error('getRankingsPdf error:', err);
    res.status(500).json({ message: 'Failed to generate PDF' });
  }
};

// ─── ROUND 1 (Basic: 15 questions, 2 marks each = 30 marks) ─────────────────

const getRound1Questions = async (req, res) => {
  try {
    const access = await checkRoundAccess(req.user._id, 1);
    if (!access.allowed && access.status !== 409) {
      return res.status(access.status).json({ message: access.reason });
    }

    const inProgress = await Submission.findOne({ userId: req.user._id, round: 1, status: 'in-progress' });
    if (inProgress) {
      const questionIds = inProgress.answers.map((a) => String(a.questionId?._id || a.questionId?.id || a.questionId));
      const questions = await Question.find({ _id: { $in: questionIds }, round: 1, isActive: true })
        .select('-correctOptionIndex -correctAnswer');

      const qMap = {};
      questions.forEach((q) => (qMap[String(q._id || q.id)] = q));
      const orderedQuestions = questionIds.map((id) => qMap[id]).filter(Boolean);

      const ctrl = await RoundControl.findOne({ round: 1 });
      let timeRemainingSeconds = null;
      if (ctrl && ctrl.isUnlocked && ctrl.durationMinutes && ctrl.unlockedAt) {
        const elapsed = (Date.now() - new Date(ctrl.unlockedAt).getTime()) / 1000;
        timeRemainingSeconds = Math.max(0, Math.floor(ctrl.durationMinutes * 60 - elapsed));
      }

      return res.json({
        questions: orderedQuestions,
        startedAt: inProgress.startedAt,
        roundControl: {
          durationMinutes: ctrl?.durationMinutes || null,
          unlockedAt: ctrl?.unlockedAt || null,
          timeRemainingSeconds,
        },
      });
    }

    // Fresh start: fetch active Round 1 questions, shuffle uniquely for this participant
    const allQuestions = await Question.find({ round: 1, isActive: true })
      .select('-correctOptionIndex -correctAnswer');

    const questions = shuffleArray(allQuestions).slice(0, ROUND_CONFIG[1].maxQuestions);

    // Create in-progress submission record to lock in this participant's shuffled question sequence
    await Submission.create({
      userId: req.user._id,
      round: 1,
      answers: questions.map((q) => ({ questionId: q._id, submittedAnswer: null, isCorrect: false, pointsAwarded: 0 })),
      status: 'in-progress',
      startedAt: new Date(),
    });

    const ctrl = await RoundControl.findOne({ round: 1 });
    let timeRemainingSeconds = null;
    if (ctrl && ctrl.isUnlocked && ctrl.durationMinutes && ctrl.unlockedAt) {
      const elapsed = (Date.now() - new Date(ctrl.unlockedAt).getTime()) / 1000;
      timeRemainingSeconds = Math.max(0, Math.floor(ctrl.durationMinutes * 60 - elapsed));
    }

    res.json({
      questions,
      startedAt: new Date(),
      roundControl: {
        durationMinutes: ctrl?.durationMinutes || null,
        unlockedAt: ctrl?.unlockedAt || null,
        timeRemainingSeconds,
      },
    });
  } catch (err) {
    console.error('getRound1Questions error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const submitRound1 = async (req, res) => {
  try {
    const access = await checkRoundAccess(req.user._id, 1);
    if (!access.allowed && access.status === 409) {
      return res.status(409).json({ message: 'Already submitted for Round 1', submission: access.submission });
    }
    if (!access.allowed) {
      return res.status(access.status).json({ message: access.reason });
    }

    const { answers } = req.body;
    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({ message: 'Answers array is required' });
    }

    const questionIds = answers.map((a) => a.questionId);
    const questions = await Question.find({ _id: { $in: questionIds }, round: 1 });
    const qMap = {};
    questions.forEach((q) => (qMap[q._id.toString()] = q));

    let totalScore = 0;
    const marksPerQ = ROUND_CONFIG[1].marksPerQuestion; // 2 marks

    const gradedAnswers = answers.map((ans) => {
      const q = qMap[ans.questionId];
      if (!q) return { questionId: ans.questionId, submittedAnswer: ans.selectedOptionIndex, isCorrect: false, pointsAwarded: 0 };

      let isCorrect = false;
      if (ans.selectedOptionIndex !== undefined && ans.selectedOptionIndex !== null && ans.selectedOptionIndex !== -1) {
        if (q.correctOptionIndex !== undefined) {
          isCorrect = q.correctOptionIndex === ans.selectedOptionIndex;
        } else if (q.correctAnswer) {
          const selectedText = q.options[ans.selectedOptionIndex];
          isCorrect = normalize(selectedText) === normalize(q.correctAnswer);
        }
      }

      const points = isCorrect ? marksPerQ : 0;
      totalScore += points;
      return {
        questionId: ans.questionId,
        submittedAnswer: ans.selectedOptionIndex,
        isCorrect,
        pointsAwarded: points,
        timeTakenSeconds: ans.timeTakenSeconds || 0,
      };
    });

    const submission = await Submission.findOneAndUpdate(
      { userId: req.user._id, round: 1 },
      { answers: gradedAnswers, totalScore, submittedAt: new Date(), status: 'submitted' },
      { new: true, upsert: true }
    );

    res.json({ message: 'Round 1 submitted!', totalScore, maxMarks: ROUND_CONFIG[1].maxMarks, submission });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: 'Already submitted for Round 1' });
    console.error('submitRound1 error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── ROUND 2 (Intermediate: 10 questions, 3 marks each = 30 marks) ───────────

const getRound2Questions = async (req, res) => {
  try {
    const access = await checkRoundAccess(req.user._id, 2);
    if (!access.allowed && access.status !== 409) {
      return res.status(access.status).json({ message: access.reason });
    }

    const inProgress = await Submission.findOne({ userId: req.user._id, round: 2, status: 'in-progress' });
    if (inProgress) {
      const questionIds = inProgress.answers.map((a) => String(a.questionId?._id || a.questionId?.id || a.questionId));
      const questions = await Question.find({ _id: { $in: questionIds }, round: 2, isActive: true })
        .select('-correctOutput -correctAnswer -correctOptionIndex -java.answer -python.answer');

      const qMap = {};
      questions.forEach((q) => (qMap[String(q._id || q.id)] = q));
      const orderedQuestions = questionIds.map((id) => qMap[id]).filter(Boolean);

      const ctrl = await RoundControl.findOne({ round: 2 });
      let timeRemainingSeconds = null;
      if (ctrl && ctrl.isUnlocked && ctrl.durationMinutes && ctrl.unlockedAt) {
        const elapsed = (Date.now() - new Date(ctrl.unlockedAt).getTime()) / 1000;
        timeRemainingSeconds = Math.max(0, Math.floor(ctrl.durationMinutes * 60 - elapsed));
      }

      return res.json({
        questions: orderedQuestions,
        startedAt: inProgress.startedAt,
        roundControl: {
          durationMinutes: ctrl?.durationMinutes || null,
          unlockedAt: ctrl?.unlockedAt || null,
          timeRemainingSeconds,
        },
      });
    }

    // Fresh start: fetch active Round 2 questions, shuffle uniquely for this participant
    const allQuestions = await Question.find({ round: 2, isActive: true })
      .select('-correctOutput -correctAnswer -correctOptionIndex -java.answer -python.answer');

    const questions = shuffleArray(allQuestions).slice(0, ROUND_CONFIG[2].maxQuestions);

    // Create in-progress submission record to lock in this participant's shuffled question sequence
    await Submission.create({
      userId: req.user._id,
      round: 2,
      answers: questions.map((q) => ({ questionId: q._id, submittedAnswer: null, isCorrect: false, pointsAwarded: 0 })),
      status: 'in-progress',
      startedAt: new Date(),
    });

    const ctrl = await RoundControl.findOne({ round: 2 });
    let timeRemainingSeconds = null;
    if (ctrl && ctrl.isUnlocked && ctrl.durationMinutes && ctrl.unlockedAt) {
      const elapsed = (Date.now() - new Date(ctrl.unlockedAt).getTime()) / 1000;
      timeRemainingSeconds = Math.max(0, Math.floor(ctrl.durationMinutes * 60 - elapsed));
    }

    res.json({
      questions,
      startedAt: new Date(),
      roundControl: {
        durationMinutes: ctrl?.durationMinutes || null,
        unlockedAt: ctrl?.unlockedAt || null,
        timeRemainingSeconds,
      },
    });
  } catch (err) {
    console.error('getRound2Questions error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const submitRound2 = async (req, res) => {
  try {
    const access = await checkRoundAccess(req.user._id, 2);
    if (!access.allowed && access.status !== 409) {
      return res.status(409).json({ message: 'Already submitted for Round 2', submission: access.submission });
    }
    if (!access.allowed) {
      return res.status(access.status).json({ message: access.reason });
    }

    const { answers } = req.body;
    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({ message: 'Answers array is required' });
    }

    const questionIds = answers.map((a) => a.questionId);
    const questions = await Question.find({ _id: { $in: questionIds }, round: 2 });
    const qMap = {};
    questions.forEach((q) => (qMap[q._id.toString()] = q));

    let totalScore = 0;
    const marksPerQ = ROUND_CONFIG[2].marksPerQuestion; // 3 marks

    const gradedAnswers = answers.map((ans) => {
      const q = qMap[ans.questionId];
      if (!q) return { questionId: ans.questionId, submittedAnswer: ans.submittedOutput, isCorrect: false, pointsAwarded: 0 };

      // Support MCQ options or direct code output check
      let isCorrect = false;
      if (ans.selectedOptionIndex !== undefined && ans.selectedOptionIndex !== null && ans.selectedOptionIndex !== -1) {
        if (q.correctOptionIndex !== undefined) {
          isCorrect = q.correctOptionIndex === ans.selectedOptionIndex;
        }
      } else if (ans.submittedOutput !== undefined && ans.submittedOutput !== null) {
        const targetOutput = q.correctOutput || q.correctAnswer || q.java?.answer || q.python?.answer;
        const targetJava = q.java?.answer;
        const targetPython = q.python?.answer;
        isCorrect = normalize(targetOutput) === normalize(ans.submittedOutput) ||
                    (targetJava && normalize(targetJava) === normalize(ans.submittedOutput)) ||
                    (targetPython && normalize(targetPython) === normalize(ans.submittedOutput));
      }

      const points = isCorrect ? marksPerQ : 0;
      totalScore += points;
      return {
        questionId: ans.questionId,
        submittedAnswer: ans.submittedOutput ?? ans.selectedOptionIndex,
        isCorrect,
        pointsAwarded: points,
        timeTakenSeconds: ans.timeTakenSeconds || 0,
      };
    });

    const submission = await Submission.findOneAndUpdate(
      { userId: req.user._id, round: 2 },
      { answers: gradedAnswers, totalScore, submittedAt: new Date(), status: 'submitted' },
      { new: true, upsert: true }
    );

    res.json({ message: 'Round 2 submitted!', totalScore, maxMarks: ROUND_CONFIG[2].maxMarks, submission });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: 'Already submitted for Round 2' });
    console.error('submitRound2 error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── ROUND 3 (Advanced: 5 questions, 8 marks each = 40 marks) ────────────────

const getRound3Questions = async (req, res) => {
  try {
    const access = await checkRoundAccess(req.user._id, 3);
    if (!access.allowed && access.status !== 409) {
      return res.status(access.status).json({ message: access.reason });
    }

    const inProgress = await Submission.findOne({ userId: req.user._id, round: 3, status: 'in-progress' });
    if (inProgress) {
      const questionIds = inProgress.answers.map((a) => String(a.questionId?._id || a.questionId?.id || a.questionId));
      const questions = await Question.find({ _id: { $in: questionIds }, round: 3, isActive: true })
        .select('-hiddenInput -hiddenExpectedOutput -hiddenAnswer -java.hiddenInput -java.hiddenAnswer -java.hiddenInput2 -java.hiddenAnswer2 -python.hiddenInput -python.hiddenAnswer -python.hiddenInput2 -python.hiddenAnswer2 -explanation -java.correctCode -python.correctCode');

      const qMap = {};
      questions.forEach((q) => (qMap[String(q._id || q.id)] = q));
      const orderedQuestions = questionIds.map((id) => qMap[id]).filter(Boolean);

      const ctrl = await RoundControl.findOne({ round: 3 });
      let timeRemainingSeconds = null;
      if (ctrl && ctrl.isUnlocked && ctrl.durationMinutes && ctrl.unlockedAt) {
        const elapsed = (Date.now() - new Date(ctrl.unlockedAt).getTime()) / 1000;
        timeRemainingSeconds = Math.max(0, Math.floor(ctrl.durationMinutes * 60 - elapsed));
      }

      return res.json({
        questions: orderedQuestions,
        startedAt: inProgress.startedAt,
        roundControl: {
          durationMinutes: ctrl?.durationMinutes || null,
          unlockedAt: ctrl?.unlockedAt || null,
          timeRemainingSeconds,
        },
      });
    }

    // Fresh start: fetch active Round 3 questions, shuffle uniquely for this participant
    const allQuestions = await Question.find({ round: 3, isActive: true })
      .select('-hiddenInput -hiddenExpectedOutput -hiddenAnswer -java.hiddenInput -java.hiddenAnswer -java.hiddenInput2 -java.hiddenAnswer2 -python.hiddenInput -python.hiddenAnswer -python.hiddenInput2 -python.hiddenAnswer2 -explanation -java.correctCode -python.correctCode');

    const questions = shuffleArray(allQuestions).slice(0, ROUND_CONFIG[3].maxQuestions);

    // Create in-progress submission record to lock in this participant's shuffled question sequence
    await Submission.create({
      userId: req.user._id,
      round: 3,
      answers: questions.map((q) => ({ questionId: q._id, submittedAnswer: null, isCorrect: false, pointsAwarded: 0 })),
      status: 'in-progress',
      startedAt: new Date(),
    });

    const ctrl = await RoundControl.findOne({ round: 3 });
    let timeRemainingSeconds = null;
    if (ctrl && ctrl.isUnlocked && ctrl.durationMinutes && ctrl.unlockedAt) {
      const elapsed = (Date.now() - new Date(ctrl.unlockedAt).getTime()) / 1000;
      timeRemainingSeconds = Math.max(0, Math.floor(ctrl.durationMinutes * 60 - elapsed));
    }

    res.json({
      questions,
      startedAt: new Date(),
      roundControl: {
        durationMinutes: ctrl?.durationMinutes || null,
        unlockedAt: ctrl?.unlockedAt || null,
        timeRemainingSeconds,
      },
    });
  } catch (err) {
    console.error('getRound3Questions error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const evaluateRound3Question = async (q, code, lang) => {
  const normalizedLang = (lang || 'python').toLowerCase();
  const rawCode = String(code || '').trim();

  // Sample Test Case
  const sampleInput = (normalizedLang === 'java' ? q.java?.input : q.python?.input) || q.testInput || '';
  const sampleTarget = (normalizedLang === 'java' ? q.java?.answer : q.python?.answer) ||
                       q.expectedOutput || q.correctOutput || q.correctAnswer || '';

  // Hidden Test Case 1
  const hiddenInput1 = (normalizedLang === 'java' ? q.java?.hiddenInput : q.python?.hiddenInput) || q.hiddenInput || '';
  const hiddenTarget1 = (normalizedLang === 'java' ? q.java?.hiddenAnswer : q.python?.hiddenAnswer) || q.hiddenExpectedOutput || '';

  // Hidden Test Case 2
  const hiddenInput2 = (normalizedLang === 'java' ? q.java?.hiddenInput2 : q.python?.hiddenInput2) || '';
  const hiddenTarget2 = (normalizedLang === 'java' ? q.java?.hiddenAnswer2 : q.python?.hiddenAnswer2) || '';

  // Execute all test cases in parallel for speed
  const samplePromise = executeCode(rawCode, normalizedLang, { input: sampleInput, timeoutMs: 10000 });
  const hidden1Promise = hiddenTarget1
    ? executeCode(rawCode, normalizedLang, { input: hiddenInput1, timeoutMs: 10000 })
    : Promise.resolve({ success: true, output: '', executionTimeMs: 0 });
  const hidden2Promise = hiddenTarget2
    ? executeCode(rawCode, normalizedLang, { input: hiddenInput2, timeoutMs: 10000 })
    : Promise.resolve({ success: true, output: '', executionTimeMs: 0 });

  const [sampleResult, hiddenResult1, hiddenResult2] = await Promise.all([
    samplePromise,
    hidden1Promise,
    hidden2Promise,
  ]);

  const samplePassed = isOutputMatch(sampleResult.output, sampleTarget);
  const hiddenPassed1 = !hiddenTarget1 || isOutputMatch(hiddenResult1.output, hiddenTarget1);
  const hiddenPassed2 = !hiddenTarget2 || isOutputMatch(hiddenResult2.output, hiddenTarget2);

  // Anti-hardcoding input dependency check
  let inputDependencyPassed = true;
  if (sampleInput.trim().length > 0) {
    if (normalizedLang === 'python') {
      if (!rawCode.includes('input(') && !rawCode.includes('input ()') && !rawCode.includes('sys.stdin')) {
        inputDependencyPassed = false;
      }
    } else if (normalizedLang === 'java') {
      if (!rawCode.includes('Scanner') && !rawCode.includes('System.in') && !rawCode.includes('BufferedReader')) {
        inputDependencyPassed = false;
      }
    }
  }

  const hiddenPassed = hiddenPassed1 && hiddenPassed2;
  const isCorrect = samplePassed && hiddenPassed && inputDependencyPassed;

  return {
    success: sampleResult.success,
    output: sampleResult.output,
    error: sampleResult.error,
    samplePassed,
    hiddenPassed,
    isCorrect,
    executionTimeMs: Math.max(
      sampleResult.executionTimeMs || 0,
      hiddenResult1.executionTimeMs || 0,
      hiddenResult2.executionTimeMs || 0
    ),
  };
};

const runRound3Code = async (req, res) => {
  try {
    const { questionId, code, selectedLanguage } = req.body;
    if (!questionId) {
      return res.status(400).json({ message: 'questionId is required' });
    }

    const question = await Question.findById(questionId);
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    const lang = (selectedLanguage || question.language || 'python').toLowerCase();
    const evalResult = await evaluateRound3Question(question, code || '', lang);

    res.json({
      success: evalResult.success,
      output: evalResult.output,
      error: evalResult.error,
      samplePassed: evalResult.samplePassed,
      hiddenPassed: evalResult.hiddenPassed,
      isCorrect: evalResult.isCorrect,
      executionTimeMs: evalResult.executionTimeMs,
    });
  } catch (err) {
    console.error('runRound3Code error:', err);
    res.status(500).json({ message: 'Error executing code' });
  }
};

const submitRound3 = async (req, res) => {
  try {
    const access = await checkRoundAccess(req.user._id, 3);
    if (!access.allowed && access.status === 409) {
      return res.status(409).json({ message: 'Already submitted for Round 3', submission: access.submission });
    }
    if (!access.allowed) {
      return res.status(access.status).json({ message: access.reason });
    }

    const { answers } = req.body;
    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({ message: 'Answers array is required' });
    }

    const questionIds = answers.map((a) => a.questionId);
    const questions = await Question.find({ _id: { $in: questionIds }, round: 3 });
    const qMap = {};
    questions.forEach((q) => (qMap[q._id.toString()] = q));

    let totalScore = 0;
    const marksPerQ = ROUND_CONFIG[3].marksPerQuestion; // 8 marks
    const gradedAnswers = [];

    for (const ans of answers) {
      const q = qMap[ans.questionId];
      if (!q) {
        gradedAnswers.push({
          questionId: ans.questionId,
          submittedAnswer: ans.correctedCode || '',
          isCorrect: false,
          samplePassed: false,
          hiddenPassed: false,
          pointsAwarded: 0,
          timeTakenSeconds: ans.timeTakenSeconds || 0,
        });
        continue;
      }

      const lang = (ans.selectedLanguage || 'python').toLowerCase();
      const defaultBuggy = lang === 'java'
        ? (q.java?.code || q.codeSnippet || q.buggyCode)
        : (q.python?.code || q.codeSnippetPython || q.buggyCode);

      const codeToRun = ans.correctedCode ?? defaultBuggy ?? '';
      const evalResult = await evaluateRound3Question(q, codeToRun, lang);

      const points = evalResult.isCorrect ? marksPerQ : 0;
      totalScore += points;

      gradedAnswers.push({
        questionId: ans.questionId,
        submittedAnswer: codeToRun,
        selectedLanguage: lang,
        isCorrect: evalResult.isCorrect,
        samplePassed: evalResult.samplePassed,
        hiddenPassed: evalResult.hiddenPassed,
        pointsAwarded: points,
        timeTakenSeconds: ans.timeTakenSeconds || 0,
      });
    }

    const submission = await Submission.findOneAndUpdate(
      { userId: req.user._id, round: 3 },
      { answers: gradedAnswers, totalScore, submittedAt: new Date(), status: 'submitted' },
      { new: true, upsert: true }
    );

    res.json({
      message: 'Round 3 submitted!',
      totalScore,
      maxMarks: ROUND_CONFIG[3].maxMarks,
      submission,
      status: 'submitted',
    });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: 'Already submitted for Round 3' });
    console.error('submitRound3 error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getRoundStatus,
  getFinalResult,
  getRankingsPdf,
  getEventLeaderboard,
  getRound1Questions,
  submitRound1,
  getRound2Questions,
  submitRound2,
  getRound3Questions,
  runRound3Code,
  submitRound3,
};
