const express = require('express');
const router = express.Router();
const { submitFeedback, getOrderFeedback, getMenuFeedback } = require('../controllers/feedbackController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, submitFeedback);
router.get('/order/:orderId', protect, getOrderFeedback);
router.get('/menu/:menuItemId', protect, getMenuFeedback);

module.exports = router;
