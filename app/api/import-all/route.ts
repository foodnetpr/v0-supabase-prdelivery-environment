import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"

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

    // Parse optional batch range from query params: ?startId=1&endId=20
    const url = new URL(request.url)
    const startId = parseInt(url.searchParams.get("startId") || "1")
    const endId = parseInt(url.searchParams.get("endId") || "999999")

    // Read the JSON file from the data directory
    const jsonPath = path.join(process.cwd(), "data/foodnet_import_complete.json")
    
    let jsonData: any[]
    try {
      const fileContent = fs.readFileSync(jsonPath, "utf-8")
      jsonData = JSON.parse(fileContent)
    } catch (fileError) {
      // If file not found, try to get from request body
      const body = await request.json()
      jsonData = body.data || body
    }

    if (!Array.isArray(jsonData)) {
      return NextResponse.json({ error: "Invalid data format - expected array" }, { status: 400 })
    }

    // Apply batch filter if startId/endId were provided
    const batch = jsonData.filter((entry: any) => {
      const id = Number(entry?.restaurant?.id ?? 0)
      return id >= startId && id <= endId
    })

    const results = {
      restaurants: 0,
      categories: 0,
      items: 0,
      options: 0,
      choices: 0,
      batchRange: `${startId}–${endId}`,
      totalInBatch: batch.length,
      errors: [] as string[]
    }

    // Process each restaurant in the batch
    for (const entry of batch) {
      try {
        const restaurant = entry.restaurant
        const categories = entry.categories || []
        
        if (!restaurant || !restaurant.name) {
          results.errors.push(`Skipped entry - no restaurant name`)
          continue
        }

        const slug = createSlug(restaurant.name)

        // Insert restaurant - all fields are directly on restaurant object
        const { data: restaurantData, error: restaurantError } = await supabase
          .from("restaurants")
          .upsert({
            name: restaurant.name,
            slug: slug,
            external_id: String(restaurant.id),
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
            // Default settings
            primary_color: "#ef4444",
            is_active: true,
            pickup_enabled: true,
            delivery_enabled: true,
            show_in_marketplace: true,
          }, {
            onConflict: "slug",
          })
          .select()
          .single()

        if (restaurantError) {
          results.errors.push(`Restaurant ${restaurant.name}: ${restaurantError.message}`)
          continue
        }

        const restaurantId = restaurantData.id
        results.restaurants++

        // Process categories
        for (let catIndex = 0; catIndex < categories.length; catIndex++) {
          const category = categories[catIndex]
          
          const { data: categoryData, error: categoryError } = await supabase
            .from("categories")
            .upsert({
              restaurant_id: restaurantId,
              name: category.name,
              description: category.description || null,
              external_id: String(category.external_id || category.id || catIndex),
              display_order: catIndex,
              is_active: true,
            }, {
              onConflict: "restaurant_id,name",
            })
            .select()
            .single()

          if (categoryError) {
            results.errors.push(`Category ${category.name}: ${categoryError.message}`)
            continue
          }

          const categoryId = categoryData.id
          results.categories++

          // Process items
          const items = category.items || []
          for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
            const item = items[itemIndex]

            const { data: itemData, error: itemError } = await supabase
              .from("menu_items")
              .upsert({
                restaurant_id: restaurantId,
                category_id: categoryId,
                name: item.name,
                description: item.description || null,
                price: item.price || 0,
                image_url: item.image_url || null,
                external_id: String(item.external_id || item.id || `${catIndex}-${itemIndex}`),
                display_order: itemIndex,
                is_active: true,
              }, {
                onConflict: "category_id,name",
              })
              .select()
              .single()

            if (itemError) {
              results.errors.push(`Item ${item.name}: ${itemError.message}`)
              continue
            }

            const itemId = itemData.id
            results.items++

            // Process options (item.options in the JSON)
            const optionGroups = item.options || item.option_groups || []
            for (let optIndex = 0; optIndex < optionGroups.length; optIndex++) {
              const option = optionGroups[optIndex]

              const { data: optionData, error: optionError } = await supabase
                .from("item_options")
                .upsert({
                  menu_item_id: itemId,
                  category: option.group_name || option.name,
                  prompt: option.prompt || null,
                  is_required: option.required || false,
                  min_selection: option.min_select || 0,
                  max_selection: option.max_select || 10,
                  external_id: String(option.id || `${itemId}-opt-${optIndex}`),
                  display_order: optIndex,
                }, {
                  onConflict: "menu_item_id,category",
                })
                .select()
                .single()

              if (optionError) {
                results.errors.push(`Option ${option.group_name}: ${optionError.message}`)
                continue
              }

              const optionId = optionData.id
              results.options++

              // Process choices
              const choices = option.choices || []
              for (let choiceIndex = 0; choiceIndex < choices.length; choiceIndex++) {
                const choice = choices[choiceIndex]

                const { error: choiceError } = await supabase
                  .from("item_option_choices")
                  .upsert({
                    item_option_id: optionId,
                    name: choice.name,
                    price_modifier: choice.price_delta || 0,
                    external_id: String(choice.id || `${optionId}-choice-${choiceIndex}`),
                    display_order: choiceIndex,
                  }, {
                    onConflict: "item_option_id,name",
                  })

                if (choiceError) {
                  results.errors.push(`Choice ${choice.name}: ${choiceError.message}`)
                  continue
                }

                results.choices++
              }
            }
          }
        }
      } catch (entryError: any) {
        results.errors.push(`Entry error: ${entryError.message}`)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Import completed`,
      results: {
        restaurants: results.restaurants,
        categories: results.categories,
        items: results.items,
        options: results.options,
        choices: results.choices,
        errorCount: results.errors.length,
        errors: results.errors.slice(0, 20) // Only return first 20 errors
      }
    })

  } catch (error: any) {
    console.error("[v0] Import error:", error)
    return NextResponse.json({
      error: "Import failed",
      message: error.message
    }, { status: 500 })
  }
}

export async function GET(request: Request) {
  // Allow triggering import via GET for convenience
  return POST(request)
}
