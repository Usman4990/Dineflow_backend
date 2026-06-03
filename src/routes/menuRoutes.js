// menuRoutes.js
const express = require('express');
const router = express.Router();
const { getMenu, addMenuItem, updateMenuItem, deleteMenuItem, updateAvailability } = require('../controllers/menuController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// Menu endpoints
// React menu screens call menuService, which issues requests here.
// Controller routes handle public menu listing and admin menu CRUD operations.
router.get('/', getMenu);

// Admin-only CRUD routes
router.post('/', protect, adminOnly, addMenuItem);
router.put('/:id', protect, adminOnly, updateMenuItem);
router.put('/:id/availability', protect, adminOnly, updateAvailability);
router.delete('/:id', protect, adminOnly, deleteMenuItem);

module.exports = router;
