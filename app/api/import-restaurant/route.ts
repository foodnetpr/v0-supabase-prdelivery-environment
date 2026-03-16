import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
// POST /api/import-restaurant — accepts a single { restaurant, categories } entry from the browser import page

// Helper to create slug from name
function createSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim()
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Entry sent directly from the browser: { restaurant: {...}, categories: [...] }
    const entry = await request.json()

    if (!entry?.restaurant?.name) {
      return NextResponse.json({ error: "Invalid payload — expected { restaurant, categories }" }, { status: 400 })
    }

    const restaurant = entry.restaurant
    const categories = entry.categories || []
    
    const results = {
      restaurant: restaurant.name,
      categories: 0 as number,
      items: 0 as number,
      options: 0 as number,
      choices: 0 as number,
      errors: [] as string[],
    }
    
    const slug = createSlug(restaurant.name)
    const externalId = String(restaurant.id)
    
    // Build restaurant data - all fields are directly on restaurant object
    const restaurantInsertData = {
      name: restaurant.name,
      slug: slug,
      external_id: externalId,
      phone: restaurant.phone || null,
      address: restaurant.address || null,
      restaurant_address: restaurant.address || null,
      logo_url: restaurant.logo_url || null,
      hero_image_url: restaurant.featured_url || null,
      marketplace_image_url: restaurant.featured_url || restaurant.logo_url || null,
      cuisine_type: restaurant.cuisine || null,
      delivery_fee: restaurant.delivery_fee != null ? Number(restaurant.delivery_fee) : null,
      min_delivery_order: restaurant.min_order != null ? Number(restaurant.min_order) : null,
      delivery_lead_time: restaurant.delivery_time_minutes != null ? Number(restaurant.delivery_time_minutes) : null,
      tax_rate: restaurant.tax_rate != null ? Number(restaurant.tax_rate) / 100 : 0.115,
      primary_color: "#ef4444",
      is_active: true,
      pickup_enabled: true,
      delivery_enabled: true,
      show_in_marketplace: true,
    }
    
    // Check if restaurant exists by external_id first
    const { data: existingRestaurant } = await supabase
      .from("restaurants")
      .select("id")
      .eq("external_id", externalId)
      .single()

    let restaurantId: string

    if (existingRestaurant) {
      // Update existing restaurant
      const { error: updateError } = await supabase
        .from("restaurants")
        .update(restaurantInsertData)
        .eq("id", existingRestaurant.id)

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }
      restaurantId = existingRestaurant.id
    } else {
      // Check if slug exists (different external_id)
      const { data: slugExists } = await supabase
        .from("restaurants")
        .select("id")
        .eq("slug", slug)
        .single()

      if (slugExists) {
        // Update by slug if no external_id match
        const { error: updateError } = await supabase
          .from("restaurants")
          .update(restaurantInsertData)
          .eq("id", slugExists.id)

        if (updateError) {
          return NextResponse.json({ error: updateError.message }, { status: 500 })
        }
        restaurantId = slugExists.id
      } else {
        // Insert new restaurant
        const { data: newRestaurant, error: insertError } = await supabase
          .from("restaurants")
          .insert(restaurantInsertData)
          .select()
          .single()

        if (insertError) {
          return NextResponse.json({ error: insertError.message }, { status: 500 })
        }
        restaurantId = newRestaurant.id
      }
    }

    // ── Bulk upsert categories ────────────────────────────────────────────────
    const categoryRows = categories.map((cat: any, ci: number) => ({
      restaurant_id: restaurantId,
      name: cat.name,
      description: cat.description || null,
      external_id: String(cat.external_id || cat.id || ci),
      display_order: ci,
      is_active: true,
    }))

    const { data: insertedCats, error: catErr } = await supabase
      .from("categories")
      .upsert(categoryRows, { onConflict: "restaurant_id,name" })
      .select("id, external_id, name")

    if (catErr) results.errors.push(`categories: ${catErr.message}`)

    const categoryIdMap = new Map<string, string>()
    for (const c of insertedCats ?? []) categoryIdMap.set(c.external_id, c.id)
    results.categories = insertedCats?.length ?? 0

    // ── Collect all items ─────────────────────────────────────────────────────
    type ItemMeta = { extId: string; options: any[] }
    const itemRows: any[] = []
    const itemMetas: ItemMeta[] = []

    for (let ci = 0; ci < categories.length; ci++) {
      const cat = categories[ci]
      const catExtId = String(cat.external_id || cat.id || ci)
      const categoryId = categoryIdMap.get(catExtId)
      if (!categoryId) continue
      const items: any[] = cat.items || []
      for (let ii = 0; ii < items.length; ii++) {
        const item = items[ii]
        const extId = String(item.external_id || item.id || `${catExtId}-${ii}`)
        itemRows.push({
          restaurant_id: restaurantId,
          category_id: categoryId,
          name: item.name,
          description: item.description || null,
          price: item.price || 0,
          image_url: item.image_url || null,
          external_id: extId,
          display_order: ii,
          is_active: true,
        })
        itemMetas.push({ extId, options: item.options || [] })
      }
    }

    const { data: insertedItems, error: itemErr } = await supabase
      .from("menu_items")
      .upsert(itemRows, { onConflict: "category_id,name" })
      .select("id, external_id")

    if (itemErr) results.errors.push(`menu_items: ${itemErr.message}`)

    const itemIdMap = new Map<string, string>()
    for (const i of insertedItems ?? []) itemIdMap.set(i.external_id, i.id)
    results.items = insertedItems?.length ?? 0

    // ── Collect all option groups ─────────────────────────────────────────────
    type OptMeta = { extId: string; choices: any[] }
    const optionRows: any[] = []
    const optMetas: OptMeta[] = []

    for (const meta of itemMetas) {
      const itemId = itemIdMap.get(meta.extId)
      if (!itemId) continue
      for (let oi = 0; oi < meta.options.length; oi++) {
        const opt = meta.options[oi]
        const extId = String(opt.id || `${meta.extId}-opt-${oi}`)
        optionRows.push({
          menu_item_id: itemId,
          category: opt.group_name || opt.name || `Option ${oi + 1}`,
          prompt: opt.prompt || null,
          is_required: opt.required || false,
          min_selection: opt.min_select || 0,
          max_selection: opt.max_select || 10,
          external_id: extId,
          display_order: oi,
        })
        optMetas.push({ extId, choices: opt.choices || [] })
      }
    }

    const { data: insertedOpts, error: optErr } = await supabase
      .from("item_options")
      .upsert(optionRows, { onConflict: "menu_item_id,category" })
      .select("id, external_id")

    if (optErr) results.errors.push(`item_options: ${optErr.message}`)

    const optionIdMap = new Map<string, string>()
    for (const o of insertedOpts ?? []) optionIdMap.set(o.external_id, o.id)
    results.options = insertedOpts?.length ?? 0

    // ── Collect all choices ───────────────────────────────────────────────────
    const choiceRows: any[] = []
    for (const meta of optMetas) {
      const optionId = optionIdMap.get(meta.extId)
      if (!optionId) continue
      for (let ci = 0; ci < meta.choices.length; ci++) {
        const choice = meta.choices[ci]
        choiceRows.push({
          item_option_id: optionId,
          name: choice.name,
          price_modifier: choice.price_delta || 0,
          external_id: String(choice.id || `${meta.extId}-choice-${ci}`),
          display_order: ci,
        })
      }
    }

    const { error: choiceErr } = await supabase
      .from("item_option_choices")
      .upsert(choiceRows, { onConflict: "item_option_id,name" })

    if (choiceErr) results.errors.push(`item_option_choices: ${choiceErr.message}`)
    results.choices = choiceRows.length

    return NextResponse.json({
      success: true,
      results,
    })

  } catch (error: any) {
    console.error("[v0] Import: Error -", error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
