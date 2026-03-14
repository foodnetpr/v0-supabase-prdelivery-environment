"use server"

import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

interface ImportChoice {
  id: number
  name: string
  price_delta: number
}

interface ImportOption {
  id: string
  group_name: string
  prompt: string
  required: boolean
  min_select: number
  max_select: number
  choices: ImportChoice[]
}

interface ImportItem {
  id: string
  external_id: number
  name: string
  description: string | null
  price: number
  image_url: string | null
  options: ImportOption[]
}

interface ImportCategory {
  id: string
  external_id: string | number
  name: string
  description: string | null
  items: ImportItem[]
}

interface ImportRestaurant {
  restaurant: {
    id: number
    name: string
    phone?: string
    address?: string
    logo_url?: string
    featured_url?: string
  }
  categories: ImportCategory[]
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    
    // Parse the incoming JSON data
    const data: ImportRestaurant[] = await request.json()
    
    if (!Array.isArray(data)) {
      return NextResponse.json(
        { error: "Expected an array of restaurants" },
        { status: 400 }
      )
    }

    const results = {
      restaurants: 0,
      categories: 0,
      items: 0,
      options: 0,
      choices: 0,
      errors: [] as string[],
    }

    for (const entry of data) {
      try {
        const { restaurant, categories } = entry
        
        // Generate slug from restaurant name
        const slug = generateSlug(restaurant.name)
        
        // Insert or update restaurant
        const { data: restaurantData, error: restaurantError } = await supabase
          .from("restaurants")
          .upsert({
            id: crypto.randomUUID(), // Generate new UUID
            name: restaurant.name,
            slug: slug,
            external_id: String(restaurant.id),
            phone: restaurant.phone || null,
            restaurant_address: restaurant.address || null,
            logo_url: restaurant.logo_url || null,
            hero_image_url: restaurant.featured_url || null,
            marketplace_image_url: restaurant.featured_url || restaurant.logo_url || null,
            primary_color: "#ef4444", // Default red
            is_active: true,
            pickup_enabled: true,
            delivery_enabled: true,
            tax_rate: 0.115, // Puerto Rico IVU (11.5% as decimal)
            show_in_marketplace: true, // Show in marketplace by default
          }, {
            onConflict: "slug",
            ignoreDuplicates: false,
          })
          .select()
          .single()

        if (restaurantError) {
          // Try to get existing restaurant by slug
          const { data: existingRestaurant } = await supabase
            .from("restaurants")
            .select("id")
            .eq("slug", slug)
            .single()
          
          if (!existingRestaurant) {
            results.errors.push(`Failed to create restaurant ${restaurant.name}: ${restaurantError.message}`)
            continue
          }
          
          // Use existing restaurant ID
          const restaurantId = existingRestaurant.id
          results.restaurants++
          
          // Process categories for existing restaurant
          await processCategories(supabase, restaurantId, categories, results)
        } else if (restaurantData) {
          results.restaurants++
          await processCategories(supabase, restaurantData.id, categories, results)
        }
      } catch (err: any) {
        results.errors.push(`Error processing restaurant: ${err.message}`)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Import completed`,
      results,
    })
  } catch (error: any) {
    console.error("Import error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to import data" },
      { status: 500 }
    )
  }
}

async function processCategories(
  supabase: any,
  restaurantId: string,
  categories: ImportCategory[],
  results: any
) {
  for (let catIndex = 0; catIndex < categories.length; catIndex++) {
    const category = categories[catIndex]
    
    try {
      // Insert category
      const { data: categoryData, error: categoryError } = await supabase
        .from("categories")
        .upsert({
          id: crypto.randomUUID(),
          restaurant_id: restaurantId,
          name: category.name,
          description: category.description,
          external_id: String(category.external_id),
          display_order: catIndex,
          is_active: true,
        }, {
          onConflict: "restaurant_id,external_id",
          ignoreDuplicates: false,
        })
        .select()
        .single()

      let categoryId: string
      
      if (categoryError) {
        // Try to get existing category
        const { data: existingCategory } = await supabase
          .from("categories")
          .select("id")
          .eq("restaurant_id", restaurantId)
          .eq("name", category.name)
          .single()
        
        if (!existingCategory) {
          results.errors.push(`Failed to create category ${category.name}: ${categoryError.message}`)
          continue
        }
        categoryId = existingCategory.id
      } else {
        categoryId = categoryData.id
      }
      
      results.categories++

      // Process items in this category
      for (let itemIndex = 0; itemIndex < category.items.length; itemIndex++) {
        const item = category.items[itemIndex]
        
        try {
          // Insert menu item
          const { data: itemData, error: itemError } = await supabase
            .from("menu_items")
            .upsert({
              id: crypto.randomUUID(),
              restaurant_id: restaurantId,
              category_id: categoryId,
              name: item.name,
              description: item.description,
              price: item.price,
              image_url: item.image_url,
              external_id: String(item.external_id),
              display_order: itemIndex,
              is_active: true,
            }, {
              onConflict: "restaurant_id,external_id",
              ignoreDuplicates: false,
            })
            .select()
            .single()

          let itemId: string
          
          if (itemError) {
            // Try to get existing item
            const { data: existingItem } = await supabase
              .from("menu_items")
              .select("id")
              .eq("restaurant_id", restaurantId)
              .eq("name", item.name)
              .eq("category_id", categoryId)
              .single()
            
            if (!existingItem) {
              results.errors.push(`Failed to create item ${item.name}: ${itemError.message}`)
              continue
            }
            itemId = existingItem.id
          } else {
            itemId = itemData.id
          }
          
          results.items++

          // Process options for this item
          for (let optIndex = 0; optIndex < item.options.length; optIndex++) {
            const option = item.options[optIndex]
            
            try {
              // Insert option group
              const { data: optionData, error: optionError } = await supabase
                .from("item_options")
                .upsert({
                  id: crypto.randomUUID(),
                  menu_item_id: itemId,
                  category: option.group_name,
                  is_required: option.required,
                  min_selection: option.min_select,
                  max_selection: option.max_select,
                  external_id: String(option.id),
                  display_order: optIndex,
                }, {
                  onConflict: "menu_item_id,external_id",
                  ignoreDuplicates: false,
                })
                .select()
                .single()

              let optionId: string
              
              if (optionError) {
                // Try to get existing option
                const { data: existingOption } = await supabase
                  .from("item_options")
                  .select("id")
                  .eq("menu_item_id", itemId)
                  .eq("name", option.group_name)
                  .single()
                
                if (!existingOption) {
                  results.errors.push(`Failed to create option ${option.group_name}: ${optionError.message}`)
                  continue
                }
                optionId = existingOption.id
              } else {
                optionId = optionData.id
              }
              
              results.options++

              // Process choices for this option
              for (let choiceIndex = 0; choiceIndex < option.choices.length; choiceIndex++) {
                const choice = option.choices[choiceIndex]
                
                try {
                  const { error: choiceError } = await supabase
                    .from("item_option_choices")
                    .upsert({
                      id: crypto.randomUUID(),
                      item_option_id: optionId,
                      name: choice.name,
                      price_modifier: choice.price_delta,
                      external_id: String(choice.id),
                      display_order: choiceIndex,
                    }, {
                      onConflict: "item_option_id,external_id",
                      ignoreDuplicates: false,
                    })

                  if (choiceError) {
                    results.errors.push(`Failed to create choice ${choice.name}: ${choiceError.message}`)
                  } else {
                    results.choices++
                  }
                } catch (err: any) {
                  results.errors.push(`Error processing choice: ${err.message}`)
                }
              }
            } catch (err: any) {
              results.errors.push(`Error processing option: ${err.message}`)
            }
          }
        } catch (err: any) {
          results.errors.push(`Error processing item: ${err.message}`)
        }
      }
    } catch (err: any) {
      results.errors.push(`Error processing category: ${err.message}`)
    }
  }
}
