const { initFirebase } = require('../config/firebase');
const seed = require('../seed/seed');
const Question = require('../models/Question');
const User = require('../models/User');

async function run() {
  console.log('Initializing Firebase and running seed...');
  initFirebase();
  await seed();

  const r1 = await Question.countDocuments({ round: 1 });
  const r2 = await Question.countDocuments({ round: 2 });
  const r3 = await Question.countDocuments({ round: 3 });
  const userCount = await User.countDocuments({});

  console.log(`\nLIVE FIREBASE SUMMARY:`);
  console.log(`Round 1 count: ${r1}`);
  console.log(`Round 2 count: ${r2}`);
  console.log(`Round 3 count: ${r3}`);
  console.log(`Total users: ${userCount}`);

  process.exit(0);
}

run().catch((err) => {
  console.error('Seed execution error:', err);
  process.exit(1);
});
