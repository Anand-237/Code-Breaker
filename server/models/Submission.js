const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  shuffledOptions: {
    type: [String],
    default: [],
  },
  submittedAnswer: {
    type: mongoose.Schema.Types.Mixed, // option text, index, string, or code
    default: '',
  },
  isCorrect: {
    type: Boolean,
    default: false,
  },
  pointsAwarded: {
    type: Number,
    default: 0,
  },
  timeTakenSeconds: {
    type: Number,
    default: 0,
  },
});

const submissionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    round: {
      type: Number,
      enum: [1, 2, 3],
      required: true,
    },
    answers: [answerSchema],
    totalScore: {
      type: Number,
      default: 0,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    submittedAt: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['in-progress', 'submitted', 'pending-review'],
      default: 'in-progress',
    },
    adminReviewedAt: {
      type: Date,
    },
    adminReviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

// Enforce one submission per round per user
submissionSchema.index({ userId: 1, round: 1 }, { unique: true });

module.exports = mongoose.model('Submission', submissionSchema);
