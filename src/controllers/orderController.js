// orderController.js
const pool = require('../config/db');
const { sendEmail } = require('../utils/notificationService');
const { sendSms } = require('../utils/smsService');

const formatMoney = (amount) => Number(amount).toFixed(2);

const buildOrderDetailLines = (items) =>
  items
    .map(
      (item) =>
        `- ${item.quantity} x ${item.name || `Menu Item #${item.menu_item_id}`} @ Rs.${formatMoney(item.unit_price)} = Rs.${formatMoney(
          item.quantity * item.unit_price
        )}`
    )
    .join('\n');

const buildOrderText = (orderId, items, totalAmount, paymentMethod, statusMessage) => {
  return `Order Reference: #DF-ORD-${orderId}\n\n${statusMessage}\n\nItems:\n${buildOrderDetailLines(items)}\n\nTotal: $${formatMoney(totalAmount)}\nPayment method: ${paymentMethod}\n\nThank you for choosing DineFlow!`;
};

const notifyOrderPlacement = async (user, orderId, totalAmount, paymentMethod, items) => {
  const subject = `DineFlow Order Confirmation #DF-ORD-${orderId}`;
  const text = buildOrderText(orderId, items, totalAmount, paymentMethod, 'Your order has been placed successfully and is now pending.');
  await sendEmail({ to: user.email, subject, text, orderId, userId: user.id });
  await sendSms({ to: user.phone, body: `Your DineFlow order #DF-ORD-${orderId} is confirmed. Total: $${formatMoney(totalAmount)}.`, orderId, userId: user.id });
};

const notifyOrderStatusChange = async (user, orderId, status) => {
  const subject = `DineFlow Order Update #DF-ORD-${orderId}`;
  const statusText = `Your order status has been updated to ${status}.`;
  const text = `Order Reference: #DF-ORD-${orderId}\n\n${statusText}\n\nThank you for ordering with DineFlow.`;
  await sendEmail({ to: user.email, subject, text, orderId, userId: user.id });
  await sendSms({ to: user.phone, body: `DineFlow order #DF-ORD-${orderId} status: ${status}.`, orderId, userId: user.id });
};

const notifyOrderCancellation = async (user, orderId) => {
  const subject = `DineFlow Order Cancelled #DF-ORD-${orderId}`;
  const text = `Order Reference: #DF-ORD-${orderId}\n\nYour order has been canceled successfully. If you have any questions, please contact support.\n\nThank you for using DineFlow.`;
  await sendEmail({ to: user.email, subject, text, orderId, userId: user.id });
  await sendSms({ to: user.phone, body: `Your DineFlow order #DF-ORD-${orderId} has been cancelled.`, orderId, userId: user.id });
};

/**
 * Place a new order
 * POST /api/v1/orders
 */
