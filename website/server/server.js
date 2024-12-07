const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const authenticateToken = require('./middleware/auth');
const updateUserStreak = require('./middleware/updateUserStreak');
const fs = require('fs');
const path = require('path');
const sanitizeInput = require('./middleware/sanitizeInput');
require('dotenv').config();

// Initialize app
const app = express();
const PORT = process.env.PORT || 5000;

// Enable trust proxy
app.set('trust proxy', 1); // Trust the first proxy


// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Security headers
app.use(helmet());
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
    objectSrc: ["'none'"],
    upgradeInsecureRequests: [],
  },
}));

// Rate limiting to prevent brute force attacks
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Disable 'X-Powered-By' header
app.disable('x-powered-by');

// Input sanitization


// Middleware for parsing JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware for authentication and streak updates
app.use(authenticateToken);
app.use(updateUserStreak);
app.use(sanitizeInput);
// Import routes
const authRoutes = require('./routes/auth.routes');
const courseRoutes = require('./routes/course.routes');
const lessonRoutes = require('./routes/lesson.routes');
const sectionRoutes = require('./routes/section.routes');
const studentRoutes = require('./routes/student.routes');
const subscriptionRoutes = require('./routes/subscription.routes');
const feedbackRoutes = require('./routes/feedback.routes');
const activityRoutes = require('./routes/activity.routes');
const codeExecutionRoutes = require('./routes/codeExecution.routes');
const uploadRoutes = require('./routes/upload.routes');

const supportRoutes = require('./routes/support.routes'); // Import support routes

// Use routes
app.use('/api', authRoutes);
app.use('/api', courseRoutes);
app.use('/api', lessonRoutes);
app.use('/api', sectionRoutes);
app.use('/api', studentRoutes);
app.use('/api', subscriptionRoutes);
app.use('/api', feedbackRoutes);
app.use('/api', activityRoutes);
app.use('/api', codeExecutionRoutes);
app.use('/api', uploadRoutes);
app.use('/api', supportRoutes);

// Health check route
app.get('/api/health', async (req, res) => {
  try {
    const {rows} = await db.query('SELECT NOW()');
    res.status(200).json({
      status: 'OK',
      database: 'Connected',
      timestamp: rows[0].now,
    });
  } catch (err) {
    console.error('Health check error:', err.message);
    res.status(500).json({
      status: 'ERROR',
      database: 'Disconnected',
      timestamp: new Date().toISOString(),
    });
  }
});

// Block cloud metadata access
app.use((req, res, next) => {
  if (req.path.startsWith('/latest/meta-data')) {
    return res.status(403).send('Access Denied');
  }
  next();
});

// Add additional security headers
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY'); // Prevent clickjacking
  res.setHeader('X-Content-Type-Options', 'nosniff'); // Prevent MIME-type sniffing
  next();
});

// Error handling middleware
app.use((err, req, res, next) => {
  const statusCode = err.status || 500;
  console.error(`[${new Date().toISOString()}] Error:`, err.message);
  res.status(statusCode).json({
    error: err.message || 'Internal Server Error',
  });
});

// Database connection
const db = require('./config/database');
db.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection error:', err);
    process.exit(1);
  } else {
    console.log('Database connected:', res.rows[0]);
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  }
});

// Log all registered routes for debugging
app._router.stack.forEach((middleware) => {
  if (middleware.route) {
    console.log('Route:', middleware.route.path, 'Methods:', middleware.route.methods);
  }
});





