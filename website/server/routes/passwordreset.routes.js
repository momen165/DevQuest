// passwordReset.routes.js
const express = require('express');
const { sendPasswordResetEmail,resetPassword } = require('../controllers/passwordreset.controller');

const router = express.Router();

router.post('/password-reset', sendPasswordResetEmail);
router.post('/reset-password', resetPassword);
module.exports = router;