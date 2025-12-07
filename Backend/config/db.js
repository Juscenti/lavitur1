// backend/config/db.js
import mongoose from 'mongoose';

export async function connectDB() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.warn('⚠️ No MONGO_URI set. Skipping Mongo connection.');
    return;
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000, // fail fast in dev
    });
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    // IMPORTANT: do NOT throw — let the app keep running for admin login
    // throw err; // ← leave this OUT on purpose
  }
}
