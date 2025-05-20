-- Create SMS history table
CREATE TABLE IF NOT EXISTS sms_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    phone_number TEXT NOT NULL,
    message TEXT NOT NULL,
    bill_url TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create index on phone_number for faster lookups
CREATE INDEX IF NOT EXISTS idx_sms_history_phone_number ON sms_history(phone_number);

-- Create index on created_at for time-based queries
CREATE INDEX IF NOT EXISTS idx_sms_history_created_at ON sms_history(created_at);

-- Add RLS policies
ALTER TABLE sms_history ENABLE ROW LEVEL SECURITY;

-- Allow insert for authenticated users
CREATE POLICY "Allow insert for authenticated users" ON sms_history
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- Allow select for authenticated users
CREATE POLICY "Allow select for authenticated users" ON sms_history
    FOR SELECT TO authenticated
    USING (true); 