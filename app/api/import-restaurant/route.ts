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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const index = parseInt(searchParams.get("index") || "0")
  
  console.log("[v0] Import: Starting import for index", index)
  
  try {
    const supabase = await createClient()
    
    // Read the JSON file
    const jsonPath = path.join(process.cwd(), "data/foodnet_import_complete.json")
    console.log("[v0] Import: Reading file from", jsonPath)
    
    if (!fs.existsSync(jsonPath)) {
      console.error("[v0] Import: File not found at", jsonPath)
      return NextResponse.json({ error: `File not found: ${jsonPath}` }, { status: 500 })
    }
    
    const fileContent = fs.readFileSync(jsonPath, "utf-8")
    const jsonData = JSON.parse(fileContent)
    console.log("[v0] Import: Parsed JSON with", jsonData.length, "restaurants")
    
    if (index >= jsonData.length) {
      return NextResponse.json({ 
        success: true, 
        message: "All restaurants imported",
        total: jsonData.length,
        completed: true
      })
    }
    
    const entry = jsonData[index]
    const restaurant = entry.restaurant
    const categories = entry.categories || []
    
    console.log("[v0] Import: Processing restaurant", restaurant.name, "with", categories.length, "categories")
    
    const results = {
      restaurant: restaurant.name,
      categories: 0,
      items: 0,
      options: 0,
      choices: 0,
      errors: [] as string[]
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

    // Process categories and items
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

        // Process options
        const optionGroups = item.options || []
        for (let optIndex = 0; optIndex < optionGroups.length; optIndex++) {
          const option = optionGroups[optIndex]

          const { data: optionData, error: optionError } = await supabase
            .from("item_options")
            .upsert({
              menu_item_id: itemId,
              category: option.group_name || option.name || `Option ${optIndex + 1}`,
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

    console.log("[v0] Import: Completed", restaurant.name, "- Categories:", results.categories, "Items:", results.items, "Options:", results.options, "Choices:", results.choices)
    
    return NextResponse.json({
      success: true,
      index,
      total: jsonData.length,
      nextIndex: index + 1,
      completed: index + 1 >= jsonData.length,
      results
    })

  } catch (error: any) {
    console.error("[v0] Import: Error -", error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
