// db.js
const { Pool } = require('pg');
require('dotenv').config();

// Create connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Test connection on startup and ensure schema updates for older DB instances
const ensureNoStockColumn = async () => {
  try {
    const result = await pool.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'menu_items' AND column_name = 'stock_quantity'`
    );

    if (result.rows.length > 0) {
      await pool.query(
        `ALTER TABLE menu_items DROP COLUMN IF EXISTS stock_quantity`
      );
      console.log('Removed stock_quantity column from menu_items.');
    }
  } catch (error) {
    console.error('Schema check error (remove stock):', error.stack || error);
  }
};

const ensureUserPhoneColumn = async () => {
  try {
    const result = await pool.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'phone'`
    );

    if (result.rows.length === 0) {
      await pool.query(
        `ALTER TABLE users
         ADD COLUMN phone VARCHAR(25)`
      );
      console.log('Added missing phone column to users.');
    }
  } catch (error) {
    console.error('Schema check error:', error.stack || error);
  }
};

const ensureFeedbackTable = async () => {
  try {
    const result = await pool.query(
      `SELECT table_name FROM information_schema.tables WHERE table_name = 'feedback'`
    );

    if (result.rows.length === 0) {
      await pool.query(
        `CREATE TABLE feedback (
           id SERIAL PRIMARY KEY,
           user_id INTEGER REFERENCES users(id),
           order_id INTEGER REFERENCES orders(id),
           rating INTEGER CHECK (rating >= 1 AND rating <= 5),
           comment TEXT,
           created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
         )`
      );
      await pool.query(
        `CREATE UNIQUE INDEX feedback_unique_order_user ON feedback(order_id, user_id)`
      );
      console.log('Created missing feedback table.');
    }
  } catch (error) {
    console.error('Schema check error:', error.stack || error);
  }
};

const ensureOrderStatusConstraint = async () => {
  try {
    const constraint = await pool.query(
      `SELECT conname, pg_get_constraintdef(oid) AS definition
       FROM pg_constraint
       WHERE conrelid = 'orders'::regclass
         AND contype = 'c'
         AND conname = 'orders_status_check'`
    );

    if (constraint.rows.length === 0) {
      await pool.query(
        `ALTER TABLE orders
         ADD CONSTRAINT orders_status_check CHECK (status IN ('Pending', 'Preparing', 'Completed', 'Cancelled'))`
      );
      console.log('Added missing orders_status_check constraint with Cancelled status.');
      return;
    }

    const definition = constraint.rows[0].definition;
    if (!definition.includes('Cancelled')) {
      await pool.query(`ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check`);
      await pool.query(
        `ALTER TABLE orders
         ADD CONSTRAINT orders_status_check CHECK (status IN ('Pending', 'Preparing', 'Completed', 'Cancelled'))`
      );
      console.log('Updated orders_status_check constraint to include Cancelled.');
    }
  } catch (error) {
    console.error('Order status constraint check error:', error.stack || error);
  }
};

const ensureLocationColumns = async () => {
  try {
    // Add columns to users table
    await pool.query(
      `ALTER TABLE users 
       ADD COLUMN IF NOT EXISTS address TEXT NOT NULL DEFAULT 'Not Provided',
       ADD COLUMN IF NOT EXISTS city VARCHAR(100) NOT NULL DEFAULT 'Not Provided',
       ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
       ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8)`
    );
    console.log('Ensure location columns in users table.');

    // Add columns to orders table
    await pool.query(
      `ALTER TABLE orders 
       ADD COLUMN IF NOT EXISTS delivery_address TEXT NOT NULL DEFAULT 'Not Provided',
       ADD COLUMN IF NOT EXISTS delivery_city VARCHAR(100) NOT NULL DEFAULT 'Not Provided',
       ADD COLUMN IF NOT EXISTS delivery_latitude DECIMAL(10, 8),
       ADD COLUMN IF NOT EXISTS delivery_longitude DECIMAL(11, 8)`
    );
    console.log('Ensure delivery location columns in orders table.');
  } catch (error) {
    console.error('Location schema upgrade error:', error.stack || error);
  }
};

pool.connect(async (err, client, release) => {
  if (err) {
    console.error('Error connecting to PostgreSQL database:', err.stack);
  } else {
    console.log('Connected to PostgreSQL database successfully.');
    release();
    await ensureNoStockColumn();
    await ensureUserPhoneColumn();
    await ensureOrderStatusConstraint();
    await ensureFeedbackTable();
    await ensureLocationColumns();
  }
});

module.exports = pool;
