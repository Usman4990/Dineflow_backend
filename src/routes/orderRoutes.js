// orderRoutes.js
const express = require('express');
const router = express.Router();
const { placeOrder, getMyOrders, getAllOrders, updateOrderStatus, cancelOrder } = require('../controllers/orderController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// Order endpoints
// Customer flow: UI -> hook/service -> POST /orders, GET /orders/my, PUT /orders/:id/cancel
// Admin flow: UI -> hook/service -> GET /orders, PUT /orders/:id/status
// Authorization middleware protects routes and enforces admin-only access where required.

// Customer routes (require authentication)
router.post('/', protect, placeOrder);
router.get('/my', protect, getMyOrders);
router.put('/:id/cancel', protect, cancelOrder);

// Admin-only order management routes
router.get('/', protect, adminOnly, getAllOrders);
router.put('/:id/status', protect, adminOnly, updateOrderStatus);

module.exports = router;
