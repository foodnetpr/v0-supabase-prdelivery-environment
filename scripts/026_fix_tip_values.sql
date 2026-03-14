-- Fix tip values that were stored as decimals (e.g. 0.12) instead of whole percentages (e.g. 12)
UPDATE restaurants SET
  tip_option_1 = tip_option_1 * 100
WHERE tip_option_1 IS NOT NULL AND tip_option_1 > 0 AND tip_option_1 < 1;

UPDATE restaurants SET
  tip_option_2 = tip_option_2 * 100
WHERE tip_option_2 IS NOT NULL AND tip_option_2 > 0 AND tip_option_2 < 1;

UPDATE restaurants SET
  tip_option_3 = tip_option_3 * 100
WHERE tip_option_3 IS NOT NULL AND tip_option_3 > 0 AND tip_option_3 < 1;
