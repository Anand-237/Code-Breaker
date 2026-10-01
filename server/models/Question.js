const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema(
  {
    round: {
      type: Number,
      enum: [1, 2, 3],
      required: [true, 'Round is required (1, 2, or 3)'],
    },
    questionType: {
      type: String,
      enum: ['mcq', 'output', 'debug'],
      default: 'mcq',
    },
    questionText: {
      type: String,
      trim: true,
    },
    title: {
      type: String,
      trim: true,
    },
    options: {
      type: [String],
      default: [],
    },
    correctOptionIndex: {
      type: Number,
      default: 0,
    },
    correctAnswer: {
      type: String,
      default: '',
    },
    codeSnippet: {
      type: String,
      default: '',
    },
    codeSnippetPython: {
      type: String,
      default: '',
    },
    java: {
      code: { type: String, default: '' },
      correctCode: { type: String, default: '' },
      answer: { type: String, default: '' },
      input: { type: String, default: '' },
      hiddenInput: { type: String, default: '' },
      hiddenAnswer: { type: String, default: '' },
      hiddenInput2: { type: String, default: '' },
      hiddenAnswer2: { type: String, default: '' },
    },
    python: {
      code: { type: String, default: '' },
      correctCode: { type: String, default: '' },
      answer: { type: String, default: '' },
      input: { type: String, default: '' },
      hiddenInput: { type: String, default: '' },
      hiddenAnswer: { type: String, default: '' },
      hiddenInput2: { type: String, default: '' },
      hiddenAnswer2: { type: String, default: '' },
    },
    testInput: {
      type: String,
      default: '',
    },
    hiddenInput: {
      type: String,
      default: '',
    },
    hiddenExpectedOutput: {
      type: String,
      default: '',
    },
    buggyCode: {
      type: String,
      default: '',
    },
    language: {
      type: String,
      enum: ['javascript', 'python', 'cpp', 'java', 'c', 'typescript'],
      default: 'javascript',
    },
    correctOutput: {
      type: String,
      default: '',
    },
    expectedOutput: {
      type: String,
      default: '',
    },
    marks: {
      type: Number,
      required: true,
    },
    points: {
      type: Number,
    },
    explanation: {
      type: String,
      default: '',
    },
    order: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Sync points with marks before saving
questionSchema.pre('save', function (next) {
  if (this.marks !== undefined) {
    this.points = this.marks;
  } else if (this.points !== undefined) {
    this.marks = this.points;
  }
  next();
});

module.exports = mongoose.model('Question', questionSchema);
