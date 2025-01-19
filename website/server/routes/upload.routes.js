// routes/upload.routes.js
const express = require('express');
const router = express.Router();
const { testRoute, uploadFile,uploadProfilePic,removeProfilePic,uploadEditorImage } = require('../controllers/upload.controller');
const authenticateToken = require('../middleware/auth');    
// Define routes
router.get('/test', testRoute);
router.post('/upload', uploadFile);
router.post('/uploadProfilePic', authenticateToken, uploadProfilePic);
router.delete('/removeProfilePic', authenticateToken, removeProfilePic);

// Add new route for editor uploads
router.post('/editor', authenticateToken, uploadEditorImage);

module.exports = router;    