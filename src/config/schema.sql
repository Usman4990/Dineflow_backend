-- schema.sql
-- Run this once to initialize the DineFlow database

-- Drop tables if they exist (commented out to prevent data loss on existing databases)
-- DROP TABLE IF EXISTS order_items CASCADE;
-- DROP TABLE IF EXISTS orders CASCADE;
-- DROP TABLE IF EXISTS menu_items CASCADE;
-- DROP TABLE IF EXISTS users CASCADE;

-- Create Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(25),
    address TEXT NOT NULL DEFAULT 'Not Provided',
    city VARCHAR(100) NOT NULL DEFAULT 'Not Provided',
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Menu Items table
CREATE TABLE IF NOT EXISTS menu_items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
    category VARCHAR(50) NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    image_url VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Orders table
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    total_amount DECIMAL(10, 2) NOT NULL CHECK (total_amount >= 0),
    payment_method VARCHAR(50) NOT NULL DEFAULT 'Cash' CHECK (payment_method IN ('Cash', 'Card')),
    status VARCHAR(20) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Preparing', 'Completed', 'Cancelled')),
    delivery_address TEXT NOT NULL DEFAULT 'Not Provided',
    delivery_city VARCHAR(100) NOT NULL DEFAULT 'Not Provided',
    delivery_latitude DECIMAL(10, 8),
    delivery_longitude DECIMAL(11, 8),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Order Items table
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    menu_item_id INTEGER REFERENCES menu_items(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10, 2) NOT NULL CHECK (unit_price >= 0)
);

-- Create Feedback table
CREATE TABLE IF NOT EXISTS feedback (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    order_id INTEGER REFERENCES orders(id),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_feedback_order_user ON feedback(order_id, user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- Migration steps for existing databases that were created without location columns:
ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT NOT NULL DEFAULT 'Not Provided';
ALTER TABLE users ADD COLUMN IF NOT EXISTS city VARCHAR(100) NOT NULL DEFAULT 'Not Provided';
ALTER TABLE users ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);
ALTER TABLE users ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_address TEXT NOT NULL DEFAULT 'Not Provided';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_city VARCHAR(100) NOT NULL DEFAULT 'Not Provided';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_latitude DECIMAL(10, 8);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_longitude DECIMAL(11, 8);

