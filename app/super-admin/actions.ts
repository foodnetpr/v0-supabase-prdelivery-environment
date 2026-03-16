"use server"

import { createClient } from "@supabase/supabase-js"

// Create a Supabase client with service role for admin operations
function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase URL and Service Role Key are required for admin operations")
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export async function createRestaurant(data: {
  name: string
  slug: string
  email?: string
  phone?: string
  city?: string
  state?: string
  design_template: string
  primary_color: string
  show_in_marketplace?: boolean
  logo_url?: string
  marketplace_image_url?: string
  cuisine_type?: string
}) {
  try {
    const supabase = createServiceClient()

    // Check if slug already exists
    const { data: existing } = await supabase.from("restaurants").select("id").eq("slug", data.slug).single()

    if (existing) {
      return { success: false, error: "A restaurant with this URL slug already exists" }
    }

    // Create the restaurant
    const { data: restaurant, error: restaurantError } = await supabase
      .from("restaurants")
      .insert({
        name: data.name,
        slug: data.slug,
        email: data.email || null,
        phone: data.phone || null,
        city: data.city || null,
        state: data.state || "FL",
        design_template: data.design_template,
        primary_color: data.primary_color,
        is_active: true,
        show_in_marketplace: data.show_in_marketplace || false,
        logo_url: data.logo_url || null,
        marketplace_image_url: data.marketplace_image_url || null,
        cuisine_type: data.cuisine_type || null,
        area: data.area || null,
        tax_rate: 0.115,
        tip_option_1: 15,
        tip_option_2: 18,
        tip_option_3: 20,
        lead_time_hours: 24,
        min_delivery_order: 100,
      })
      .select()
      .single()

    if (restaurantError) {
      console.error("[Super Admin] Restaurant creation error:", restaurantError)
      return { success: false, error: restaurantError.message }
    }

    // --- Copy template data from JunteReady (gourmet-catering) ---
    try {
      await copyTemplateDataToRestaurant(supabase, restaurant.id)
    } catch (copyError) {
      console.error("[Super Admin] Template copy error (non-fatal):", copyError)
      // Non-fatal: restaurant is created, template copy is best-effort
    }

    // --- Create admin user for the new restaurant ---
    const defaultPassword = "admin123"
    const adminUsername = data.slug.replace(/-/g, "")
    const adminEmail = `${adminUsername}@internal.com`

    try {
      // Create Supabase Auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: adminEmail,
        password: defaultPassword,
        email_confirm: true,
      })

      let authUserId: string | null = null

      if (authError) {
        // If user already exists in auth, find them
        if (authError.message.includes("already been registered")) {
          const { data: { users } } = await supabase.auth.admin.listUsers()
          const existingUser = users?.find((u: any) => u.email === adminEmail)
          if (existingUser) authUserId = existingUser.id
        } else {
          console.error("[Super Admin] Auth user creation error:", authError)
        }
      } else {
        authUserId = authData.user.id
      }

      if (authUserId) {
        // Create admin_users record linking auth user to restaurant
        await supabase.from("admin_users").insert({
          id: authUserId,
          email: adminEmail,
          username: adminUsername,
          role: "admin",
          restaurant_id: restaurant.id,
        })
        console.log(`[Super Admin] Admin created - username: ${adminUsername}, password: ${defaultPassword}`)
      }
    } catch (adminError) {
      console.error("[Super Admin] Admin user creation error (non-fatal):", adminError)
      // Non-fatal: restaurant exists, admin can be created later
    }

    return { success: true, restaurant, adminCredentials: { username: adminUsername, password: defaultPassword } }
  } catch (error) {
    console.error("[Super Admin] Unexpected error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred",
    }
  }
}

const TEMPLATE_RESTAURANT_SLUG = "metropol-catering"

