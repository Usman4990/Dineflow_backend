// errorHandler.js

/**
 * Global Error Handler Middleware
 */
const errorHandler = (err, req, res, next) => {
  console.error('Unhandled Server Error:', err.stack || err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    message: message,
    // Only return stack trace in development
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
};

module.exports = errorHandler;
