const app = require('../server/index.js');
const mongoose = require('mongoose');
const seed = require('../server/seed/seed.js');

let isConnected = false;
let isSeeded = false;

async function connectToDatabase() {
  // Already connected — skip
  if (isConnected && mongoose.connection.readyState >= 1) {
    return;
  }

  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error(' MONGODB_URI environment variable is not set. Please add it in Vercel Project Settings → Environment Variables.');
    return;
  }

  if (mongoose.connection.readyState >= 1) {
    isConnected = true;
    return;
  }

  try {
    console.log(' Connecting to MongoDB Atlas in Vercel serverless function...');
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 8000,
      socketTimeoutMS: 45000,
    });
    isConnected = true;
    console.log(' Connected to MongoDB Atlas successfully in Vercel!');
  } catch (err) {
    isConnected = false;
    console.error(' MongoDB connection error in Vercel:', err.message);
    return;
  }

  if (isConnected && !isSeeded) {
    try {
      await seed();
      isSeeded = true;
    } catch (seedErr) {
      console.error(' Auto-seed error in Vercel:', seedErr.message);
    }
  }
}

module.exports = async (req, res) => {
  await connectToDatabase();
  return app(req, res);
};
