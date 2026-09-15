CREATE TABLE IF NOT EXISTS products (
  id VARCHAR(32) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(64) NOT NULL,
  price INT UNSIGNED NOT NULL,
  compare_at INT UNSIGNED NULL,
  badge VARCHAR(16) NULL,
  color_1 VARCHAR(16) NOT NULL,
  color_2 VARCHAR(16) NOT NULL,
  image VARCHAR(255) NOT NULL,
  sizes JSON NULL,
  description TEXT NULL,
  highlights JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS highlights JSON NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock INT UNSIGNED NOT NULL DEFAULT 20;
-- colors replaces the fixed color_1/color_2 pair with any number of swatches.
-- color_1/color_2 stay populated (first two, or one repeated) for backward
-- compatibility with anything still reading them directly.
ALTER TABLE products ADD COLUMN IF NOT EXISTS colors JSON NULL;
-- images replaces the single `image` column with a gallery. `image` stays
-- populated (the first entry) for backward compatibility with every
-- storefront view that only ever shows one photo (cards, cart, etc).
ALTER TABLE products ADD COLUMN IF NOT EXISTS images JSON NULL;

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sessions (
  token VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS addresses (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  label VARCHAR(64) NOT NULL,
  recipient_name VARCHAR(255) NOT NULL,
  phone VARCHAR(32) NOT NULL,
  address TEXT NOT NULL,
  city VARCHAR(128) NOT NULL,
  postal_code VARCHAR(16) NOT NULL,
  is_default TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(32) PRIMARY KEY,
  user_id VARCHAR(36) NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(32) NOT NULL,
  email VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  city VARCHAR(128) NOT NULL,
  postal_code VARCHAR(16) NOT NULL,
  notes TEXT NULL,
  payment_method VARCHAR(32) NOT NULL,
  subtotal INT UNSIGNED NOT NULL,
  shipping INT UNSIGNED NOT NULL,
  total INT UNSIGNED NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'pending',
  payment_channel VARCHAR(32) NULL,
  payment_reference VARCHAR(128) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS user_id VARCHAR(36) NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_channel VARCHAR(32) NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(128) NULL;

CREATE TABLE IF NOT EXISTS order_items (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  order_id VARCHAR(32) NOT NULL,
  product_id VARCHAR(32) NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  size VARCHAR(16) NULL,
  price INT UNSIGNED NOT NULL,
  qty INT UNSIGNED NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS wishlists (
  user_id VARCHAR(36) NOT NULL,
  product_id VARCHAR(32) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, product_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS categories (
  name VARCHAR(64) PRIMARY KEY,
  blurb VARCHAR(255) NOT NULL,
  image VARCHAR(500) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS banners (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  subtitle VARCHAR(255) NULL,
  image VARCHAR(500) NOT NULL,
  cta_label VARCHAR(64) NULL,
  cta_href VARCHAR(255) NULL,
  sort_order INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS site_images (
  slot VARCHAR(64) PRIMARY KEY,
  image VARCHAR(500) NOT NULL,
  alt VARCHAR(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS reviews (
  id VARCHAR(36) PRIMARY KEY,
  product_id VARCHAR(32) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  user_name VARCHAR(255) NOT NULL,
  rating TINYINT UNSIGNED NOT NULL,
  comment TEXT NOT NULL,
  verified_purchase TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_product_user (product_id, user_id),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ERP / POS (heyfreak-admin) -------------------------------------------------
-- Physical/warehouse locations. inventory_levels is the single source of
-- truth for stock. products.stock stays as a cached aggregate recomputed
-- from it (see store/inventory.go) so every existing read path (catalog,
-- CreateOrder) keeps working unchanged.
CREATE TABLE IF NOT EXISTS locations (
  id VARCHAR(32) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(16) NOT NULL DEFAULT 'store',
  address TEXT NULL,
  is_pos_enabled TINYINT(1) NOT NULL DEFAULT 1,
  -- The location online orders reserve stock from. Exactly one row should
  -- have this set — with a single physical store it's simply that store.
  is_online_default TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- size is part of the key: '' means "no size" (the product doesn't have
-- sizes at all), so a sized product's stock is tracked one row per size
-- instead of one pooled number for the whole product.
CREATE TABLE IF NOT EXISTS inventory_levels (
  location_id VARCHAR(32) NOT NULL,
  product_id VARCHAR(32) NOT NULL,
  size VARCHAR(16) NOT NULL DEFAULT '',
  qty INT NOT NULL DEFAULT 0,
  PRIMARY KEY (location_id, product_id, size),
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
ALTER TABLE inventory_levels ADD COLUMN IF NOT EXISTS size VARCHAR(16) NOT NULL DEFAULT '';
ALTER TABLE inventory_levels DROP PRIMARY KEY, ADD PRIMARY KEY (location_id, product_id, size);

CREATE TABLE IF NOT EXISTS stock_movements (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  product_id VARCHAR(32) NOT NULL,
  location_id VARCHAR(32) NOT NULL,
  size VARCHAR(16) NOT NULL DEFAULT '',
  delta_qty INT NOT NULL,
  reason VARCHAR(24) NOT NULL,
  reference_type VARCHAR(24) NULL,
  reference_id VARCHAR(64) NULL,
  created_by_staff_id VARCHAR(36) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS size VARCHAR(16) NOT NULL DEFAULT '';

-- POS sales are just orders with channel='pos' — same table, same
-- GetOrder/ListOrders/receipt code paths as online orders.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS channel VARCHAR(16) NOT NULL DEFAULT 'online';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS location_id VARCHAR(32) NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS register_session_id BIGINT NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cash_received INT NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS change_due INT NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS served_by_staff_id VARCHAR(36) NULL;

-- Staff (heyfreak-admin) auth is intentionally separate from the customer
-- `users`/`sessions` tables above.
CREATE TABLE IF NOT EXISTS staff (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(16) NOT NULL DEFAULT 'cashier',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS staff_sessions (
  token VARCHAR(64) PRIMARY KEY,
  staff_id VARCHAR(36) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS pos_registers (
  id VARCHAR(32) PRIMARY KEY,
  location_id VARCHAR(32) NOT NULL,
  name VARCHAR(255) NOT NULL,
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS register_sessions (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  register_id VARCHAR(32) NOT NULL,
  staff_id VARCHAR(36) NOT NULL,
  opening_cash INT NOT NULL DEFAULT 0,
  closing_cash INT NULL,
  expected_cash INT NULL,
  opened_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  closed_at TIMESTAMP NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'open',
  FOREIGN KEY (register_id) REFERENCES pos_registers(id) ON DELETE CASCADE,
  FOREIGN KEY (staff_id) REFERENCES staff(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Admin can archive a product (hide from the public catalog) instead of
-- deleting it outright — order_items/stock_movements keep referencing it.
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_active TINYINT(1) NOT NULL DEFAULT 1;

-- Purchasing --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS suppliers (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(32) NULL,
  email VARCHAR(255) NULL,
  address TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS purchase_orders (
  id VARCHAR(32) PRIMARY KEY,
  supplier_id VARCHAR(36) NOT NULL,
  location_id VARCHAR(32) NOT NULL,
  -- wide enough for "partially_received" (18 chars)
  status VARCHAR(24) NOT NULL DEFAULT 'draft',
  created_by_staff_id VARCHAR(36) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
  FOREIGN KEY (location_id) REFERENCES locations(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
ALTER TABLE purchase_orders MODIFY COLUMN status VARCHAR(24) NOT NULL DEFAULT 'draft';

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  purchase_order_id VARCHAR(32) NOT NULL,
  product_id VARCHAR(32) NOT NULL,
  qty_ordered INT NOT NULL,
  qty_received INT NOT NULL DEFAULT 0,
  unit_cost INT UNSIGNED NOT NULL,
  FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Accounting (basic — cash-basis revenue + inventory/payable on receipt,
-- not full costing since products don't carry a cost basis besides what a
-- purchase order records) ---------------------------------------------------
CREATE TABLE IF NOT EXISTS accounts (
  code VARCHAR(16) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(16) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS journal_entries (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  memo VARCHAR(255) NOT NULL,
  reference_type VARCHAR(24) NULL,
  reference_id VARCHAR(64) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_reference (reference_type, reference_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS journal_lines (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  entry_id BIGINT NOT NULL,
  account_code VARCHAR(16) NOT NULL,
  debit INT UNSIGNED NOT NULL DEFAULT 0,
  credit INT UNSIGNED NOT NULL DEFAULT 0,
  FOREIGN KEY (entry_id) REFERENCES journal_entries(id) ON DELETE CASCADE,
  FOREIGN KEY (account_code) REFERENCES accounts(code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- HR ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shifts (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  staff_id VARCHAR(36) NOT NULL,
  location_id VARCHAR(32) NOT NULL,
  starts_at TIMESTAMP NOT NULL,
  ends_at TIMESTAMP NOT NULL,
  FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE,
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