async function copyTemplateDataToRestaurant(supabase: any, newRestaurantId: string) {
  // 1. Find the template restaurant
  const { data: templateRestaurant } = await supabase
    .from("restaurants")
    .select("id")
    .eq("slug", TEMPLATE_RESTAURANT_SLUG)
    .single()

  if (!templateRestaurant) {
    console.warn("[Super Admin] Template restaurant not found, skipping copy")
    return
  }

  const templateId = templateRestaurant.id

  // NOTE: Only JunteReady service packages and delivery container rates are copied.
  // Menu items (food) are NOT copied — each restaurant builds their own menu.

  // 2. Copy service packages (with inclusions and addons)
  const { data: templatePackages } = await supabase
    .from("service_packages")
    .select("*")
    .eq("restaurant_id", templateId)
    .order("display_order")

  if (templatePackages && templatePackages.length > 0) {
    for (const pkg of templatePackages) {
      const { data: newPkg } = await supabase
        .from("service_packages")
        .insert({
          restaurant_id: newRestaurantId,
          name: pkg.name,
          description: pkg.description,
          base_price: pkg.base_price,
          image_url: pkg.image_url,
          is_active: pkg.is_active,
          is_cart_upsell: pkg.is_cart_upsell,
          display_order: pkg.display_order,
        })
        .select("id")
        .single()

      if (!newPkg) continue

      // Copy inclusions
      const { data: templateInclusions } = await supabase
        .from("package_inclusions")
        .select("*")
        .eq("package_id", pkg.id)
        .order("display_order")

      if (templateInclusions && templateInclusions.length > 0) {
        await supabase.from("package_inclusions").insert(
          templateInclusions.map((inc: any) => ({
            package_id: newPkg.id,
            description: inc.description,
            is_active: inc.is_active,
            display_order: inc.display_order,
          })),
        )
      }

      // Copy addons
      const { data: templateAddons } = await supabase
        .from("package_addons")
        .select("*")
        .eq("package_id", pkg.id)
        .order("display_order")

      if (templateAddons && templateAddons.length > 0) {
        await supabase.from("package_addons").insert(
          templateAddons.map((addon: any) => ({
            package_id: newPkg.id,
            name: addon.name,
            price_per_unit: addon.price_per_unit,
            unit: addon.unit,
            display_order: addon.display_order,
            is_active: addon.is_active,
            is_cart_upsell: addon.is_cart_upsell,
          })),
        )
      }
    }
  }

  // 3. Copy delivery container rates
  const { data: templateContainerRates } = await supabase
    .from("delivery_container_rates")
    .select("*")
    .eq("restaurant_id", templateId)
    .order("display_order")

  if (templateContainerRates && templateContainerRates.length > 0) {
    await supabase.from("delivery_container_rates").insert(
      templateContainerRates.map((rate: any) => ({
        restaurant_id: newRestaurantId,
        container_type: rate.container_type,
        label: rate.label,
        included_count: rate.included_count,
        extra_fee_per_unit: rate.extra_fee_per_unit,
        extra_rate: rate.extra_rate,
        is_active: rate.is_active,
        display_order: rate.display_order,
      })),
    )
  }

  console.log("[Super Admin] Template data copied successfully to new restaurant")
}

export async function fetchAllRestaurants() {
  try {
    const supabase = createServiceClient()

    const { data: restaurants, error } = await supabase
      .from("restaurants")
      .select(
        `
        *,
        menu_categories(count),
        menu_items(count),
        orders(count)
      `,
      )
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[Super Admin] Fetch error:", error)
      return { success: false, error: error.message, restaurants: [] }
    }

    return { success: true, restaurants: restaurants || [] }
  } catch (error) {
    console.error("[Super Admin] Unexpected error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred",
      restaurants: [],
    }
  }
}

// ---- Cuisine Types CRUD ----

export async function fetchCuisineTypes() {
  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from("cuisine_types")
      .select("*")
      .eq("is_active", true)
      .order("display_order", { ascending: true })

    if (error) {
      console.error("[Super Admin] Fetch cuisine types error:", error)
      return { success: false, error: error.message, cuisineTypes: [] }
    }
    return { success: true, cuisineTypes: data || [] }
  } catch (error) {
    return { success: false, error: "Unexpected error", cuisineTypes: [] }
  }
}

export async function createCuisineType(name: string) {
  try {
    const supabase = createServiceClient()
    // Get next display_order
    const { data: maxOrder } = await supabase
      .from("cuisine_types")
      .select("display_order")
      .order("display_order", { ascending: false })
      .limit(1)
      .single()

    const nextOrder = (maxOrder?.display_order || 0) + 1

    const { data, error } = await supabase
      .from("cuisine_types")
      .insert({ name, display_order: nextOrder })
      .select()
      .single()

    if (error) {
      console.error("[Super Admin] Create cuisine type error:", error)
      return { success: false, error: error.message }
    }
    return { success: true, cuisineType: data }
  } catch (error) {
    return { success: false, error: "Unexpected error" }
  }
}

export async function deleteCuisineType(id: string) {
  try {
    const supabase = createServiceClient()
    const { error } = await supabase.from("cuisine_types").delete().eq("id", id)
    if (error) {
      console.error("[Super Admin] Delete cuisine type error:", error)
      return { success: false, error: error.message }
    }
    return { success: true }
  } catch (error) {
    return { success: false, error: "Unexpected error" }
  }
}

