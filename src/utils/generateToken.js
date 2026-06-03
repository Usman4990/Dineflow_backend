// generateToken.js
const jwt = require('jsonwebtoken');
require('dotenv').config();

/**
 * Generate a signed JWT token
 * @param {object} payload - { id, email, role }
 * @returns {string} Signed JWT Token
 */
const generateToken = (payload) => {
  const secret = process.env.JWT_SECRET || 'dineflow_secret_key_987654321';
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  
  return jwt.sign(payload, secret, { expiresIn });
};

module.exports = generateToken;
