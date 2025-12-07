// backend/server.js
// Load environment variables first 
import dotenv from 'dotenv';
dotenv.config();

// Core dependencies
import express from 'express';
import cors from 'cors';

// DB and routes
import { connectDB } from './config/db.js';
import adminRoutes from './routes/admin.js';
import userRoutes from './routes/user.js';

// Initialize Express
const app = express();

// Connect to DB
connectDB();

// Middleware
app.use(express.json());

// If admin-panel is served from a different port (e.g. 5501), enable CORS like this:
app.use(cors({
  origin: ['http://localhost:5501', 'http://127.0.0.1:5501'],
  credentials: true
}));
// If you serve everything from one origin, the above can be simplified to: app.use(cors())

// Routes
app.use('/api/admin', adminRoutes);
app.use('/api', userRoutes); // register route AFTER app is initialized

// Health check route (optional)
app.get('/', (req, res) => {
  res.send('Lavitúr Admin Backend is running');
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Lavitúr backend running on port ${PORT}`);
});
