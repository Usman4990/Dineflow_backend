// authRoutes.js
const express = require('express');
const router = express.Router();
const { signup, login } = require('../controllers/authController');

// Auth routes
// React auth pages call authService, which issues requests to these endpoints.
// The controller handles validation, password hashing, JWT creation, and user persistence.
// POST /api/v1/auth/signup -> create new customer profile and optionally save phone for SMS updates.
// POST /api/v1/auth/login -> validate credentials and return JWT + user metadata.
router.post('/signup', signup);
router.post('/login', login);

module.exports = router;
