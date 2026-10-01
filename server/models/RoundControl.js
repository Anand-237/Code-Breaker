const mongoose = require('mongoose');

const roundControlSchema = new mongoose.Schema(
  {
    round: {
      type: Number,
      enum: [1, 2, 3],
      required: true,
      unique: true,
    },
    isUnlocked: {
      type: Boolean,
      default: false,
    },
    unlockedAt: {
      type: Date,
    },
    durationMinutes: {
      type: Number,
      default: null, // null = no time limit
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('RoundControl', roundControlSchema);
