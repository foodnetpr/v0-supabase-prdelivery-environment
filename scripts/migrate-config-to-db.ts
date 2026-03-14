import { createClient } from "@supabase/supabase-js"
import { restaurantConfig } from "../config/restaurant-config"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function migrateConfigToDatabase(restaurantSlug: string) {
  console.log(`🔄 Starting migration for restaurant: ${restaurantSlug}`)

  // Find the restaurant
  const { data: restaurant, error: restaurantError } = await supabase
    .from("restaurants")
    .select("id")
    .eq("slug", restaurantSlug)
    .single()

  if (restaurantError || !restaurant) {
    console.error(`❌ Restaurant ${restaurantSlug} not found`)
    return
  }

  const restaurantId = restaurant.id
  console.log(`✅ Found restaurant with ID: ${restaurantId}`)

  // Get categories from config
  const configCategories = restaurantConfig.categories

  // Create category mapping
  const categoryMapping: { [key: string]: string } = {}

  for (const configCategory of configCategories) {
    // Check if category exists
    const { data: existingCategory } = await supabase
      .from("categories")
      .select("id")
      .eq("restaurant_id", restaurantId)
      .eq("name", configCategory.name)
      .single()

    if (existingCategory) {
      categoryMapping[configCategory.id] = existingCategory.id
      console.log(`✅ Category already exists: ${configCategory.name}`)
    } else {
      // Create category
      const { data: newCategory, error: categoryError } = await supabase
        .from("categories")
        .insert({
          restaurant_id: restaurantId,
          name: configCategory.name,
          description: null,
          display_order: configCategories.indexOf(configCategory),
          is_active: true,
        })
        .select()
        .single()

      if (categoryError || !newCategory) {
        console.error(`❌ Failed to create category: ${configCategory.name}`)
        continue
      }

      categoryMapping[configCategory.id] = newCategory.id
      console.log(`✅ Created category: ${configCategory.name}`)
    }
  }

  // Migrate menu items with options
  for (const configItem of restaurantConfig.menuItems) {
    const categoryId = categoryMapping[configItem.category]

    if (!categoryId) {
      console.warn(`⚠️ No category mapping for ${configItem.name}`)
      continue
    }

    // Check if menu item exists
    const { data: existingItem } = await supabase
      .from("menu_items")
      .select("id")
      .eq("restaurant_id", restaurantId)
      .eq("name", configItem.name)
      .single()

    let menuItemId: string

    if (existingItem) {
      menuItemId = existingItem.id
      console.log(`✅ Menu item already exists: ${configItem.name}`)
    } else {
      // Create menu item
      const { data: newItem, error: itemError } = await supabase
        .from("menu_items")
        .insert({
          restaurant_id: restaurantId,
          category_id: categoryId,
          name: configItem.name,
          description: configItem.description,
          price: configItem.price,
          image_url: configItem.image,
          serves: configItem.serves || null,
          is_active: true,
        })
        .select()
        .single()

      if (itemError || !newItem) {
        console.error(`❌ Failed to create menu item: ${configItem.name}`)
        continue
      }

      menuItemId = newItem.id
      console.log(`✅ Created menu item: ${configItem.name}`)
    }

    // Add options if they exist
    if (configItem.options && configItem.options.length > 0) {
      for (const configOption of configItem.options) {
        // Check if option exists
        const { data: existingOption } = await supabase
          .from("item_options")
          .select("id")
          .eq("menu_item_id", menuItemId)
          .eq("category", configOption.name)
          .single()

        let optionId: string

        if (existingOption) {
          optionId = existingOption.id
          console.log(`  ✅ Option already exists: ${configOption.name}`)
        } else {
          // Create option
          const { data: newOption, error: optionError } = await supabase
            .from("item_options")
            .insert({
              menu_item_id: menuItemId,
              category: configOption.name,
              is_required: configOption.instruction?.includes("Choose") || false,
              min_selection: configOption.min || 0,
              max_selection: configOption.max || 1,
            })
            .select()
            .single()

          if (optionError || !newOption) {
            console.error(`  ❌ Failed to create option: ${configOption.name}`)
            continue
          }

          optionId = newOption.id
          console.log(`  ✅ Created option: ${configOption.name}`)
        }

        // Add choices
        for (const choice of configOption.choices) {
          // Check if choice exists
          const { data: existingChoice } = await supabase
            .from("item_option_choices")
            .select("id")
            .eq("item_option_id", optionId)
            .eq("name", choice)
            .single()

          if (existingChoice) {
            console.log(`    ✅ Choice already exists: ${choice}`)
          } else {
            // Create choice
            const { error: choiceError } = await supabase.from("item_option_choices").insert({
              item_option_id: optionId,
              name: choice,
              price_modifier: 0,
            })

            if (choiceError) {
              console.error(`    ❌ Failed to create choice: ${choice}`)
            } else {
              console.log(`    ✅ Created choice: ${choice}`)
            }
          }
        }
      }
    }
  }

  console.log(`🎉 Migration completed for ${restaurantSlug}!`)
}

// Run migration
const restaurantSlug = process.argv[2] || "gourmet-catering"
migrateConfigToDatabase(restaurantSlug)
  .then(() => {
    console.log("✨ Done!")
    process.exit(0)
  })
  .catch((error) => {
    console.error("💥 Migration failed:", error)
    process.exit(1)
  })
