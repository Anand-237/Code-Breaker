const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const seed = require('../seed/seed');

async function run() {
  const dataDir = path.join(__dirname, '../data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  } else {
    const lockFile = path.join(dataDir, 'mongod.lock');
    if (fs.existsSync(lockFile)) {
      try { fs.unlinkSync(lockFile); } catch (_) {}
    }
  }

  console.log('Starting MongoMemoryServer at:', dataDir);
  const mongod = await MongoMemoryServer.create({
    instance: {
      dbPath: dataDir,
      storageEngine: 'wiredTiger',
      keepData: true,
      dbName: 'code-breakers',
    },
  });

  const uri = mongod.getUri('code-breakers');
  console.log('Connecting to:', uri);
  await mongoose.connect(uri);

  console.log('Running seed...');
  await seed();

  const Question = mongoose.model('Question');
  const r1 = await Question.countDocuments({ round: 1 });
  const r2 = await Question.countDocuments({ round: 2 });
  const r3 = await Question.countDocuments({ round: 3 });

  console.log(`\nLIVE DB SUMMARY:\nRound 1 count: ${r1}\nRound 2 count: ${r2}\nRound 3 count: ${r3}`);

  await mongoose.disconnect();
  await mongod.stop();
  process.exit(0);
}

run().catch((err) => {
  console.error('Migration error:', err);
  process.exit(1);
});
