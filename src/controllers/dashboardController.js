// dashboardController.js
const pool = require('../config/db');

/**
 * Get dashboard summary stats (Admin only)
 * GET /api/v1/dashboard/summary
 */
const getSummary = async (req, res, next) => {
  try {
    // Query 1: Total Orders Count
    const totalOrdersRes = await pool.query('SELECT COUNT(*) FROM orders');
    const totalOrders = parseInt(totalOrdersRes.rows[0].count, 10);

    // Query 2: Total Revenue Sum
    const totalRevenueRes = await pool.query('SELECT COALESCE(SUM(total_amount), 0) AS revenue FROM orders');
    const totalRevenue = parseFloat(totalRevenueRes.rows[0].revenue);

    // Query 3: Recent 5 Orders
    const recentOrdersRes = await pool.query(
      `SELECT o.id, o.total_amount, o.payment_method, o.status, o.created_at,
              u.name AS customer_name, u.email AS customer_email
       FROM orders o
       JOIN users u ON o.user_id = u.id
       ORDER BY o.created_at DESC
       LIMIT 5`
    );
    const recentOrders = recentOrdersRes.rows;

    const unavailableRes = await pool.query(
      'SELECT COUNT(*) AS unavailable_count FROM menu_items WHERE is_available = false'
    );
    const unavailableCount = parseInt(unavailableRes.rows[0].unavailable_count, 10);

    return res.status(200).json({
      totalOrders,
      totalRevenue,
      recentOrders,
      unavailableCount,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSummary,
};
