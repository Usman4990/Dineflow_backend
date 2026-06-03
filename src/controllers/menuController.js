// menuController.js
const pool = require('../config/db');

/**
 * Menu controller handles menu CRUD and listing operations.
 * Flow: React menu UI -> menuService -> /api/v1/menu routes -> menuController -> PostgreSQL -> API response.
 */

/**
 * Get all menu items
 * GET /api/v1/menu
 * Optional query parameter: ?all=true (returns all items, otherwise only is_available=true)
 */
const getMenu = async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM menu_items ORDER BY category ASC, name ASC');
    return res.status(200).json(result.rows);
  } catch (error) {
    next(error);
  }
};

/**
 * Add a new menu item (Admin only)
 * POST /api/v1/menu
 * Body: { name, description, price, category, is_available, image_url }
 * Response: created menu item record
 */
const addMenuItem = async (req, res, next) => {
  const { name, description, price, category, is_available, image_url } = req.body;

  // Simple validation
  if (!name || price === undefined || !category) {
    return res.status(400).json({ message: 'Name, price, and category are required.' });
  }

  try {
    const isAvailable = is_available !== undefined ? is_available : true;
    const imgUrl = image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80';

    const result = await pool.query(
      'INSERT INTO menu_items (name, description, price, category, is_available, image_url) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [name.trim(), description ? description.trim() : null, price, category.trim(), isAvailable, imgUrl.trim()]
    );

    return res.status(201).json({
      message: 'Menu item created successfully.',
      item: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update an existing menu item (Admin only)
 * PUT /api/v1/menu/:id
 * Body: { name, description, price, category, is_available, image_url }
 * Response: updated menu item record
 */
const updateMenuItem = async (req, res, next) => {
  const { id } = req.params;
  const { name, description, price, category, is_available, image_url } = req.body;

  // Simple validation
  if (!name || price === undefined || !category) {
    return res.status(400).json({ message: 'Name, price, and category are required.' });
  }

  try {
    const isAvailable = is_available !== undefined ? is_available : true;
    const imgUrl = image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80';

    const result = await pool.query(
      'UPDATE menu_items SET name = $1, description = $2, price = $3, category = $4, is_available = $5, image_url = $6 WHERE id = $7 RETURNING *',
      [name.trim(), description ? description.trim() : null, price, category.trim(), isAvailable, imgUrl.trim(), id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Menu item not found.' });
    }

    return res.status(200).json({
      message: 'Menu item updated successfully.',
      item: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a menu item (Admin only)
 * DELETE /api/v1/menu/:id
 * Response: deleted menu item id
 */
const deleteMenuItem = async (req, res, next) => {
  const { id } = req.params;

  try {
    const result = await pool.query('DELETE FROM menu_items WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Menu item not found.' });
    }

    return res.status(200).json({
      message: 'Menu item deleted successfully.',
      id: id,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update availability of a menu item (Admin only)
 * PUT /api/v1/menu/:id/availability
 * Body: { is_available }
 * Response: menu item with updated availability
 */
const updateAvailability = async (req, res, next) => {
  const { id } = req.params;
  const { is_available } = req.body;

  if (is_available === undefined) {
    return res.status(400).json({ message: 'is_available field is required.' });
  }

  try {
    const result = await pool.query(
      'UPDATE menu_items SET is_available = $1 WHERE id = $2 RETURNING *',
      [is_available, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Menu item not found.' });
    }

    return res.status(200).json({
      message: 'Availability updated successfully.',
      item: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMenu,
  addMenuItem,
  updateMenuItem,
  deleteMenuItem,
  updateAvailability,
};
