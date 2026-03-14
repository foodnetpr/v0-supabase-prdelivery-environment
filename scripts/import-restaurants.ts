import { createClient } from "@supabase/supabase-js"
import * as fs from "fs"
import * as path from "path"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

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
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

async function importData() {
  console.log("Starting import...")
  
  // Read JSON file
  const jsonPath = path.join(__dirname, "../user_read_only_context/text_attachments/foodnet_all_menus-km2Al.json")
  const jsonData = fs.readFileSync(jsonPath, "utf-8")
  const restaurants: ImportRestaurant[] = JSON.parse(jsonData)
  
  console.log(`Found ${restaurants.length} restaurants to import`)
  
  let importedRestaurants = 0
  let importedCategories = 0
  let importedItems = 0
  let importedOptions = 0
  let importedChoices = 0

  for (const data of restaurants) {
    const { restaurant, categories } = data
    const slug = generateSlug(restaurant.name)
    
    console.log(`Importing: ${restaurant.name} (${slug})`)
    
    // Insert restaurant
    const { data: restaurantData, error: restaurantError } = await supabase
      .from("restaurants")
      .upsert({
        name: restaurant.name,
        slug: slug,
        external_id: String(restaurant.id),
        phone: restaurant.phone || null,
        restaurant_address: restaurant.address || null,
        logo_url: restaurant.logo_url || null,
        hero_image_url: restaurant.featured_url || null,
        marketplace_image_url: restaurant.featured_url || restaurant.logo_url || null,
        primary_color: "#ef4444",
        secondary_color: "#f97316",
        is_active: true,
        accepts_pickup: true,
        accepts_delivery: true,
        tax_rate: 11.5,
        show_in_marketplace: true,
      }, {
        onConflict: "slug",
      })
      .select()
      .single()

    if (restaurantError) {
      console.error(`Error importing restaurant ${restaurant.name}:`, restaurantError)
      continue
    }

    const restaurantId = restaurantData.id
    importedRestaurants++

    // Import categories and items
    for (let catIndex = 0; catIndex < categories.length; catIndex++) {
      const category = categories[catIndex]
      
      const { data: categoryData, error: categoryError } = await supabase
        .from("categories")
        .upsert({
          restaurant_id: restaurantId,
          name: category.name,
          description: category.description,
          external_id: String(category.external_id),
          display_order: catIndex,
          is_active: true,
        }, {
          onConflict: "restaurant_id,external_id",
        })
        .select()
        .single()

      if (categoryError) {
        console.error(`Error importing category ${category.name}:`, categoryError)
        continue
      }

      const categoryId = categoryData.id
      importedCategories++

      // Import items
      for (let itemIndex = 0; itemIndex < category.items.length; itemIndex++) {
        const item = category.items[itemIndex]
        
        const { data: itemData, error: itemError } = await supabase
          .from("menu_items")
          .upsert({
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
          })
          .select()
          .single()

        if (itemError) {
          console.error(`Error importing item ${item.name}:`, itemError)
          continue
        }

        const itemId = itemData.id
        importedItems++

        // Import options
        for (let optIndex = 0; optIndex < item.options.length; optIndex++) {
          const option = item.options[optIndex]
          
          const { data: optionData, error: optionError } = await supabase
            .from("item_options")
            .upsert({
              menu_item_id: itemId,
              category: option.group_name,
              is_required: option.required,
              min_selection: option.min_select,
              max_selection: option.max_select,
              external_id: String(option.id),
              display_order: optIndex,
            }, {
              onConflict: "menu_item_id,external_id",
            })
            .select()
            .single()

          if (optionError) {
            console.error(`Error importing option ${option.group_name}:`, optionError)
            continue
          }

          const optionId = optionData.id
          importedOptions++

          // Import choices
          for (let choiceIndex = 0; choiceIndex < option.choices.length; choiceIndex++) {
            const choice = option.choices[choiceIndex]
            
            const { error: choiceError } = await supabase
              .from("item_option_choices")
              .upsert({
                item_option_id: optionId,
                name: choice.name,
                price_modifier: choice.price_delta,
                external_id: String(choice.id),
                display_order: choiceIndex,
              }, {
                onConflict: "item_option_id,external_id",
              })

            if (choiceError) {
              console.error(`Error importing choice ${choice.name}:`, choiceError)
              continue
            }

            importedChoices++
          }
        }
      }
    }
  }

  console.log("\n=== Import Complete ===")
  console.log(`Restaurants: ${importedRestaurants}`)
  console.log(`Categories: ${importedCategories}`)
  console.log(`Menu Items: ${importedItems}`)
  console.log(`Options: ${importedOptions}`)
  console.log(`Choices: ${importedChoices}`)
}

importData().catch(console.error)
