/**
 * Round Configuration & Marks Rules
 * Total Marks: 100
 * - Round 1 (Basic): 15 questions x 2 marks = 30 marks
 * - Round 2 (Intermediate): 10 questions x 3 marks = 30 marks
 * - Round 3 (Advanced): 5 questions x 8 marks = 40 marks
 */

const ROUND_CONFIG = {
  1: {
    round: 1,
    name: 'Basic',
    maxQuestions: 15,
    marksPerQuestion: 2,
    maxMarks: 30,
    subtitle: '15 questions • 2 marks each',
  },
  2: {
    round: 2,
    name: 'Intermediate',
    maxQuestions: 10,
    marksPerQuestion: 3,
    maxMarks: 30,
    subtitle: '10 questions • 3 marks each',
  },
  3: {
    round: 3,
    name: 'Advanced',
    maxQuestions: 8,
    marksPerQuestion: 5,
    maxMarks: 40,
    subtitle: '8 questions • 5 marks each',
  },
};

const getRoundMarks = (roundNum) => {
  const cfg = ROUND_CONFIG[roundNum];
  return cfg ? cfg.marksPerQuestion : 0;
};

const getMaxQuestions = (roundNum) => {
  const cfg = ROUND_CONFIG[roundNum];
  return cfg ? cfg.maxQuestions : 0;
};

const getMaxMarks = (roundNum) => {
  const cfg = ROUND_CONFIG[roundNum];
  return cfg ? cfg.maxMarks : 0;
};

module.exports = {
  ROUND_CONFIG,
  getRoundMarks,
  getMaxQuestions,
  getMaxMarks,
};
