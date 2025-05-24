-- Add promo_image_url column to restaurants table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'restaurants' 
        AND column_name = 'promo_image_url'
    ) THEN
        ALTER TABLE restaurants ADD COLUMN promo_image_url TEXT;
    END IF;
END $$; 