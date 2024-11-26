const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const fs = require('fs');
const path = require('path');

require('dotenv').config();



// Initialize app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';
app.use(cors({
  origin: corsOrigin,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
}));
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Import routes

const authRoutes = require('./routes/auth.routes');
const courseRoutes = require('./routes/course.routes');
const lessonRoutes = require('./routes/lesson.routes');
const sectionRoutes = require('./routes/section.routes');
const studentRoutes = require('./routes/student.routes');
const subscriptionRoutes  = require('./routes/subscription.routes');
const feedbackRoutes  = require('./routes/feedback.routes');
const activityRoutes = require('./routes/activity.routes');
const codeExecutionRoutes = require('./routes/codeExecution.routes');
const uploadRoutes = require('./routes/upload.routes');

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

// server.js

// Mount routes



app.get('/api/health', async (req, res) => {
  try {
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Database timeout')), 3000));
    const queryPromise = db.query('SELECT NOW()');

    const { rows } = await Promise.race([timeoutPromise, queryPromise]);

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


app._router.stack.forEach((middleware) => {
  if (middleware.route) {
    console.log('Route:', middleware.route.path, 'Methods:', middleware.route.methods);
  }
});

