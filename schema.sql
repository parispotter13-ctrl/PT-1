CREATE TABLE IF NOT EXISTS members (id TEXT PRIMARY KEY, email TEXT NOT NULL, name TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, member_id TEXT NOT NULL, stripe_customer_id TEXT, stripe_session_id TEXT UNIQUE, programme TEXT NOT NULL, status TEXT NOT NULL, amount INTEGER, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS idx_orders_member_created ON orders(member_id, created_at DESC);
CREATE TABLE IF NOT EXISTS bookings (id TEXT PRIMARY KEY, member_id TEXT NOT NULL, starts_at TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'confirmed', created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS idx_bookings_member_starts ON bookings(member_id, starts_at);
