// authController.js
const pool = require('../config/db');
const { hashPassword, comparePassword } = require('../utils/hashPassword');
const generateToken = require('../utils/generateToken');
const { sendWelcomeEmail } = require('../utils/notificationService');

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
 * Log in an existing user
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

    // Generate JWT token
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    return res.status(200).json({
      message: 'Login successful.',
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

module.exports = {
  signup,
  login,
};