export async function updateCuisineType(id: string, updates: { name?: string; icon_url?: string | null }) {
  try {
    const supabase = createServiceClient()
    const { error } = await supabase.from("cuisine_types").update(updates).eq("id", id)
    if (error) {
      console.error("[Super Admin] Update cuisine type error:", error)
      return { success: false, error: error.message }
    }
    return { success: true }
  } catch (error) {
    return { success: false, error: "Unexpected error" }
  }
}

// ---- Marketplace Areas CRUD ----

export async function fetchMarketplaceAreas() {
  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from("marketplace_areas")
      .select("*")
      .eq("is_active", true)
      .order("display_order", { ascending: true })

    if (error) {
      console.error("[Super Admin] Fetch marketplace areas error:", error)
      return { success: false, error: error.message, areas: [] }
    }
    return { success: true, areas: data || [] }
  } catch (error) {
    return { success: false, error: "Unexpected error", areas: [] }
  }
}

export async function createMarketplaceArea(name: string) {
  try {
    const supabase = createServiceClient()
    const { data: maxOrder } = await supabase
      .from("marketplace_areas")
      .select("display_order")
      .order("display_order", { ascending: false })
      .limit(1)
      .single()

    const nextOrder = (maxOrder?.display_order || 0) + 1

    const { data, error } = await supabase
      .from("marketplace_areas")
      .insert({ name, display_order: nextOrder })
      .select()
      .single()

    if (error) {
      console.error("[Super Admin] Create marketplace area error:", error)
      return { success: false, error: error.message }
    }
    return { success: true, area: data }
  } catch (error) {
    return { success: false, error: "Unexpected error" }
  }
}

export async function deleteMarketplaceArea(id: string) {
  try {
    const supabase = createServiceClient()
    const { error } = await supabase.from("marketplace_areas").delete().eq("id", id)
    if (error) {
      console.error("[Super Admin] Delete marketplace area error:", error)
      return { success: false, error: error.message }
    }
    return { success: true }
  } catch (error) {
    return { success: false, error: "Unexpected error" }
  }
}

export async function updateMarketplaceArea(id: string, name: string) {
  try {
    const supabase = createServiceClient()
    const { error } = await supabase.from("marketplace_areas").update({ name }).eq("id", id)
    if (error) {
      console.error("[Super Admin] Update marketplace area error:", error)
      return { success: false, error: error.message }
    }
    return { success: true }
  } catch (error) {
    return { success: false, error: "Unexpected error" }
  }
}

export async function deleteRestaurant(restaurantId: string, confirmationName: string) {
  try {
    const supabase = createServiceClient()

    // 1. Fetch restaurant to verify it exists and name matches
    const { data: restaurant, error: fetchError } = await supabase
      .from("restaurants")
      .select("id, name, slug")
      .eq("id", restaurantId)
      .single()

    if (fetchError || !restaurant) {
      return { success: false, error: "Restaurant not found" }
    }

    // 2. Security check: confirmation name must match exactly
    if (restaurant.name.toLowerCase() !== confirmationName.toLowerCase()) {
      return { success: false, error: "Restaurant name does not match. Deletion cancelled." }
    }

    // 3. Delete in order to respect foreign key constraints
    // Most tables have ON DELETE CASCADE, but we'll be explicit for safety

    // Delete admin_users linked to this restaurant
    const { error: adminError } = await supabase
      .from("admin_users")
      .delete()
      .eq("restaurant_id", restaurantId)
    if (adminError) console.warn("[Super Admin] Admin users delete warning:", adminError.message)

    // Delete orders (order_items cascade automatically)
    const { error: ordersError } = await supabase
      .from("orders")
      .delete()
      .eq("restaurant_id", restaurantId)
    if (ordersError) console.warn("[Super Admin] Orders delete warning:", ordersError.message)

    // Delete menu items (options/choices cascade automatically)
    const { error: itemsError } = await supabase
      .from("menu_items")
      .delete()
      .eq("restaurant_id", restaurantId)
    if (itemsError) console.warn("[Super Admin] Menu items delete warning:", itemsError.message)

    // Delete menu categories
    const { error: categoriesError } = await supabase
      .from("menu_categories")
      .delete()
      .eq("restaurant_id", restaurantId)
    if (categoriesError) console.warn("[Super Admin] Categories delete warning:", categoriesError.message)

    // Delete service packages (inclusions/addons cascade)
    const { error: packagesError } = await supabase
      .from("service_packages")
      .delete()
      .eq("restaurant_id", restaurantId)
    if (packagesError) console.warn("[Super Admin] Service packages delete warning:", packagesError.message)

    // Delete delivery zones
    const { error: zonesError } = await supabase
      .from("delivery_zones")
      .delete()
      .eq("restaurant_id", restaurantId)
    if (zonesError) console.warn("[Super Admin] Delivery zones delete warning:", zonesError.message)

    // Delete delivery container rates
    const { error: ratesError } = await supabase
      .from("delivery_container_rates")
      .delete()
      .eq("restaurant_id", restaurantId)
    if (ratesError) console.warn("[Super Admin] Container rates delete warning:", ratesError.message)

    // Delete branches (operating_hours cascade)
    const { error: branchesError } = await supabase
      .from("branches")
      .delete()
      .eq("restaurant_id", restaurantId)
    if (branchesError) console.warn("[Super Admin] Branches delete warning:", branchesError.message)

    // Finally, delete the restaurant itself
    const { error: restaurantError } = await supabase
      .from("restaurants")
      .delete()
      .eq("id", restaurantId)

    if (restaurantError) {
      console.error("[Super Admin] Restaurant delete error:", restaurantError)
      return { success: false, error: restaurantError.message }
    }

    console.log(`[Super Admin] Restaurant "${restaurant.name}" (${restaurant.slug}) deleted successfully`)
    return { success: true, deletedName: restaurant.name }
  } catch (error) {
    console.error("[Super Admin] Unexpected delete error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred",
    }
  }
}

