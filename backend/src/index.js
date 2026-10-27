require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');

const healthRoute = require('./routes/health');
const scenariosRoute = require('./routes/scenarios');
const runsRoute = require('./routes/runs');
const authRoute = require('./routes/auth');

const app = express();

// CORS — in production only the deployed frontend origin is allowed;
// in development also allow local Vite dev server ports.
const isProduction = process.env.NODE_ENV === 'production';

const allowedOrigins = [
  process.env.FRONTEND_URL, // e.g. https://outagelab.vercel.app
  ...(!isProduction ? ['http://localhost:5173', 'http://localhost:4173'] : []),
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow server-to-server requests (no Origin header) and listed origins
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/api/health', healthRoute);
app.use('/api/scenarios', scenariosRoute);
app.use('/api/runs', runsRoute);
app.use('/api/auth', authRoute);

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ success: false, message: err.message || 'Internal server error' });
});

// Validate required environment variables
if (!process.env.MONGODB_URI) {
  console.error('❌ Configuration error: MONGODB_URI environment variable is required.');
  process.exit(1);
}

if (!process.env.JWT_SECRET) {
  console.error('❌ Configuration error: JWT_SECRET environment variable is required.');
  process.exit(1);
}

// Database connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    const host = mongoose.connection.host || 'remote cluster';
    console.log(`✅ Connected to MongoDB Atlas [database: ${mongoose.connection.name}] at ${host}`);
    if (process.env.NODE_ENV !== 'test') {
      const PORT = process.env.PORT || 5000;
      app.listen(PORT, () => {
        console.log(`🚀 OutageLab API running on http://localhost:${PORT}`);
      });
    }
  })
  .catch((err) => {
    console.error('❌ MongoDB connection failed:', err.message);
    console.error('   Check that MONGODB_URI is valid and Atlas network IP access allows your current IP.');
    process.exit(1);
  });

module.exports = app;
