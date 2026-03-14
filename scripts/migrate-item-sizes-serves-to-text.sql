-- Migrate item_sizes.serves column from integer to text to support ranges like "20-25"
ALTER TABLE item_sizes 
  ALTER COLUMN serves TYPE text 
  USING CASE WHEN serves IS NOT NULL THEN serves::text ELSE NULL END;
