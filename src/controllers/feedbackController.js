const pool = require('../config/db');

/**
 * Submit feedback for a completed order.
 * POST /api/v1/feedback
 */
const submitFeedback = async (req, res, next) => {
  const { order_id, rating, comment } = req.body;
  const userId = req.user.id;

  if (!order_id || !rating) {
    return res.status(400).json({ message: 'Order ID and rating are required.' });
  }

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ message: 'Rating must be an integer between 1 and 5.' });
  }

  try {
    const orderRes = await pool.query('SELECT user_id, status FROM orders WHERE id = $1', [order_id]);
    if (orderRes.rows.length === 0) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    const order = orderRes.rows[0];
    if (order.user_id !== userId) {
      return res.status(403).json({ message: 'You can only submit feedback for your own orders.' });
    }

    if (order.status !== 'Completed') {
      return res.status(400).json({ message: 'Feedback can only be submitted for completed orders.' });
    }

    const existingFeedbackRes = await pool.query(
      'SELECT id FROM feedback WHERE order_id = $1 AND user_id = $2',
      [order_id, userId]
    );

    if (existingFeedbackRes.rows.length > 0) {
      return res.status(400).json({ message: 'Feedback has already been submitted for this order.' });
    }

    const result = await pool.query(
      'INSERT INTO feedback (user_id, order_id, rating, comment) VALUES ($1, $2, $3, $4) RETURNING *',
      [userId, order_id, rating, comment || null]
    );

    return res.status(201).json({
      message: 'Feedback submitted successfully.',
      feedback: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get feedback for a specific order.
 * GET /api/v1/feedback/order/:orderId
 */
const getOrderFeedback = async (req, res, next) => {
  const { orderId } = req.params;

  try {
    const result = await pool.query(
      `SELECT f.id, f.rating, f.comment, f.created_at, u.name AS user_name
       FROM feedback f
       JOIN users u ON f.user_id = u.id
       WHERE f.order_id = $1
       ORDER BY f.created_at DESC`,
      [orderId]
    );

    return res.status(200).json(result.rows);
  } catch (error) {
    next(error);
  }
};

/**
 * Get feedback summary for a menu item.
 * GET /api/v1/feedback/menu/:menuItemId
 */
const getMenuFeedback = async (req, res, next) => {
  const { menuItemId } = req.params;

  try {
    const summaryRes = await pool.query(
      `SELECT COUNT(*) AS total_feedback, COALESCE(AVG(f.rating), 0) AS average_rating
       FROM feedback f
       JOIN order_items oi ON oi.order_id = f.order_id
       WHERE oi.menu_item_id = $1`,
      [menuItemId]
    );

    const feedbackRes = await pool.query(
      `SELECT f.id, f.rating, f.comment, f.created_at, u.name AS user_name
       FROM feedback f
       JOIN users u ON f.user_id = u.id
       JOIN order_items oi ON oi.order_id = f.order_id
       WHERE oi.menu_item_id = $1
       ORDER BY f.created_at DESC`,
      [menuItemId]
    );

    return res.status(200).json({
      totalFeedback: parseInt(summaryRes.rows[0].total_feedback, 10),
      averageRating: parseFloat(summaryRes.rows[0].average_rating),
      items: feedbackRes.rows,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  submitFeedback,
  getOrderFeedback,
  getMenuFeedback,
};
