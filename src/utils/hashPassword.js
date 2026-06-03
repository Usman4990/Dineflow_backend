// hashPassword.js
const bcrypt = require('bcryptjs');

/**
 * Hash a plain text password using bcrypt
 * @param {string} plainPassword 
 * @returns {Promise<string>} hashed password
 */
const hashPassword = async (plainPassword) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(plainPassword, salt);
};

/**
 * Compare a plain text password with a hashed password
 * @param {string} plainPassword 
 * @param {string} hashedPassword 
 * @returns {Promise<boolean>} match status
 */
const comparePassword = async (plainPassword, hashedPassword) => {
  return await bcrypt.compare(plainPassword, hashedPassword);
};

module.exports = {
  hashPassword,
  comparePassword,
};
