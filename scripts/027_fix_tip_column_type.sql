-- Step 1: Alter the column types to allow whole-number percentages (up to 100)
ALTER TABLE restaurants ALTER COLUMN tip_option_1 TYPE numeric(5,2);
ALTER TABLE restaurants ALTER COLUMN tip_option_2 TYPE numeric(5,2);
ALTER TABLE restaurants ALTER COLUMN tip_option_3 TYPE numeric(5,2);

-- Step 2: Convert existing decimal values (0.12 -> 12, 0.15 -> 15, etc.)
UPDATE restaurants SET tip_option_1 = tip_option_1 * 100 WHERE tip_option_1 > 0 AND tip_option_1 < 1;
UPDATE restaurants SET tip_option_2 = tip_option_2 * 100 WHERE tip_option_2 > 0 AND tip_option_2 < 1;
UPDATE restaurants SET tip_option_3 = tip_option_3 * 100 WHERE tip_option_3 > 0 AND tip_option_3 < 1;
