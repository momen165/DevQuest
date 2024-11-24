// routes/upload.routes.js
const express = require('express');
const router = express.Router();
const { testRoute, uploadFile } = require('../controllers/upload.controller');

// Define routes
router.get('/test', testRoute);
router.post('/upload', uploadFile);

module.exports = router;