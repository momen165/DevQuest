// website/server/middleware/auth.js

const jwt = require('jsonwebtoken');
require('dotenv').config();

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {

    req.user = null;
    return next();
  }


  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      console.error('Token verification failed:', err.message);
      return res.status(403).json({ error: 'Invalid token' });
    }

    req.user = { ...user, user_id: user.userId || user.user_id };


    next();
  });
};

module.exports = authenticateToken;