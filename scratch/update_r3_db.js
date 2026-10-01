const mongoose = require('mongoose');
require('dotenv').config({ path: 'c:/Users/sharm/Downloads/aidex-main1/aidex-main/server/.env' });

const Question = require('c:/Users/sharm/Downloads/aidex-main1/aidex-main/server/models/Question');
const seed = require('c:/Users/sharm/Downloads/aidex-main1/aidex-main/server/seed/seed');

async function main() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/codebreakers';
  console.log('Connecting to MongoDB:', mongoUri);
  await mongoose.connect(mongoUri);

  console.log('Running seed to update database...');
  await seed();
  console.log('Seed execution completed successfully.');

  const r3Questions = await Question.find({ round: 3 }).sort({ order: 1 });
  console.log(`Found ${r3Questions.length} Round 3 questions:`);
  r3Questions.forEach((q, idx) => {
    console.log(`Q${idx + 1}: ${q.title}`);
    console.log(`  Sample Input: ${JSON.stringify(q.testInput || q.java?.input || '')}`);
    console.log(`  Sample Answer: ${JSON.stringify(q.expectedOutput || q.java?.answer || '')}`);
    console.log(`  Hidden Input: ${JSON.stringify(q.hiddenInput || q.java?.hiddenInput || '')}`);
    console.log(`  Hidden Answer: ${JSON.stringify(q.hiddenExpectedOutput || q.java?.hiddenAnswer || '')}`);
  });

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Error updating R3 DB:', err);
  process.exit(1);
});
