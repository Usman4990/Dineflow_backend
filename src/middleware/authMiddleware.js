// authMiddleware.js
const jwt = require('jsonwebtoken');
require('dotenv').config();

/**
 * Middleware to protect routes and verify JWT tokens
 */
const protect = async (req, res, next) => {
  let token;

  // Check Authorization header for Bearer token
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dineflow_secret_key_987654321');

      // Attach user payload to request object
      req.user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
      };

      return next();
    } catch (error) {
      console.error('Token verification error:', error.message);
      return res.status(401).json({ message: 'Not authorized, token failed.' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token provided.' });
  }
};

/**
 * Middleware to restrict access to admins only
 */
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({ message: 'Access forbidden. Admin authorization required.' });
};

module.exports = {
  protect,
  adminOnly,
};
