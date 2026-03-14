-- Migrate serves column from integer to text to support ranges like "20-25"

-- menu_items.serves: integer -> text
ALTER TABLE menu_items 
  ALTER COLUMN serves TYPE text 
  USING CASE WHEN serves IS NOT NULL THEN serves::text ELSE NULL END;
