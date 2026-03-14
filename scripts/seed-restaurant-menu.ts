// Seed a restaurant with sample menu items and options from the config
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function seedRestaurantMenu(restaurantSlug: string) {
  console.log(`Seeding menu for restaurant: ${restaurantSlug}`)

  // Get restaurant
  const { data: restaurant, error: restaurantError } = await supabase
    .from("restaurants")
    .select("id")
    .eq("slug", restaurantSlug)
    .single()

  if (restaurantError || !restaurant) {
    console.error("Restaurant not found:", restaurantError)
    return
  }

  const restaurantId = restaurant.id

  // Create categories
  const categories = [
    { name: "CLASSIC SANDWICHES", display_order: 0 },
    { name: "PETITE SANDWICHES", display_order: 1 },
    { name: "BREAKFAST", display_order: 2 },
    { name: "SERVICE PACKAGES", display_order: 3 },
  ]

  const { data: createdCategories } = await supabase
    .from("categories")
    .upsert(
      categories.map((cat) => ({
        restaurant_id: restaurantId,
        ...cat,
        is_active: true,
      })),
      { onConflict: "restaurant_id,name" },
    )
    .select()

  const categoryMap = new Map(createdCategories?.map((c) => [c.name, c.id]))

  // Create menu items
  const menuItems = [
    {
      name: "SANDWICH PLATTER - SMALL (serves 8 to 10)",
      description: "10 Sandwiches, Cut in Half. Assortment of our most popular deli classics.",
      price: 120.0,
      category: "CLASSIC SANDWICHES",
      serves: 10,
      image_url: "/sandwich-platter.jpg",
      display_order: 0,
    },
    {
      name: "SANDWICH PLATTER - MEDIUM (serves 12 to 15)",
      description: "15 Sandwiches, Cut in Half. Includes Turkey, Roast Beef, and Veggie options.",
      price: 180.0,
      category: "CLASSIC SANDWICHES",
      serves: 15,
      image_url: "/grilled-chicken.png",
      display_order: 1,
    },
    {
      name: "ENGLISH TEA SANDWICHES - SMALL (25 Pcs)",
      description: "On Traditional White Bread and Whole Wheat. Cucumber, Salmon, and Egg Salad.",
      price: 62.0,
      category: "PETITE SANDWICHES",
      serves: 10,
      image_url: "/tea-sandwiches.jpg",
      display_order: 0,
    },
    {
      name: "ENGLISH TEA SANDWICHES - MEDIUM (38 Pcs)",
      description: "On Traditional White Bread and Whole Wheat. Includes premium fillings.",
      price: 94.0,
      category: "PETITE SANDWICHES",
      serves: 15,
      image_url: "/tea-sandwiches-elegant.jpg",
      display_order: 1,
    },
    {
      name: "CONTINENTAL BREAKFAST",
      description: "Assorted bagels, muffins, and danish pastries with cream cheese.",
      price: 145.0,
      category: "BREAKFAST",
      serves: 10,
      image_url: "/continental-breakfast.png",
      display_order: 0,
    },
  ]

  const { data: createdItems } = await supabase
    .from("menu_items")
    .insert(
      menuItems.map((item) => ({
        restaurant_id: restaurantId,
        name: item.name,
        description: item.description,
        price: item.price,
        category_id: categoryMap.get(item.category),
        serves: item.serves,
        image_url: item.image_url,
        display_order: item.display_order,
        is_active: true,
      })),
    )
    .select()

  if (!createdItems) {
    console.error("Failed to create menu items")
    return
  }

  console.log(`Created ${createdItems.length} menu items`)

  // Add options to menu items
  for (const item of createdItems) {
    let options: any[] = []

    if (item.name.includes("SANDWICH PLATTER - SMALL")) {
      options = [
        {
          category: "Bread Selection",
          is_required: true,
          min_selection: 1,
          max_selection: 2,
          choices: ["White Bread", "Wheat Bread", "Ciabatta", "Sourdough"],
        },
      ]
    } else if (item.name.includes("SANDWICH PLATTER - MEDIUM")) {
      options = [
        {
          category: "Bread Selection",
          is_required: true,
          min_selection: 1,
          max_selection: 3,
          choices: ["White Bread", "Wheat Bread", "Ciabatta", "Sourdough", "Rye"],
        },
        {
          category: "Protein",
          is_required: true,
          min_selection: 2,
          max_selection: 3,
          choices: ["Turkey", "Roast Beef", "Ham", "Chicken", "Tuna"],
        },
      ]
    } else if (item.name.includes("TEA SANDWICHES - SMALL")) {
      options = [
        {
          category: "Filling Selection",
          is_required: true,
          min_selection: 2,
          max_selection: 4,
          choices: ["Cucumber & Cream Cheese", "Smoked Salmon", "Egg Salad", "Chicken Salad", "Ham & Swiss"],
        },
      ]
    } else if (item.name.includes("TEA SANDWICHES - MEDIUM")) {
      options = [
        {
          category: "Filling Selection",
          is_required: true,
          min_selection: 2,
          max_selection: 4,
          choices: ["Cucumber & Cream Cheese", "Smoked Salmon", "Egg Salad", "Chicken Salad", "Ham & Swiss"],
        },
      ]
    } else if (item.name.includes("CONTINENTAL BREAKFAST")) {
      options = [
        {
          category: "Pastry Selection",
          is_required: true,
          min_selection: 2,
          max_selection: 4,
          choices: ["Blueberry Muffins", "Chocolate Croissants", "Cinnamon Rolls", "Danish Pastries", "Bagels"],
        },
      ]
    }

    // Create options and choices
    for (const option of options) {
      const { data: createdOption } = await supabase
        .from("item_options")
        .insert({
          menu_item_id: item.id,
          category: option.category,
          is_required: option.is_required,
          min_selection: option.min_selection,
          max_selection: option.max_selection,
          display_order: 0,
        })
        .select()
        .single()

      if (createdOption) {
        const choices = option.choices.map((choiceName: string, index: number) => ({
          item_option_id: createdOption.id,
          name: choiceName,
          price_modifier: 0,
          display_order: index,
        }))

        await supabase.from("item_option_choices").insert(choices)
      }
    }
  }

  console.log("Seeding service packages...")

  const servicePackages = [
    {
      name: "Basic Delivery & Setup",
      description: "Delivery and setup on your facility only",
      base_price: 45.0,
      image_url: "https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=800&q=80",
      display_order: 0,
      inclusions: ["Professional delivery", "Basic food arrangement", "Setup on your existing tables"],
      addons: [
        {
          name: "Table with Cover",
          description: "6ft folding table with coordinated tablecloth",
          price_per_unit: 25,
          unit: "table",
        },
        {
          name: "Premium Serving Utensils Set",
          description: "Stainless steel serving utensils and platters",
          price_per_unit: 15,
          unit: "set",
        },
        {
          name: "Extra Disposables Set (per 10 guests)",
          description: "Additional plates, cups, napkins for 10 people",
          price_per_unit: 8,
          unit: "set",
        },
      ],
    },
    {
      name: "Premium Setup Package",
      description: "Complete setup with 1 table, 3 chafing dishes, and disposables",
      base_price: 125.0,
      image_url: "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=800&q=80",
      display_order: 1,
      inclusions: [
        "Professional delivery & setup",
        "1 table (6ft) with premium linen",
        "3 wire chafing dishes with sterno fuel",
        "Plates, cups & napkins (based on guest count)",
        "Coordinated serving utensils",
      ],
      addons: [
        {
          name: "Additional Table with Linen",
          description: "6ft table with matching premium linen",
          price_per_unit: 35,
          unit: "table",
        },
        {
          name: "Additional Wire Chafing Dish",
          description: "Standard wire chafing dish with sterno fuel",
          price_per_unit: 18,
          unit: "dish",
        },
        {
          name: "Extra Disposables Set (per 10 guests)",
          description: "Additional plates, cups, napkins for 10 people",
          price_per_unit: 12,
          unit: "set",
        },
      ],
    },
    {
      name: "Premium Plus Package",
      description: "Deluxe setup with 2 tables, 5 chafing dishes, and complete service",
      base_price: 225.0,
      image_url: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=800&q=80",
      display_order: 2,
      inclusions: [
        "Premium delivery & complete setup",
        "2 tables (6ft) with luxury linens",
        "5 wire chafing dishes with extended fuel",
        "Premium plates, cups & napkins (based on guest count)",
        "Complete serving utensil set",
        "Decorative presentation elements",
      ],
      addons: [
        {
          name: "Additional Table with Luxury Linen",
          description: "6ft table with matching luxury linen",
          price_per_unit: 40,
          unit: "table",
        },
        {
          name: "Additional Wire Chafing Dish",
          description: "Standard wire chafing dish with extended fuel",
          price_per_unit: 20,
          unit: "dish",
        },
        {
          name: "Premium Decorative Chafing Dish",
          description: "Elegant decorative chafing dish with ornate design and extended fuel",
          price_per_unit: 45,
          unit: "dish",
        },
        {
          name: "Extra Premium Disposables (per 10 guests)",
          description: "Additional premium plates, cups, napkins for 10 people",
          price_per_unit: 15,
          unit: "set",
        },
        {
          name: "Table Centerpiece",
          description: "Elegant floral or decorative centerpiece",
          price_per_unit: 35,
          unit: "piece",
        },
      ],
    },
  ]

  for (const pkg of servicePackages) {
    const { data: createdPackage } = await supabase
      .from("service_packages")
      .insert({
        restaurant_id: restaurantId,
        name: pkg.name,
        description: pkg.description,
        base_price: pkg.base_price,
        image_url: pkg.image_url,
        display_order: pkg.display_order,
        is_active: true,
      })
      .select()
      .single()

    if (createdPackage) {
      // Add inclusions
      const inclusions = pkg.inclusions.map((desc, index) => ({
        package_id: createdPackage.id,
        description: desc,
        display_order: index,
      }))
      await supabase.from("package_inclusions").insert(inclusions)

      // Add addons
      const addons = pkg.addons.map((addon, index) => ({
        package_id: createdPackage.id,
        name: addon.name,
        description: addon.description,
        price_per_unit: addon.price_per_unit,
        unit: addon.unit,
        display_order: index,
      }))
      await supabase.from("package_addons").insert(addons)
    }
  }

  console.log(`Created ${servicePackages.length} service packages`)

  console.log("Menu seeding complete!")
}

// Run the seed function
const restaurantSlug = process.argv[2] || "gourmet-catering"
seedRestaurantMenu(restaurantSlug)
  .then(() => {
    console.log("Seeding completed successfully")
    process.exit(0)
  })
  .catch((error) => {
    console.error("Seeding failed:", error)
    process.exit(1)
  })
