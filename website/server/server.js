const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const authenticateToken = require('./middleware/auth');
const updateUserStreak = require('./middleware/updateUserStreak');
const fs = require('fs');
const path = require('path');
const sanitizeInput = require('./middleware/sanitizeInput');
const { handleError } = require('./utils/error.utils');
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const bodyParser = require('body-parser');
const { closeExpiredTickets } = require('./controllers/support.controller');


const {handleWebhook} = require("./controllers/payment.controller");
// Initialize app
const app = express();
const PORT = process.env.PORT || 5000;

// Database connection
const db = require('./config/database');
db.query('SELECT NOW()', (err, result) => {
  if (err) {
    console.error('Database connection error:', err);
    process.exit(1);
  } else {
    console.log('Database connected:', result.rows[0]);
  }
});

// Middleware for parsing raw body required by Stripe
/*app.use('/webhook', bodyParser.raw({ type: 'application/json' }));*/

// Webhook endpoint
/*app.post('/webhook', (req, res) => {
  const sig = req.headers['stripe-signature'];
  console.log('Raw body:', req.body.toString()); // Logs the raw payload
  console.log('Stripe Signature:', sig);

  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    console.log(`Received event: ${event.type}`);
    res.status(200).json({ received: true });
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
});*/


// Enable trust proxy
app.set('trust proxy', 1);

// Middleware
app.use(cors({
  origin: ['http://localhost:3000'], // Allow both localhost variations
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Security headers
app.use(helmet());
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'", "https://js.stripe.com"],
    styleSrc: [
      "'self'",
      "'unsafe-inline'",
      "https://fonts.googleapis.com",
      "https://m.stripe.network",
      "https://fonts.gstatic.com"
    ],
    fontSrc: [
      "'self'",
      "https://fonts.gstatic.com",
      "https://fonts.googleapis.com",
      "data:",
      "*"
    ],
    imgSrc: ["'self'", "data:", "https:", "blob:"],
    connectSrc: ["'self'", "https://api.stripe.com", "https://fonts.googleapis.com", "https://fonts.gstatic.com"],
    frameSrc: ["'self'", "https://js.stripe.com"],
    objectSrc: ["'none'"],
    styleSrcElem: [
      "'self'",
      "'unsafe-inline'",
      "https://fonts.googleapis.com",
      "https://m.stripe.network"
    ],
    upgradeInsecureRequests: []
  },
}));

// Rate limiting to prevent brute force attacks
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
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
const supportRoutes = require('./routes/support.routes');
const paymentRoutes = require('./routes/payment.routes');
const adminRoutes = require('./routes/admin.routes');

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
app.use('/api', paymentRoutes);
app.use('/api/admin', adminRoutes);

// Error handling middleware (should be after all routes)
app.use(handleError);

app.get('/api/checkout-session/:sessionId', async (req, res) => {
  const {sessionId} = req.params;
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    res.json(session);
  } catch (error) {
    console.error('Error retrieving checkout session:', error);
    res.status(404).json({error: 'Session not found'});
  }
});

// Health check route
app.get('/api/health', (req, res) => {
  db.query('SELECT NOW()', (err, result) => {
    if (err) {
      console.error('Health check error:', err.message);
      res.status(500).json({
        status: 'ERROR',
        database: 'Disconnected',
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(200).json({
        status: 'OK',
        database: 'Connected',
        timestamp: result.rows[0].now,
      });
    }
  });
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
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
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

// Check for expired tickets every 5 minutes
setInterval(closeExpiredTickets, 5 * 60 * 1000);

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Log all registered routes for debugging
app._router.stack.forEach((middleware) => {
  if (middleware.route) {
    console.log('Route:', middleware.route.path, 'Methods:', middleware.route.methods);
  }
});