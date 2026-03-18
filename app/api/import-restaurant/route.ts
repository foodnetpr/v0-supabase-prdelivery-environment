import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

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

    const entry = await request.json()

    if (!entry?.restaurant?.name) {
      return NextResponse.json({ error: "Invalid payload — expected { restaurant, categories }" }, { status: 400 })
    }

    const restaurant = entry.restaurant
    const categories = entry.categories || []

    const results = {
      restaurant: restaurant.name,
      categories: 0,
      items: 0,
      options: 0,
      choices: 0,
      errors: [] as string[],
    }

    const slug = createSlug(restaurant.name)
    const externalId = String(restaurant.id)

    // ── Upsert restaurant ─────────────────────────────────────────────────────
    const restaurantData = {
      name: restaurant.name,
      slug,
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

    const { data: restRow, error: restErr } = await supabase
      .from("restaurants")
      .upsert(restaurantData, { onConflict: "slug" })
      .select("id")
      .single()

    if (restErr || !restRow) {
      return NextResponse.json({ error: restErr?.message || "Failed to upsert restaurant" }, { status: 500 })
    }

    const restaurantId = restRow.id

    // ── Sequential import: category → items → options → choices ───────────────
    for (let ci = 0; ci < categories.length; ci++) {
      const cat = categories[ci]

      // 1. Upsert category, get its ID
      const { data: catRow, error: catErr } = await supabase
        .from("categories")
        .upsert(
          {
            restaurant_id: restaurantId,
            name: cat.name,
            description: cat.description || null,
            external_id: String(cat.external_id || cat.id || ci),
            display_order: ci,
            is_active: true,
          },
          { onConflict: "restaurant_id,name" }
        )
        .select("id")
        .single()

      if (catErr || !catRow) {
        results.errors.push(`Category "${cat.name}": ${catErr?.message}`)
        continue
      }

      results.categories++
      const categoryId = catRow.id

      // 2. For each item in this category
      const items = cat.items || []
      for (let ii = 0; ii < items.length; ii++) {
        const item = items[ii]

        const { data: itemRow, error: itemErr } = await supabase
          .from("menu_items")
          .upsert(
            {
              restaurant_id: restaurantId,
              category_id: categoryId,
              name: item.name,
              description: item.description || null,
              price: item.price || 0,
              image_url: item.image_url || null,
              external_id: String(item.external_id || item.id || `${ci}-${ii}`),
              display_order: ii,
              is_active: true,
            },
            { onConflict: "category_id,name" }
          )
          .select("id")
          .single()

        if (itemErr || !itemRow) {
          results.errors.push(`Item "${item.name}": ${itemErr?.message}`)
          continue
        }

        results.items++
        const itemId = itemRow.id

        // 3. For each option group
        const optionGroups = item.options || []
        for (let oi = 0; oi < optionGroups.length; oi++) {
          const opt = optionGroups[oi]

          const { data: optRow, error: optErr } = await supabase
            .from("item_options")
            .upsert(
              {
                menu_item_id: itemId,
                category: opt.group_name || opt.name || `Option ${oi + 1}`,
                prompt: opt.prompt || opt.group_name || null,
                is_required: opt.required || false,
                min_selection: opt.min_select || 0,
                max_selection: opt.max_select || 10,
                external_id: String(opt.id || `${itemId}-opt-${oi}`),
                display_order: oi,
              },
              { onConflict: "menu_item_id,category" }
            )
            .select("id")
            .single()

          if (optErr || !optRow) {
            results.errors.push(`Option "${opt.group_name}": ${optErr?.message}`)
            continue
          }

          results.options++
          const optionId = optRow.id

          // 4. Bulk upsert choices (no IDs needed back)
          const choices = opt.choices || []
          if (choices.length > 0) {
            const choiceRows = choices.map((choice: any, chi: number) => ({
              item_option_id: optionId,
              name: choice.name,
              price_modifier: choice.price_delta || 0,
              external_id: String(choice.id || `${optionId}-choice-${chi}`),
              display_order: chi,
            }))

            const { error: choiceErr } = await supabase
              .from("item_option_choices")
              .upsert(choiceRows, { onConflict: "item_option_id,name" })

            if (choiceErr) {
              results.errors.push(`Choices for "${opt.group_name}": ${choiceErr.message}`)
            } else {
              results.choices += choices.length
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      results,
    })
  } catch (error: any) {
    console.error("[v0] Import error:", error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
