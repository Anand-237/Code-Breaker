const Submission = require('../models/Submission');
const User = require('../models/User');
const RoundControl = require('../models/RoundControl');
const Round1Question = require('../models/Round1Question');
const Round2Question = require('../models/Round2Question');
const Round3Question = require('../models/Round3Question');

/**
 * GET /api/admin/results
 * Full leaderboard with per-round breakdown + Round 3 manual review queue
 */
const getResults = async (req, res) => {
  try {
    const participants = await User.find({ role: 'participant' }).select('name username teamName isActive').sort({ createdAt: -1 });
    const submissions = await Submission.find({ status: { $in: ['submitted', 'pending-review'] } })
      .populate('userId', 'name username teamName')
      .sort({ submittedAt: 1 });

    // Aggregate per-user scores
    const userMap = {};

    // Initialize all active participants in userMap
    participants.forEach((p) => {
      const uid = p._id.toString();
      userMap[uid] = {
        userId: p._id,
        name: p.name,
        username: p.username,
        teamName: p.teamName || p.name || p.username,
        rounds: [],
        roundScores: { 1: 0, 2: 0, 3: 0 },
        cumulative: 0,
        earliestSubmit: null,
      };
    });

    submissions.forEach((sub) => {
      if (!sub.userId) return;
      const uid = sub.userId._id.toString();
      if (!userMap[uid]) {
        userMap[uid] = {
          userId: sub.userId._id,
          name: sub.userId.name,
          username: sub.userId.username,
          teamName: sub.userId.teamName || sub.userId.name || sub.userId.username,
          rounds: [],
          roundScores: { 1: 0, 2: 0, 3: 0 },
          cumulative: 0,
          earliestSubmit: sub.submittedAt,
        };
      }
      userMap[uid].roundScores[sub.round] = sub.totalScore;
      userMap[uid].rounds.push({
        round: sub.round,
        score: sub.totalScore,
        status: sub.status,
        submittedAt: sub.submittedAt,
        submissionId: sub._id,
      });
      userMap[uid].cumulative += sub.totalScore;
      if (sub.submittedAt) {
        if (!userMap[uid].earliestSubmit || sub.submittedAt < userMap[uid].earliestSubmit) {
          userMap[uid].earliestSubmit = sub.submittedAt;
        }
      }
    });

    const leaderboard = Object.values(userMap).sort((a, b) => {
      if (b.cumulative !== a.cumulative) return b.cumulative - a.cumulative;
      if (a.earliestSubmit && b.earliestSubmit) {
        return new Date(a.earliestSubmit) - new Date(b.earliestSubmit);
      }
      if (a.earliestSubmit) return -1;
      if (b.earliestSubmit) return 1;
      return 0;
    });

    // Round 3 pending-review queue
    const pendingReviews = await Submission.find({ round: 3, status: 'pending-review' })
      .populate('userId', 'name username teamName')
      .populate({ path: 'answers.questionId', model: 'Round3Question', select: 'title buggyCode language expectedOutput points' });

    res.json({ leaderboard, pendingReviews });
  } catch (err) {
    console.error('getResults error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * GET /api/admin/results/user/:userId
 * Fetch full detailed answer sheet for a specific team across all rounds
 */
const getUserAnswerSheet = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).select('name username teamName role');
    if (!user) return res.status(404).json({ message: 'Participant not found' });

    const submissions = await Submission.find({ userId });

    const detailedSubmissions = [];
    for (const sub of submissions) {
      let QuestionModel;
      if (sub.round === 1) QuestionModel = Round1Question;
      else if (sub.round === 2) QuestionModel = Round2Question;
      else if (sub.round === 3) QuestionModel = Round3Question;

      const subObj = sub.toObject();
      if (QuestionModel) {
        const qIds = subObj.answers.map((a) => a.questionId);
        const questions = await QuestionModel.find({ _id: { $in: qIds } });
        const qMap = {};
        questions.forEach((q) => (qMap[q._id.toString()] = q));

        subObj.answers = subObj.answers.map((ans) => ({
          ...ans,
          question: qMap[ans.questionId.toString()] || null,
        }));
      }
      detailedSubmissions.push(subObj);
    }

    res.json({ user, submissions: detailedSubmissions });
  } catch (err) {
    console.error('getUserAnswerSheet error:', err);
    res.status(500).json({ message: 'Server error fetching user answer sheet' });
  }
};

/**
 * PATCH /api/admin/results/review/:submissionId
 * Admin manually grades a Round 3 submission answer
 * Body: { answers: [{ questionId, isCorrect, pointsAwarded }] }
 */
const reviewRound3 = async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.submissionId);
    if (!submission || submission.round !== 3) {
      return res.status(404).json({ message: 'Round 3 submission not found' });
    }

    const { answers } = req.body; // array of { questionId, isCorrect, pointsAwarded }
    let totalScore = 0;

    answers.forEach((review) => {
      const answer = submission.answers.find(
        (a) => a.questionId.toString() === review.questionId
      );
      if (answer) {
        answer.isCorrect = review.isCorrect;
        answer.pointsAwarded = review.isCorrect ? review.pointsAwarded : 0;
      }
    });

    submission.answers.forEach((a) => (totalScore += a.pointsAwarded || 0));
    submission.totalScore = totalScore;
    submission.status = 'submitted';
    submission.adminReviewedAt = new Date();
    submission.adminReviewedBy = req.user._id;

    await submission.save();
    res.json({ message: 'Round 3 submission reviewed', submission });
  } catch (err) {
    console.error('reviewRound3 error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getResults, getUserAnswerSheet, reviewRound3 };
