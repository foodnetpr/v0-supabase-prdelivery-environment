import { createClient } from "@supabase/supabase-js"
import fs from "fs"
import path from "path"

// Configuration - update these with your Supabase credentials
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables")
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// Helper to create slug from name
function createSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim()
}

async function importData() {
  console.log("Starting full data import...")

  // Read the JSON file
  const jsonPath = path.join(process.cwd(), "data/foodnet_all_menus.json")
  const jsonData = JSON.parse(fs.readFileSync(jsonPath, "utf-8"))

  console.log(`Found ${jsonData.length} restaurants in JSON file`)

  let totalCategories = 0
  let totalItems = 0
  let totalOptions = 0
  let totalChoices = 0
  const errors = []

  for (const restaurantData of jsonData) {
    const restaurantName = restaurantData.restaurant.name
    console.log(`\nProcessing: ${restaurantName}`)

    // Find the restaurant by name (already imported)
    const { data: restaurant, error: findError } = await supabase
      .from("restaurants")
      .select("id, name, slug")
      .ilike("name", restaurantName)
      .single()

    if (findError || !restaurant) {
      console.log(`  - Restaurant not found, creating: ${restaurantName}`)
      const slug = createSlug(restaurantName)
      const { data: newRestaurant, error: createError } = await supabase
        .from("restaurants")
        .insert({
          name: restaurantName,
          slug,
          is_active: true,
          pickup_enabled: true,
          delivery_enabled: true,
          tax_rate: 0.115,
          show_in_marketplace: true,
        })
        .select()
        .single()

      if (createError) {
        errors.push(`Failed to create restaurant ${restaurantName}: ${createError.message}`)
        continue
      }
      restaurant.id = newRestaurant.id
    }

    console.log(`  - Restaurant ID: ${restaurant.id}`)

    // Process categories
    for (const category of restaurantData.categories || []) {
      const { data: insertedCategory, error: catError } = await supabase
        .from("categories")
        .upsert(
          {
            restaurant_id: restaurant.id,
            name: category.name,
            description: category.description,
            sort_order: totalCategories,
          },
          { onConflict: "restaurant_id,name" }
        )
        .select()
        .single()

      if (catError) {
        errors.push(`Failed to insert category ${category.name} for ${restaurantName}: ${catError.message}`)
        continue
      }

      totalCategories++
      console.log(`    - Category: ${category.name} (ID: ${insertedCategory.id})`)

      // Process menu items in this category
      for (const item of category.items || []) {
        const { data: insertedItem, error: itemError } = await supabase
          .from("menu_items")
          .upsert(
            {
              restaurant_id: restaurant.id,
              category_id: insertedCategory.id,
              name: item.name,
              description: item.description,
              price: item.price || 0,
              image_url: item.image_url,
              is_available: true,
            },
            { onConflict: "category_id,name" }
          )
          .select()
          .single()

        if (itemError) {
          errors.push(`Failed to insert item ${item.name}: ${itemError.message}`)
          continue
        }

        totalItems++

        // Process options for this item
        for (const option of item.options || []) {
          const { data: insertedOption, error: optionError } = await supabase
            .from("item_options")
            .upsert(
              {
                menu_item_id: insertedItem.id,
                category: option.group_name || option.prompt || "Options",
                required: option.required || false,
                min_select: option.min_select || 0,
                max_select: option.max_select || 1,
              },
              { onConflict: "menu_item_id,category" }
            )
            .select()
            .single()

          if (optionError) {
            errors.push(`Failed to insert option for ${item.name}: ${optionError.message}`)
            continue
          }

          totalOptions++

          // Process choices for this option
          for (const choice of option.choices || []) {
            const { error: choiceError } = await supabase.from("item_option_choices").upsert(
              {
                item_option_id: insertedOption.id,
                name: choice.name,
                price_adjustment: choice.price_delta || 0,
              },
              { onConflict: "item_option_id,name" }
            )

            if (choiceError) {
              errors.push(`Failed to insert choice ${choice.name}: ${choiceError.message}`)
              continue
            }

            totalChoices++
          }
        }
      }
    }
  }

  console.log("\n========== IMPORT COMPLETE ==========")
  console.log(`Categories: ${totalCategories}`)
  console.log(`Menu Items: ${totalItems}`)
  console.log(`Options: ${totalOptions}`)
  console.log(`Choices: ${totalChoices}`)

  if (errors.length > 0) {
    console.log(`\nErrors (${errors.length}):`)
    errors.slice(0, 20).forEach((e) => console.log(`  - ${e}`))
    if (errors.length > 20) {
      console.log(`  ... and ${errors.length - 20} more errors`)
    }
  }
}

importData().catch(console.error)
