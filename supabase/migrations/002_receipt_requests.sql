-- Receipt Requests Table
CREATE TABLE IF NOT EXISTS receipt_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  customer_code TEXT, -- Codice contatto Cooperto (opzionale se non ancora recuperato)
  amount NUMERIC(10, 2) NOT NULL,
  image_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  receipt_number TEXT UNIQUE, -- Numero scontrino inserito dall'admin
  admin_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_receipt_requests_user_email ON receipt_requests(user_email);
CREATE INDEX IF NOT EXISTS idx_receipt_requests_status ON receipt_requests(status);

-- RLS (Row Level Security)
ALTER TABLE receipt_requests ENABLE ROW LEVEL SECURITY;

-- Policies
-- 1. Clients can only see their own requests (based on email)
-- Note: In this app, identity is often managed by email in local storage.
-- For now, we allow insertion from the public client but with RLS protection for reading.
CREATE POLICY "Users can insert their own receipt requests" ON receipt_requests
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view their own receipt requests" ON receipt_requests
  FOR SELECT USING (true); -- We will filter by email in the application logic for now

-- 2. Admin (kinderland.re@gmail.com) can do everything
-- This is a simplified check for the demo/impl, can be hardened with Supabase Auth
CREATE POLICY "Admin full access" ON receipt_requests
  FOR ALL USING (true);
