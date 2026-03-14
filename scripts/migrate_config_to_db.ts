/**
 * Migration Script: Import Existing Restaurant Config to Database
 *
 * This script imports the current restaurant configuration from
 * config/restaurant-config.ts into the Supabase database as the
 * first restaurant tenant.
 *
 * Run this from the super admin panel or as a standalone script.
 */

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function migrateConfigToDatabase() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  console.log("Starting migration...")

  try {
    // Import the config
    const { restaurantConfig } = await import("../config/restaurant-config")

    // 1. Create the restaurant
    console.log("Creating restaurant...")
    const { data: restaurant, error: restaurantError } = await supabase
      .from("restaurants")
      .insert([
        {
          name: restaurantConfig.branding.name,
          slug: "gourmet-catering", // Default slug, can be changed
          logo_url: restaurantConfig.branding.logo,
          primary_color: restaurantConfig.branding.primaryColor,
          phone: restaurantConfig.contact.phone,
          email: restaurantConfig.contact.email,
          address: restaurantConfig.contact.address,
          tax_rate: restaurantConfig.businessRules.taxRate,
          delivery_fee: 0,
          min_delivery_order: restaurantConfig.businessRules.minimumOrderValue,
          lead_time_hours: restaurantConfig.businessRules.scheduling.minLeadTimeHours,
          is_active: true,
        },
      ])
      .select()
      .single()

    if (restaurantError) throw restaurantError
    console.log("✓ Restaurant created:", restaurant.id)

    // 2. Create categories
    console.log("Creating categories...")
    const categoryMap = new Map()

    for (const [index, categoryName] of restaurantConfig.categories.entries()) {
      const { data: category, error: categoryError } = await supabase
        .from("categories")
        .insert([
          {
            restaurant_id: restaurant.id,
            name: categoryName,
            display_order: index,
            is_active: true,
          },
        ])
        .select()
        .single()

      if (categoryError) throw categoryError
      categoryMap.set(categoryName, category.id)
      console.log(`✓ Category created: ${categoryName}`)
    }

    // 3. Create item types
    console.log("Creating item types...")
    const itemTypeMap = new Map()

    for (const [index, typeName] of restaurantConfig.itemTypes.entries()) {
      const { data: itemType, error: typeError } = await supabase
        .from("item_types")
        .insert([
          {
            restaurant_id: restaurant.id,
            name: typeName,
            display_order: index,
          },
        ])
        .select()
        .single()

      if (typeError) throw typeError
      itemTypeMap.set(typeName, itemType.id)
      console.log(`✓ Item type created: ${typeName}`)
    }

    // 4. Create menu items
    console.log("Creating menu items...")

    for (const [index, item] of restaurantConfig.menu.entries()) {
      const categoryId = categoryMap.get(item.category)
      const itemTypeId = itemTypeMap.get(item.type)

      // Create the menu item
      const { data: menuItem, error: menuItemError } = await supabase
        .from("menu_items")
        .insert([
          {
            restaurant_id: restaurant.id,
            category_id: categoryId,
            item_type_id: itemTypeId,
            name: item.name,
            description: item.description,
            price: item.price,
            image_url: item.image,
            serves: item.serves ? Number.parseInt(item.serves.match(/\d+/)?.[0] || "1") : null,
            dietary_tags: item.tags,
            is_bundle: item.type === "Bundle",
            display_order: index,
            is_active: true,
          },
        ])
        .select()
        .single()

      if (menuItemError) throw menuItemError

      // If it's a bundle with options, create those
      if (item.options && item.options.length > 0) {
        for (const [optIndex, option] of item.options.entries()) {
          const { data: itemOption, error: optionError } = await supabase
            .from("item_options")
            .insert([
              {
                menu_item_id: menuItem.id,
                category: option.name,
                is_required: option.min > 0,
                min_selection: option.min,
                max_selection: option.max,
                display_order: optIndex,
              },
            ])
            .select()
            .single()

          if (optionError) throw optionError

          // Create option choices
          for (const [choiceIndex, choice] of option.choices.entries()) {
            await supabase.from("item_option_choices").insert([
              {
                item_option_id: itemOption.id,
                name: choice,
                price_modifier: 0,
                display_order: choiceIndex,
              },
            ])
          }
        }
      }

      console.log(`✓ Menu item created: ${item.name}`)
    }

    // 5. Create service packages
    console.log("Creating service packages...")

    for (const [index, pkg] of restaurantConfig.servicePackages.entries()) {
      const { data: servicePackage, error: packageError } = await supabase
        .from("service_packages")
        .insert([
          {
            restaurant_id: restaurant.id,
            name: pkg.name,
            description: pkg.description,
            base_price: pkg.basePrice,
            image_url: pkg.image,
            display_order: index,
            is_active: true,
          },
        ])
        .select()
        .single()

      if (packageError) throw packageError

      // Create base inclusions
      for (const [inclIndex, inclusion] of pkg.baseInclusions.entries()) {
        await supabase.from("package_inclusions").insert([
          {
            package_id: servicePackage.id,
            description: inclusion,
            display_order: inclIndex,
          },
        ])
      }

      // Create add-ons
      const addonMap = new Map()

      for (const [addonIndex, addon] of pkg.addOnOptions.entries()) {
        const { data: packageAddon, error: addonError } = await supabase
          .from("package_addons")
          .insert([
            {
              package_id: servicePackage.id,
              name: addon.name,
              price_per_unit: addon.pricePerUnit,
              unit: "item",
              display_order: addonIndex,
            },
          ])
          .select()
          .single()

        if (addonError) throw addonError
        addonMap.set(addon.id, packageAddon.id)
      }

      // Link available add-ons to this package
      for (const availableAddonId of pkg.availableAddOns) {
        const dbAddonId = addonMap.get(availableAddonId)
        if (dbAddonId) {
          await supabase.from("package_addon_availability").insert([
            {
              package_id: servicePackage.id,
              addon_id: dbAddonId,
            },
          ])
        }
      }

      console.log(`✓ Service package created: ${pkg.name}`)
    }

    console.log("\n✅ Migration completed successfully!")
    return { success: true, restaurantId: restaurant.id }
  } catch (error: any) {
    console.error("❌ Migration failed:", error.message)
    return { success: false, error: error.message }
  }
}

// Allow running from command line
if (typeof window === "undefined" && require.main === module) {
  migrateConfigToDatabase().then((result) => {
    if (result.success) {
      console.log("Migration successful!")
      process.exit(0)
    } else {
      console.error("Migration failed:", result.error)
      process.exit(1)
    }
  })
}
