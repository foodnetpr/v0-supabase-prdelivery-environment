SELECT mi.id, mi.name, mi.description
FROM menu_items mi
JOIN restaurants r ON mi.restaurant_id = r.id
WHERE r.slug = 'aurorita'
AND mi.is_active = true
ORDER BY mi.display_order;
