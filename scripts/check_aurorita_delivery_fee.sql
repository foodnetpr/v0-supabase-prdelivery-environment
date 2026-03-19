-- Check AURORITA's delivery_fee field in restaurants table
SELECT id, name, slug, delivery_fee 
FROM restaurants 
WHERE slug = 'aurorita' OR name ILIKE '%aurorita%';