const placeOrder = async (req, res, next) => {
  const { items, payment_method, delivery_address, delivery_city, delivery_latitude, delivery_longitude } = req.body;
  const userId = req.user.id;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'Cart items are required to place an order.' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const userRes = await client.query(
      'SELECT name, email, phone, address, city, latitude, longitude FROM users WHERE id = $1',
      [userId]
    );
    if (userRes.rows.length === 0) {
      throw new Error('Authenticated user not found.');
    }
    const currentUser = userRes.rows[0];

    const deliveryAddress = delivery_address ? delivery_address.trim() : currentUser.address;
    const deliveryCity = delivery_city ? delivery_city.trim() : currentUser.city;
    const deliveryLatitude = delivery_latitude !== undefined && delivery_latitude !== null && delivery_latitude !== ''
      ? Number(delivery_latitude)
      : currentUser.latitude;
    const deliveryLongitude = delivery_longitude !== undefined && delivery_longitude !== null && delivery_longitude !== ''
      ? Number(delivery_longitude)
      : currentUser.longitude;

    if (!deliveryAddress || !deliveryCity) {
      return res.status(400).json({ message: 'Delivery address and city are required.' });
    }

    if (delivery_latitude !== undefined && delivery_latitude !== null && delivery_latitude !== '' && Number.isNaN(Number(delivery_latitude))) {
      return res.status(400).json({ message: 'Delivery latitude must be a valid number.' });
    }

    if (delivery_longitude !== undefined && delivery_longitude !== null && delivery_longitude !== '' && Number.isNaN(Number(delivery_longitude))) {
      return res.status(400).json({ message: 'Delivery longitude must be a valid number.' });
    }

    let totalAmount = 0;
    const orderItemsToInsert = [];
    const itemIds = items.map((item) => item.id || item.menu_item_id);
    const menuItemsRes = await client.query(
      'SELECT id, price, is_available, name FROM menu_items WHERE id = ANY($1)',
      [itemIds]
    );

    const menuItemsById = menuItemsRes.rows.reduce((acc, menuItem) => {
      acc[menuItem.id] = menuItem;
      return acc;
    }, {});

    for (const item of items) {
      const menuItemId = item.id || item.menu_item_id;
      const menuItem = menuItemsById[menuItemId];

      if (!menuItem) {
        throw new Error(`Menu item with ID ${menuItemId} not found.`);
      }

      const itemQuantity = parseInt(item.quantity, 10);
      if (!menuItem.is_available) {
        throw new Error(`This item is currently unavailable.`);
      }

      if (itemQuantity <= 0) {
        throw new Error(`Invalid quantity for '${menuItem.name}'.`);
      }

      const itemPrice = parseFloat(menuItem.price);
      totalAmount += itemPrice * itemQuantity;

      orderItemsToInsert.push({
        menu_item_id: menuItemId,
        name: menuItem.name,
        quantity: itemQuantity,
        unit_price: itemPrice,
      });
    }

    const payMethod = payment_method || 'Cash';

    const orderRes = await client.query(
      'INSERT INTO orders (user_id, total_amount, payment_method, status, delivery_address, delivery_city, delivery_latitude, delivery_longitude) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, total_amount, payment_method, status, delivery_address, delivery_city, delivery_latitude, delivery_longitude, created_at',
      [userId, totalAmount, payMethod, 'Pending', deliveryAddress, deliveryCity, deliveryLatitude, deliveryLongitude]
    );

    const orderId = orderRes.rows[0].id;

    for (const orderItem of orderItemsToInsert) {
      await client.query(
        'INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price) VALUES ($1, $2, $3, $4)',
        [orderId, orderItem.menu_item_id, orderItem.quantity, orderItem.unit_price]
      );
    }

    await client.query('COMMIT');

    try {
      await notifyOrderPlacement(currentUser, orderId, totalAmount, payMethod, orderItemsToInsert);
    } catch (notifyError) {
      console.error('Order notification failed:', notifyError.message);
    }

    return res.status(201).json({
      message: 'Order placed successfully.',
      order_id: orderId,
      total_amount: totalAmount,
      order: orderRes.rows[0],
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Order placement transaction failed:', error.message);
    return res.status(400).json({ message: error.message || 'Failed to place order.' });
  } finally {
    client.release();
  }
};

/**
 * Get logged-in customer's order history
 * GET /api/v1/orders/my
 */
const getMyOrders = async (req, res, next) => {
  const userId = req.user.id;

  try {
    const result = await pool.query(
      `SELECT o.id, o.total_amount, o.payment_method, o.status, o.created_at,
              o.delivery_address, o.delivery_city, o.delivery_latitude, o.delivery_longitude,
              json_agg(
                json_build_object(
                  'id', oi.id,
                  'menu_item_id', oi.menu_item_id,
                  'name', mi.name,
                  'quantity', oi.quantity,
                  'unit_price', oi.unit_price,
                  'image_url', mi.image_url
                )
              ) AS items,
              (SELECT json_agg(json_build_object(
                    'id', f.id,
                    'rating', f.rating,
                    'comment', f.comment,
                    'created_at', f.created_at
                  ))
               FROM feedback f
               WHERE f.order_id = o.id
              ) AS feedback
       FROM orders o
       LEFT JOIN order_items oi ON o.id = oi.order_id
       LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
       WHERE o.user_id = $1
       GROUP BY o.id
       ORDER BY o.created_at DESC`,
      [userId]
    );

    return res.status(200).json(result.rows);
  } catch (error) {
    next(error);
  }
};

/**
 * Get all customer orders (Admin only)
 * GET /api/v1/orders
 */
const getAllOrders = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT o.id, o.user_id, o.total_amount, o.payment_method, o.status, o.created_at,
              o.delivery_address, o.delivery_city, o.delivery_latitude, o.delivery_longitude,
              u.name AS customer_name, u.email AS customer_email, u.phone AS customer_phone,
              json_agg(
                json_build_object(
                  'id', oi.id,
                  'menu_item_id', oi.menu_item_id,
                  'name', mi.name,
                  'quantity', oi.quantity,
                  'unit_price', oi.unit_price,
                  'image_url', mi.image_url
                )
              ) AS items
       FROM orders o
       JOIN users u ON o.user_id = u.id
       LEFT JOIN order_items oi ON o.id = oi.order_id
       LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
       GROUP BY o.id, u.name, u.email, u.phone
       ORDER BY o.created_at DESC`
    );

    return res.status(200).json(result.rows);
  } catch (error) {
    next(error);
  }
};

/**
 * Update order status (Admin only)
 * PUT /api/v1/orders/:id/status
 */
const updateOrderStatus = async (req, res, next) => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ['Pending', 'Preparing', 'Completed'];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ message: 'Invalid status. Must be one of: Pending, Preparing, Completed' });
  }

  try {
    const result = await pool.query(
      'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    const updatedOrder = result.rows[0];
    const userRes = await pool.query('SELECT name, email, phone FROM users WHERE id = $1', [updatedOrder.user_id]);
    if (userRes.rows.length > 0) {
      try {
        await notifyOrderStatusChange(userRes.rows[0], updatedOrder.id, status);
      } catch (notifyError) {
        console.error('Order status notification failed:', notifyError.message);
      }
    }

    return res.status(200).json({
      message: 'Order status updated successfully.',
      order: updatedOrder,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Cancel an order by the owner (Customer only)
 * PUT /api/v1/orders/:id/cancel
 */
const cancelOrder = async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const orderRes = await pool.query('SELECT status, user_id FROM orders WHERE id = $1', [id]);
    if (orderRes.rows.length === 0) {
      return res.status(404).json({ message: 'Order not found.' });
    }

      const order = orderRes.rows[0];
    const isAdmin = req.user.role === 'admin';

    if (order.user_id !== userId && !isAdmin) {
      return res.status(403).json({ message: 'You can only cancel your own orders.' });
    }

    if (!['Pending', 'Preparing'].includes(order.status)) {
      return res.status(400).json({ message: 'Only Pending or Preparing orders can be canceled.' });
    }

    if (order.status === 'Cancelled') {
      return res.status(400).json({ message: 'Order is already canceled.' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query('UPDATE orders SET status = $1 WHERE id = $2 RETURNING *', ['Cancelled', id]);

      await client.query('COMMIT');

      try {
        const userRes = await client.query('SELECT name, email, phone FROM users WHERE id = $1', [order.user_id]);
        if (userRes.rows.length > 0) {
          await notifyOrderCancellation(userRes.rows[0], id);
        }
      } catch (notifyError) {
        console.error('Order cancellation notification failed:', notifyError.message);
      }

      return res.status(200).json({
        message: 'Order canceled successfully.',
      });
    } catch (transactionError) {
      await client.query('ROLLBACK');
      throw transactionError;
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  placeOrder,
  getMyOrders,
  getAllOrders,
  updateOrderStatus,
  cancelOrder,
};
