-- Check if bill_sessions table exists
CREATE TABLE IF NOT EXISTS bill_sessions (
  id UUID PRIMARY KEY,
  code TEXT NOT NULL,
  restaurant_id UUID NOT NULL,
  table_id TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '6 hours')
);

-- Create index on code for faster lookups
CREATE INDEX IF NOT EXISTS bill_sessions_code_idx ON bill_sessions(code);

-- Create index on restaurant_id for faster lookups
CREATE INDEX IF NOT EXISTS bill_sessions_restaurant_id_idx ON bill_sessions(restaurant_id);

-- Create index on expires_at for faster cleanup
CREATE INDEX IF NOT EXISTS bill_sessions_expires_at_idx ON bill_sessions(expires_at);