export async function updateRestaurant(
  restaurantId: string,
  data: {
    name?: string
    design_template?: string
    primary_color?: string
    is_active?: boolean
    standalone_domain?: string
    show_in_marketplace?: boolean // Added marketplace opt-in field
    logo_url?: string // Added logo_url parameter
    marketplace_image_url?: string // Added marketplace_image_url parameter
    cuisine_type?: string // Added cuisine_type parameter
    restaurant_discount_percent?: number // JunteReady internal discount
    delivery_discount_percent?: number // Delivery-specific discount
    pickup_discount_percent?: number // Pick-up-specific discount
    dispatch_fee_percent?: number // Dispatch fee as % of subtotal, shown in cart
    cart_disclaimer?: string // Bottom-of-cart note shown to customer
  },
) {
  try {
    const supabase = createServiceClient()

    const { data: restaurant, error } = await supabase
      .from("restaurants")
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq("id", restaurantId)
      .select()
      .single()

    if (error) {
      console.error("[Super Admin] Update error:", error)
      return { success: false, error: error.message }
    }

    return { success: true, restaurant }
  } catch (error) {
    console.error("[Super Admin] Unexpected error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred",
    }
  }
}

// Apply a set of distance tiers to EVERY active restaurant at once.
// Existing zones for each restaurant are replaced. Individual restaurants can
// still be overridden afterward via their own admin panel.
export async function bulkApplyTiersToAllRestaurants(
  tiers: { minDistance: number; maxDistance: number; baseFee: number }[],
) {
  try {
    const supabase = createServiceClient()

    const { data: restaurants, error: fetchError } = await supabase
      .from("restaurants")
      .select("id")
      .eq("is_active", true)

    if (fetchError) throw new Error(fetchError.message)
    if (!restaurants || restaurants.length === 0) {
      return { success: true, updated: 0 }
    }

    const restaurantIds = restaurants.map((r: { id: string }) => r.id)
    const validTiers = tiers.filter((t) => t.baseFee > 0)

    // Delete all existing zones for these restaurants
    const { error: delError } = await supabase
      .from("delivery_zones")
      .delete()
      .in("restaurant_id", restaurantIds)

    if (delError) throw new Error(delError.message)

    if (validTiers.length === 0) {
      return { success: true, updated: restaurantIds.length }
    }

    // Build zone rows for every restaurant × every tier
    const rows = restaurantIds.flatMap((restaurantId: string) =>
      validTiers.map((t, i) => ({
        restaurant_id: restaurantId,
        zone_name: `Tier ${i + 1} (${t.minDistance}–${t.maxDistance} mi)`,
        min_distance: t.minDistance,
        max_distance: t.maxDistance,
        base_fee: t.baseFee,
        per_item_surcharge: 0,
        min_items_for_surcharge: 50,
        display_order: i,
        is_active: true,
      })),
    )

    const { error: insError } = await supabase.from("delivery_zones").insert(rows)
    if (insError) throw new Error(insError.message)

    return { success: true, updated: restaurantIds.length }
  } catch (error) {
    console.error("[Super Admin] bulkApplyTiersToAllRestaurants error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred",
    }
  }
}
