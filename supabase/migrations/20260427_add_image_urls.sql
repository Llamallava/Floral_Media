-- Add image_urls column to store up to 5 Pexels photo URLs per flower.
-- image_url (singular) remains the primary display image for backward compat.
ALTER TABLE flowers ADD COLUMN IF NOT EXISTS image_urls text[] DEFAULT '{}';
