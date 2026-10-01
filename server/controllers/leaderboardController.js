const Submission = require('../models/Submission');
const User = require('../models/User');

/**
 * GET /api/leaderboard/top3
 * Returns top 3 participants by cumulative score.
 * Tie-breaker: earliest submission timestamp.
 * Available to all authenticated users.
 */
const getTop3 = async (req, res) => {
  try {
    const results = await Submission.aggregate([
      { $match: { status: { $in: ['submitted', 'pending-review'] } } },
      {
        $group: {
          _id: '$userId',
          cumulative: { $sum: '$totalScore' },
          earliestSubmit: { $min: '$submittedAt' },
        },
      },
      { $sort: { cumulative: -1, earliestSubmit: 1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      {
        $project: {
          _id: 0,
          userId: '$_id',
          name: '$user.name',
          username: '$user.username',
          teamName: '$user.teamName',
          cumulative: 1,
          earliestSubmit: 1,
        },
      },
    ]);

    res.json({ leaderboard: results });
  } catch (err) {
    console.error('getTop3 error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * GET /api/leaderboard/full
 * Full leaderboard — admin only.
 */
const getFullLeaderboard = async (req, res) => {
  try {
    const results = await Submission.aggregate([
      { $match: { status: { $in: ['submitted', 'pending-review'] } } },
      {
        $group: {
          _id: '$userId',
          cumulative: { $sum: '$totalScore' },
          earliestSubmit: { $min: '$submittedAt' },
          rounds: {
            $push: { round: '$round', score: '$totalScore' },
          },
        },
      },
      { $sort: { cumulative: -1, earliestSubmit: 1 } },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      {
        $project: {
          _id: 0,
          userId: '$_id',
          name: '$user.name',
          username: '$user.username',
          teamName: '$user.teamName',
          cumulative: 1,
          earliestSubmit: 1,
          rounds: 1,
        },
      },
    ]);

    res.json({ leaderboard: results });
  } catch (err) {
    console.error('getFullLeaderboard error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getTop3, getFullLeaderboard };
