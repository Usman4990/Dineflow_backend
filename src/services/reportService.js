// reportService.js
const pool = require('../config/db');

/**
 * Generates an aggregated summary report for Admin overview.
 * Returns: Total Orders, Total Revenue, Total Customers, Completed Orders, Cancelled Orders,
 * Pending Orders, Top Selling Menu Items, Revenue By Day (Last 7 Days), Revenue By Month,
 * Most Ordered Categories.
 */
const getAdminReportSummary = async () => {
  // 1. Total Orders
  const totalOrdersRes = await pool.query('SELECT COUNT(*) AS count FROM orders');
  
  // 2. Total Revenue (from completed orders only for true revenue, or all orders)
  const totalRevenueRes = await pool.query(
    "SELECT COALESCE(SUM(total_amount), 0) AS sum FROM orders WHERE status = 'Completed'"
  );

  // 3. Total Customers (registered customers)
  const totalCustomersRes = await pool.query(
    "SELECT COUNT(*) AS count FROM users WHERE role = 'customer'"
  );

  // 4. Completed Orders
  const completedOrdersRes = await pool.query(
    "SELECT COUNT(*) AS count FROM orders WHERE status = 'Completed'"
  );

  // 5. Cancelled Orders
  const cancelledOrdersRes = await pool.query(
    "SELECT COUNT(*) AS count FROM orders WHERE status = 'Cancelled'"
  );

  // 6. Pending Orders
  const pendingOrdersRes = await pool.query(
    "SELECT COUNT(*) AS count FROM orders WHERE status = 'Pending'"
  );

  // 7. Top Selling Menu Items (based on quantity sold)
  const topSellingItemsRes = await pool.query(
    `SELECT mi.id, mi.name, mi.category, SUM(oi.quantity)::integer AS quantity_sold,
            COALESCE(SUM(oi.quantity * oi.unit_price), 0)::double precision AS revenue_generated
     FROM order_items oi
     JOIN menu_items mi ON oi.menu_item_id = mi.id
     JOIN orders o ON oi.order_id = o.id
     WHERE o.status = 'Completed'
     GROUP BY mi.id, mi.name, mi.category
     ORDER BY quantity_sold DESC
     LIMIT 5`
  );

  // 8. Revenue By Day (Last 7 Days, using generate_series to guarantee empty days have 0)
  const dailyRevenueRes = await pool.query(
    `SELECT to_char(d.date, 'YYYY-MM-DD') AS date,
            COALESCE(SUM(o.total_amount), 0)::double precision AS revenue,
            COUNT(o.id)::integer AS order_count
     FROM generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day') AS d(date)
     LEFT JOIN orders o ON o.created_at::date = d.date AND o.status = 'Completed'
     GROUP BY d.date
     ORDER BY d.date ASC`
  );

  // 9. Revenue By Month
  const monthlyRevenueRes = await pool.query(
    `SELECT to_char(date_trunc('month', o.created_at), 'YYYY-MM') AS month,
            COALESCE(SUM(o.total_amount), 0)::double precision AS revenue,
            COUNT(o.id)::integer AS order_count
     FROM orders o
     WHERE o.status = 'Completed'
     GROUP BY date_trunc('month', o.created_at)
     ORDER BY date_trunc('month', o.created_at) ASC`
  );

  // 10. Most Ordered Categories
  const topCategoriesRes = await pool.query(
    `SELECT mi.category, SUM(oi.quantity)::integer AS quantity_sold,
            COALESCE(SUM(oi.quantity * oi.unit_price), 0)::double precision AS revenue
     FROM order_items oi
     JOIN menu_items mi ON oi.menu_item_id = mi.id
     JOIN orders o ON oi.order_id = o.id
     WHERE o.status = 'Completed'
     GROUP BY mi.category
     ORDER BY quantity_sold DESC`
  );

  return {
    totalOrders: parseInt(totalOrdersRes.rows[0].count, 10),
    totalRevenue: parseFloat(totalRevenueRes.rows[0].sum),
    totalCustomers: parseInt(totalCustomersRes.rows[0].count, 10),
    completedOrders: parseInt(completedOrdersRes.rows[0].count, 10),
    cancelledOrders: parseInt(cancelledOrdersRes.rows[0].count, 10),
    pendingOrders: parseInt(pendingOrdersRes.rows[0].count, 10),
    topSellingItems: topSellingItemsRes.rows,
    dailyRevenue: dailyRevenueRes.rows,
    monthlyRevenue: monthlyRevenueRes.rows,
    topCategories: topCategoriesRes.rows,
  };
};

module.exports = {
  getAdminReportSummary,
};
