const RoundControl = require('../models/RoundControl');

/**
 * GET /api/admin/round-control
 * Get lock state for all 3 rounds
 */
const getRoundControl = async (req, res) => {
  try {
    const controls = await RoundControl.find().sort({ round: 1 });
    res.json({ controls });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * PATCH /api/admin/round-control/:round
 * Lock or unlock a round, optionally set duration
 */
const updateRoundControl = async (req, res) => {
  try {
    const round = parseInt(req.params.round, 10);
    if (![1, 2, 3].includes(round)) {
      return res.status(400).json({ message: 'Invalid round number (must be 1, 2, or 3)' });
    }

    const { isUnlocked, durationMinutes } = req.body;

    const update = {};
    if (typeof isUnlocked === 'boolean') {
      update.isUnlocked = isUnlocked;
      if (isUnlocked) {
        update.unlockedAt = new Date();
      }
    }
    if (durationMinutes !== undefined) {
      update.durationMinutes = durationMinutes;
      // Reset unlockedAt if currently unlocked so timer starts fresh
      if (isUnlocked || req.body.isUnlocked) {
        update.unlockedAt = new Date();
      }
    }

    const control = await RoundControl.findOneAndUpdate(
      { round },
      { $set: update },
      { new: true, upsert: true }
    );

    res.json({ message: `Round ${round} updated`, control });
  } catch (err) {
    console.error('updateRoundControl error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getRoundControl, updateRoundControl };
