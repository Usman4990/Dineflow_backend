// server.js
const app = require('./app');
require('dotenv').config();

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`=============================================`);
  console.log(` DineFlow Backend Server Started Successfully`);
  console.log(` Running on: http://localhost:${PORT}`);
  console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`=============================================`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.error(`Logged Error: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});
