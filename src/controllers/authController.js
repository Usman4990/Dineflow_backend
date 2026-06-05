// authController.js
const pool = require('../config/db');
const { hashPassword, comparePassword } = require('../utils/hashPassword');
const generateToken = require('../utils/generateToken');
const { sendWelcomeEmail, sendOtpEmail } = require('../utils/notificationService');

/**
 * Register a new user
 * POST /api/v1/auth/signup
 */
const signup = async (req, res, next) => {
  const { name, email, password, address, city, latitude, longitude, phone } = req.body;

  // Simple validation
  if (!name || !email || !password || !address || !city) {
    return res.status(400).json({ message: 'Please provide name, email, password, address, and city.' });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const normalizedAddress = address.trim();
  const normalizedCity = city.trim();
  const normalizedPhone = phone ? phone.trim() : null;
  const latitudeValue = latitude !== undefined && latitude !== null && latitude !== '' ? Number(latitude) : null;
  const longitudeValue = longitude !== undefined && longitude !== null && longitude !== '' ? Number(longitude) : null;

  if (latitude !== undefined && latitude !== null && latitude !== '' && Number.isNaN(latitudeValue)) {
    return res.status(400).json({ message: 'Latitude must be a valid number.' });
  }

  if (longitude !== undefined && longitude !== null && longitude !== '' && Number.isNaN(longitudeValue)) {
    return res.status(400).json({ message: 'Longitude must be a valid number.' });
  }

  try {
    // Check if email already exists
    const emailCheck = await pool.query('SELECT * FROM users WHERE email = $1', [normalizedEmail]);
    if (emailCheck.rows.length > 0) {
      return res.status(409).json({ message: 'User with this email already exists.' });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Insert user (default role is 'customer')
    const newUser = await pool.query(
      'INSERT INTO users (name, email, password_hash, role, address, city, latitude, longitude, phone) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id, name, email, role, address, city, latitude, longitude, phone, created_at',
      [name.trim(), normalizedEmail, hashedPassword, 'customer', normalizedAddress, normalizedCity, latitudeValue, longitudeValue, normalizedPhone]
    );

    try {
      await sendWelcomeEmail({
        to: newUser.rows[0].email,
        name: newUser.rows[0].name,
        userId: newUser.rows[0].id,
      });
    } catch (emailError) {
      console.error('Welcome email failed:', emailError.message || emailError);
    }

    return res.status(201).json({
      message: 'User registered successfully.',
      user: newUser.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Log in an existing user - Step 1: Credentials Check & OTP Generation
 * POST /api/v1/auth/login
 */
const login = async (req, res, next) => {
  const { email, password } = req.body;

  // Simple validation
  if (!email || !password) {
    return res.status(400).json({ message: 'Please provide email and password.' });
  }

  try {
    const normalizedEmail = email.toLowerCase().trim();

    // Select user by email
    const userQuery = await pool.query('SELECT * FROM users WHERE email = $1', [normalizedEmail]);
    if (userQuery.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const user = userQuery.rows[0];

    // Compare passwords
    const isMatch = await comparePassword(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Credentials valid, now generate random 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    // Delete previous OTPs for the same email
    await pool.query('DELETE FROM email_otps WHERE email = $1', [normalizedEmail]);

    // Save OTP to email_otps table (attempts defaults to 0)
    await pool.query(
      'INSERT INTO email_otps (email, otp, expires_at) VALUES ($1, $2, $3)',
      [normalizedEmail, otp, expiresAt]
    );

    // Send OTP to user's email using SendGrid
    try {
      await sendOtpEmail({
        to: normalizedEmail,
        otp,
        expiresInMinutes: 10,
      });
    } catch (emailError) {
      console.error('OTP sending failed:', emailError.message || emailError);
      return res.status(500).json({ message: 'Failed to send verification email. Please try again.' });
    }

    return res.status(200).json({
      success: true,
      otpRequired: true,
      email: normalizedEmail,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify OTP and generate JWT Token
 * POST /api/v1/auth/verify-otp
 */
const verifyOtp = async (req, res, next) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ message: 'Please provide email and OTP.' });
  }

  try {
    const normalizedEmail = email.toLowerCase().trim();

    // Select the latest OTP record
    const otpQuery = await pool.query(
      'SELECT * FROM email_otps WHERE email = $1 ORDER BY created_at DESC LIMIT 1',
      [normalizedEmail]
    );

    if (otpQuery.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    const otpRecord = otpQuery.rows[0];

    // Check attempts limit (max 5)
    if (otpRecord.attempts >= 5) {
      await pool.query('DELETE FROM email_otps WHERE email = $1', [normalizedEmail]);
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    // Check expiry
    const now = new Date();
    if (new Date(otpRecord.expires_at) < now) {
      return res.status(400).json({ message: 'OTP Expired' });
    }

    // Check OTP value
    if (otpRecord.otp !== otp.trim()) {
      const newAttempts = otpRecord.attempts + 1;
      
      if (newAttempts >= 5) {
        // Exceeded max attempts, delete OTP record immediately
        await pool.query('DELETE FROM email_otps WHERE email = $1', [normalizedEmail]);
      } else {
        // Increment attempt count
        await pool.query('UPDATE email_otps SET attempts = $1 WHERE id = $2', [newAttempts, otpRecord.id]);
      }
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    // OTP is valid! Retrieve user details
    const userQuery = await pool.query('SELECT * FROM users WHERE email = $1', [normalizedEmail]);
    if (userQuery.rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const user = userQuery.rows[0];

    // Generate JWT token
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    // Delete OTP record since it's verified (one-time use)
    await pool.query('DELETE FROM email_otps WHERE email = $1', [normalizedEmail]);

    return res.status(200).json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        address: user.address,
        city: user.city,
        latitude: user.latitude,
        longitude: user.longitude,
        phone: user.phone,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Resend OTP to user's email
 * POST /api/v1/auth/resend-otp
 */
const resendOtp = async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Please provide email.' });
  }

  try {
    const normalizedEmail = email.toLowerCase().trim();

    // Verify user exists
    const userQuery = await pool.query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
    if (userQuery.rows.length === 0) {
      return res.status(404).json({ message: 'User with this email does not exist.' });
    }

    // Rate limiting: Max 1 resend per 60 seconds
    const existingOtpQuery = await pool.query(
      'SELECT created_at FROM email_otps WHERE email = $1 ORDER BY created_at DESC LIMIT 1',
      [normalizedEmail]
    );

    if (existingOtpQuery.rows.length > 0) {
      const lastCreatedAt = new Date(existingOtpQuery.rows[0].created_at);
      const now = new Date();
      const elapsedSeconds = Math.floor((now - lastCreatedAt) / 1000);

      if (elapsedSeconds < 60) {
        const secondsRemaining = 60 - elapsedSeconds;
        return res.status(429).json({
          message: `Rate limit exceeded. Please wait ${secondsRemaining} seconds before requesting a new OTP.`
        });
      }
    }

    // Generate new OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    // Delete previous OTP
    await pool.query('DELETE FROM email_otps WHERE email = $1', [normalizedEmail]);

    // Save new OTP
    await pool.query(
      'INSERT INTO email_otps (email, otp, expires_at) VALUES ($1, $2, $3)',
      [normalizedEmail, otp, expiresAt]
    );

    // Email new OTP
    try {
      await sendOtpEmail({
        to: normalizedEmail,
        otp,
        expiresInMinutes: 10,
      });
    } catch (emailError) {
      console.error('OTP sending failed during resend:', emailError.message || emailError);
      return res.status(500).json({ message: 'Failed to send verification email. Please try again.' });
    }

    return res.status(200).json({
      success: true,
      message: 'OTP resent successfully.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  signup,
  login,
  verifyOtp,
  resendOtp,
};
