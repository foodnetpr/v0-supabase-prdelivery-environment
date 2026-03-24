"use server"

import { createClient } from "@supabase/supabase-js"

// Create admin client with service role to bypass RLS
function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase credentials")
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })
}

// Categories
export async function fetchAllCategories(restaurantId: string) {
  const supabase = getAdminClient()
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("display_order", { ascending: true, nullsFirst: false })

  if (error) throw new Error(error.message)
  return data || []
}

export async function createCategory(data: {
  restaurant_id: string
  name: string
  description?: string
  display_order?: number
  header_image_url?: string // Added header_image_url support
}) {
  const supabase = getAdminClient()
  const { data: category, error } = await supabase.from("categories").insert(data).select().single()

  if (error) throw new Error(error.message)
  return category
}

export async function updateCategory(
  categoryId: string,
  updates: {
    name?: string
    description?: string
    header_image_url?: string
    is_active?: boolean
  },
) {
  const supabase = getAdminClient()

  const { error } = await supabase.from("categories").update(updates).eq("id", categoryId)

  if (error) throw new Error(error.message)
  return { success: true }
}

export async function deleteCategory(categoryId: string) {
  const supabase = getAdminClient()
  const { error } = await supabase.from("categories").delete().eq("id", categoryId)

  if (error) throw new Error(error.message)
  return { success: true }
}

// Restaurant Meal Period Hours (Breakfast/Lunch/Dinner)
export type RestaurantHourEntry = {
  day_of_week: number
  breakfast_open: string | null
  breakfast_close: string | null
  lunch_open: string | null
  lunch_close: string | null
  dinner_open: string | null
  dinner_close: string | null
}

export async function getRestaurantHours(restaurantId: string) {
  const supabase = getAdminClient()
  const { data, error } = await supabase
    .from("restaurant_hours")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("day_of_week", { ascending: true })
  
  if (error) throw new Error(error.message)
  return data || []
}

export async function saveRestaurantHours(
  restaurantId: string,
  hours: RestaurantHourEntry[]
) {
  const supabase = getAdminClient()

  // Delete existing hours for this restaurant
  const { error: deleteError } = await supabase
    .from("restaurant_hours")
    .delete()
    .eq("restaurant_id", restaurantId)

  if (deleteError) {
    console.error("Error deleting old restaurant hours:", deleteError)
    return { success: false, error: deleteError.message }
  }

  // Insert new hours
  const rows = hours.map((h) => ({
    restaurant_id: restaurantId,
    day_of_week: h.day_of_week,
    breakfast_open: h.breakfast_open,
    breakfast_close: h.breakfast_close,
    lunch_open: h.lunch_open,
    lunch_close: h.lunch_close,
    dinner_open: h.dinner_open,
    dinner_close: h.dinner_close,
  }))

  const { error: insertError } = await supabase
    .from("restaurant_hours")
    .insert(rows)

  if (insertError) {
    console.error("Error inserting restaurant hours:", insertError)
    return { success: false, error: insertError.message }
  }

  return { success: true }
}


// ---- Item Sizes CRUD ----

export async function getItemSizes(menuItemId: string) {
  const supabase = getAdminClient()
  const { data, error } = await supabase
    .from("item_sizes")
    .select("*")
    .eq("menu_item_id", menuItemId)
    .order("display_order", { ascending: true })

  if (error) throw new Error(error.message)
  return data || []
}

export async function createItemSize(data: {
  menu_item_id: string
  name: string
  price: number
  serves?: string | null
  display_order?: number
  is_default?: boolean
}) {
  const supabase = getAdminClient()

  // If this is marked as default, unset other defaults first
  if (data.is_default) {
    await supabase
      .from("item_sizes")
      .update({ is_default: false })
      .eq("menu_item_id", data.menu_item_id)
  }

  const { data: size, error } = await supabase
    .from("item_sizes")
    .insert({
      menu_item_id: data.menu_item_id,
      name: data.name,
      price: data.price,
      serves: data.serves || null,
      display_order: data.display_order ?? 0,
      is_default: data.is_default ?? false,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return size
}

export async function updateItemSize(
  id: string,
  data: {
    name?: string
    price?: number
    serves?: string | null
    display_order?: number
    is_default?: boolean
    menu_item_id?: string
  },
) {
  const supabase = getAdminClient()

  // If setting as default, unset other defaults first
  if (data.is_default && data.menu_item_id) {
    await supabase
      .from("item_sizes")
      .update({ is_default: false })
      .eq("menu_item_id", data.menu_item_id)
  }

  const updateData: any = {}
  if (data.name !== undefined) updateData.name = data.name
  if (data.price !== undefined) updateData.price = data.price
  if (data.serves !== undefined) updateData.serves = data.serves
  if (data.display_order !== undefined) updateData.display_order = data.display_order
  if (data.is_default !== undefined) updateData.is_default = data.is_default

  const { data: size, error } = await supabase
    .from("item_sizes")
    .update(updateData)
    .eq("id", id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return size
}

export async function deleteItemSize(id: string) {
  const supabase = getAdminClient()
  const { error } = await supabase.from("item_sizes").delete().eq("id", id)

  if (error) throw new Error(error.message)
  return true
}


export async function reorderCategories(categories: { id: string; display_order: number }[]) {
  const supabase = getAdminClient()

  console.log("[v0] Reordering categories:", categories)

  try {
    // Update each category individually with its new display_order
    for (const category of categories) {
      const { error } = await supabase
        .from("categories")
        .update({ display_order: category.display_order })
        .eq("id", category.id)

      if (error) {
        console.error("[v0] Error updating category order:", error)
        return { success: false, error: error.message }
      }
    }

    console.log("[v0] Successfully reordered categories")
    return { success: true }
  } catch (error) {
    console.error("[v0] Reorder failed:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

export async function updateCategoryOrder(categoryIds: string[]) {
  const supabase = getAdminClient()

  // Update each category with its new display_order
  const updates = categoryIds.map((id, index) =>
    supabase.from("categories").update({ display_order: index }).eq("id", id),
  )

  const results = await Promise.all(updates)
  const errors = results.filter((r) => r.error)

  if (errors.length > 0) {
    throw new Error("Failed to update category order")
  }

  return { success: true }
}

export async function updateMenuItemOrder(menuItemIds: string[]) {
  const supabase = getAdminClient()

  const updates = menuItemIds.map((id, index) =>
    supabase.from("menu_items").update({ display_order: index }).eq("id", id),
  )

  const results = await Promise.all(updates)
  const errors = results.filter((r) => r.error)

  if (errors.length > 0) {
    throw new Error("Failed to update menu item order")
  }

  return { success: true }
}

// Bulk Delete Function for Categories
export async function bulkDeleteCategories(categoryIds: string[]) {
  const supabase = getAdminClient()
  const { error } = await supabase.from("categories").delete().in("id", categoryIds)

  if (error) throw new Error(error.message)
  return { success: true, deletedCount: categoryIds.length }
}

// Menu Items - using correct column name 'price' instead of 'base_price'
export async function createMenuItem(data: {
  restaurant_id: string
  category_id: string
  name: string
  description?: string
  base_price: number // This maps to 'price' column
  image_url?: string | null
  is_active?: boolean
  display_order?: number
  pricing_unit?: string | null
  per_unit_price?: number | null
  serves?: string | null // Text field for ranges like "Serves 6-8"
  is_bulk_order?: boolean
  minimum_quantity?: number | null
  quantity_unit?: string | undefined
  is_cart_upsell?: boolean
  available_days?: AvailableDays
  availability_daypart?: AvailabilityDaypart
  delivery_lead_time?: number | null
  pickup_lead_time?: number | null
}) {
  const supabase = getAdminClient()

  const insertData: any = {
    restaurant_id: data.restaurant_id,
    category_id: data.category_id,
    name: data.name,
    description: data.description,
    price: data.base_price,
    image_url: data.image_url,
    is_active: data.is_active ?? true,
    display_order: data.display_order ?? 0,
  }

  // Map to actual database column names
  if (data.pricing_unit !== undefined) insertData.selling_unit = data.pricing_unit
  if (data.per_unit_price !== undefined) insertData.per_unit_price = data.per_unit_price
  if (data.serves !== undefined && data.serves !== null) insertData.serves = data.serves
  if (data.is_bulk_order !== undefined) insertData.is_bulk_item = data.is_bulk_order
  if (data.minimum_quantity !== undefined && data.minimum_quantity !== null) insertData.bulk_min_quantity = data.minimum_quantity
  if (data.quantity_unit !== undefined) insertData.unit_label = data.quantity_unit
  if (data.is_cart_upsell !== undefined) insertData.is_upsell_item = data.is_cart_upsell
  if (data.available_days !== undefined) insertData.available_days = data.available_days
  if (data.availability_daypart !== undefined) insertData.availability_daypart = data.availability_daypart
  if (data.delivery_lead_time !== undefined) insertData.delivery_lead_time = data.delivery_lead_time
  if (data.pickup_lead_time !== undefined) insertData.pickup_lead_time = data.pickup_lead_time

  const { data: item, error } = await supabase.from("menu_items").insert(insertData).select().single()

  if (error) {
    console.error("createMenuItem error:", error.message)
    return { success: false, error: error.message }
  }
  
  return item
}

// Type for available days
export type AvailableDays = {
  mon: boolean
  tue: boolean
  wed: boolean
  thu: boolean
  fri: boolean
  sat: boolean
  sun: boolean
}

// Type for daypart availability
export type AvailabilityDaypart = 
  | "all"
  | "breakfast_lunch"
  | "breakfast_dinner"
  | "lunch_dinner"
  | "breakfast"
  | "lunch"
  | "dinner"

export async function updateMenuItem(
  id: string,
  data: {
    category_id?: string
    name?: string
    description?: string
    base_price?: number // This maps to 'price' column
    image_url?: string | null
    is_active?: boolean
    display_order?: number
    pricing_unit?: string | null
    per_unit_price?: number | null
    serves?: string | null // Text field for ranges like "Serves 6-8"
    is_bulk_order?: boolean
    minimum_quantity?: number | null
    quantity_unit?: string | undefined
    is_cart_upsell?: boolean
    available_days?: AvailableDays
    availability_daypart?: AvailabilityDaypart
    delivery_lead_time?: number | null
    pickup_lead_time?: number | null
  },
) {
  const supabase = getAdminClient()

  const updateData: any = {}
  if (data.category_id !== undefined) updateData.category_id = data.category_id
  if (data.name !== undefined) updateData.name = data.name
  if (data.description !== undefined) updateData.description = data.description
  if (data.base_price !== undefined) updateData.price = data.base_price
  if (data.image_url !== undefined) updateData.image_url = data.image_url
  if (data.is_active !== undefined) updateData.is_active = data.is_active
  if (data.display_order !== undefined) updateData.display_order = data.display_order
  // Map to actual database column names
  if (data.pricing_unit !== undefined) updateData.selling_unit = data.pricing_unit
  if (data.per_unit_price !== undefined) updateData.per_unit_price = data.per_unit_price
  if (data.serves !== undefined) updateData.serves = data.serves
  if (data.is_bulk_order !== undefined) updateData.is_bulk_item = data.is_bulk_order
  if (data.minimum_quantity !== undefined && data.minimum_quantity !== null) updateData.bulk_min_quantity = data.minimum_quantity
  if (data.quantity_unit !== undefined) updateData.unit_label = data.quantity_unit
  if (data.is_cart_upsell !== undefined) updateData.is_upsell_item = data.is_cart_upsell
  if (data.available_days !== undefined) updateData.available_days = data.available_days
  if (data.availability_daypart !== undefined) updateData.availability_daypart = data.availability_daypart
  if (data.delivery_lead_time !== undefined) updateData.delivery_lead_time = data.delivery_lead_time
  if (data.pickup_lead_time !== undefined) updateData.pickup_lead_time = data.pickup_lead_time

  const { data: item, error } = await supabase.from("menu_items").update(updateData).eq("id", id).select().single()

  if (error) {
    console.error("updateMenuItem error:", error.message)
    return { success: false, error: error.message }
  }
  return { success: true, data: item }
}

export async function deleteMenuItem(id: string) {
  const supabase = getAdminClient()
  const { error } = await supabase.from("menu_items").delete().eq("id", id)

  if (error) throw new Error(error.message)
  return true
}

// Bulk Delete Function for Menu Items
export async function bulkDeleteMenuItems(menuItemIds: string[]) {
  const supabase = getAdminClient()
  const { error } = await supabase.from("menu_items").delete().in("id", menuItemIds)

  if (error) throw new Error(error.message)
  return { success: true, deletedCount: menuItemIds.length }
}

// Item Options - using correct column name 'category' for option name
export async function createItemOption(data: {
  menu_item_id: string
  category: string // Using category directly now
  is_required?: boolean
  min_selection?: number
  max_selection?: number
  display_type?: string
  display_order?: number
}): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const supabase = getAdminClient()

    const insertData = {
      menu_item_id: data.menu_item_id,
      category: data.category,
      is_required: data.is_required ?? false,
      min_selection: data.min_selection ?? 0,
      max_selection: data.max_selection ?? 1,
      display_type: data.display_type ?? "pills",
      display_order: data.display_order ?? 0,
    }

    const { data: option, error } = await supabase.from("item_options").insert(insertData).select().single()

    if (error) return { success: false, error: error.message }
    return { success: true, data: option }
  } catch (err: any) {
    return { success: false, error: err.message || "Unknown error" }
  }
}

export async function updateItemOption(
  id: string,
  data: {
    category?: string
    is_required?: boolean
    min_selection?: number
    max_selection?: number
    display_type?: string
    display_order?: number
  },
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const supabase = getAdminClient()

    const updateData: any = {}
    if (data.category !== undefined) updateData.category = data.category
    if (data.is_required !== undefined) updateData.is_required = data.is_required
    if (data.min_selection !== undefined) updateData.min_selection = data.min_selection
    if (data.max_selection !== undefined) updateData.max_selection = data.max_selection
    if (data.display_type !== undefined) updateData.display_type = data.display_type
    if (data.display_order !== undefined) updateData.display_order = data.display_order

    const { data: option, error } = await supabase
      .from("item_options")
      .update(updateData)
      .eq("id", id)
      .select()
      .single()

    if (error) return { success: false, error: error.message }
    return { success: true, data: option }
  } catch (err: any) {
    return { success: false, error: err.message || "Unknown error" }
  }
}

export async function deleteItemOption(id: string) {
  const supabase = getAdminClient()
  const { error } = await supabase.from("item_options").delete().eq("id", id)

  if (error) throw new Error(error.message)
  return true
}

export async function updateItemOptionOrder(optionIds: string[]) {
  const supabase = getAdminClient()

  for (let i = 0; i < optionIds.length; i++) {
    const { error } = await supabase.from("item_options").update({ display_order: i }).eq("id", optionIds[i])

    if (error) throw new Error(error.message)
  }

  return { success: true }
}

export async function updateChoiceOrder(choiceIds: string[]) {
  const supabase = getAdminClient()

  for (let i = 0; i < choiceIds.length; i++) {
    const { error } = await supabase.from("item_option_choices").update({ display_order: i }).eq("id", choiceIds[i])

    if (error) throw new Error(error.message)
  }

  return { success: true }
}

// Fetch item options for a menu item
export async function getItemOptions(menuItemId: string) {
  const supabase = getAdminClient()

  const { data, error } = await supabase
    .from("item_options")
    .select("*, item_option_choices(*)")
    .eq("menu_item_id", menuItemId)
    .order("display_order") // Order by display_order instead of created_at for drag-and-drop reordering

  if (error) throw new Error(error.message)
  // Sort nested choices by display_order since Supabase doesn't support ordering on nested relations
  return (data || []).map((option: any) => ({
    ...option,
    item_option_choices: (option.item_option_choices || []).sort((a: any, b: any) => (a.display_order ?? 0) - (b.display_order ?? 0)),
  }))
}

// Get choices for an option
export async function getItemOptionChoices(optionId: string) {
  const supabase = getAdminClient()

  const { data, error } = await supabase.from("item_option_choices").select("id").eq("item_option_id", optionId)

  if (error) throw new Error(error.message)
  return data || []
}

// Item Option Choices - using correct column name 'price_modifier' instead of 'price_adjustment'
export async function createItemOptionChoice(data: {
  item_option_id: string
  name: string
  price_modifier?: number
  parent_choice_id?: string | null
  display_order?: number
  description?: string | null
}): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const supabase = getAdminClient()

    const insertData: any = {
      item_option_id: data.item_option_id,
      name: data.name,
      price_modifier: data.price_modifier ?? 0,
      parent_choice_id: data.parent_choice_id || null,
      display_order: data.display_order ?? 0,
    }
    if (data.description !== undefined) insertData.description = data.description || null

    const { data: choice, error } = await supabase.from("item_option_choices").insert(insertData).select().single()

    if (error) return { success: false, error: error.message }
    return { success: true, data: choice }
  } catch (err: any) {
    return { success: false, error: err.message || "Unknown error" }
  }
}

export async function updateItemOptionChoice(
  id: string,
  data: {
    name?: string
    price_modifier?: number // Maps to 'price_modifier' column
    parent_choice_id?: string
    display_order?: number
  },
) {
  const supabase = getAdminClient()

  const updateData: any = {}
  if (data.name !== undefined) updateData.name = data.name
  if (data.price_modifier !== undefined) updateData.price_modifier = data.price_modifier
  if (data.parent_choice_id !== undefined) updateData.parent_choice_id = data.parent_choice_id
  if (data.display_order !== undefined) updateData.display_order = data.display_order

  const { data: choice, error } = await supabase
    .from("item_option_choices")
    .update(updateData)
    .eq("id", id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return choice
}

export async function deleteItemOptionChoice(id: string) {
  const supabase = getAdminClient()
  const { error } = await supabase.from("item_option_choices").delete().eq("id", id)

  if (error) throw new Error(error.message)
  return true
}

// Service Packages
export async function fetchServicePackages(restaurantId: string) {
  const supabase = getAdminClient()

  // Fetch packages first
  const { data: packages, error: pkgError } = await supabase
    .from("service_packages")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("display_order")

  if (pkgError) throw new Error(pkgError.message)
  if (!packages || packages.length === 0) return []

  const packageIds = packages.map((p) => p.id)

  // Fetch related data in parallel
  const [inclResult, addonsResult] = await Promise.all([
    supabase.from("package_inclusions").select("*").in("package_id", packageIds),
    supabase.from("package_addons").select("*").in("package_id", packageIds),
  ])

  const inclusions = inclResult.data || []
  const addons = addonsResult.data || []

  // Fetch addon choices if addons exist
  let addonChoices: any[] = []
  if (addons.length > 0) {
    const addonIds = addons.map((a) => a.id)
    const { data: choicesData } = await supabase.from("package_addon_choices").select("*").in("package_addon_id", addonIds)
    addonChoices = choicesData || []
  }

  // Assemble the result
  const result = packages.map((pkg) => ({
    ...pkg,
    package_inclusions: inclusions.filter((i) => i.package_id === pkg.id),
    package_addons: addons
      .filter((a) => a.package_id === pkg.id)
      .map((addon) => ({
        ...addon,
        package_addon_choices: addonChoices.filter((c) => c.package_addon_id === addon.id),
      })),
  }))

  return result
}

export async function createServicePackage(data: {
  restaurant_id: string
  name: string
  description?: string
  base_price: number
  image_url?: string
  is_active?: boolean
  display_order?: number
}) {
  const supabase = getAdminClient()
  const { data: pkg, error } = await supabase
    .from("service_packages")
    .insert({ ...data, is_active: data.is_active ?? true })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return pkg
}

export async function updateServicePackage(
  id: string,
  data: {
    name?: string
    description?: string
    base_price?: number
    image_url?: string
    is_active?: boolean
    display_order?: number
    is_cart_upsell?: boolean
  },
) {
  const supabase = getAdminClient()
  const { data: pkg, error } = await supabase.from("service_packages").update(data).eq("id", id).select().single()

  if (error) throw new Error(error.message)
  return pkg
}

export async function deleteServicePackage(id: string) {
  const supabase = getAdminClient()
  const { error } = await supabase.from("service_packages").delete().eq("id", id)

  if (error) throw new Error(error.message)
  return true
}

export async function updatePackageDisplayOrder(updates: { id: string; display_order: number }[]) {
  const supabase = getAdminClient()

  const updatePromises = updates.map(({ id, display_order }) =>
    supabase.from("service_packages").update({ display_order }).eq("id", id),
  )

  const results = await Promise.all(updatePromises)
  const errors = results.filter((r) => r.error)

  if (errors.length > 0) {
    throw new Error("Failed to update package order")
  }

  return { success: true }
}

// Package Inclusions
export async function savePackageInclusions(packageId: string, inclusions: { description: string; display_order?: number; is_active?: boolean }[]) {
  const supabase = getAdminClient()

  // Delete old inclusions
  await supabase.from("package_inclusions").delete().eq("package_id", packageId)

  if (inclusions.length === 0) return []

  const insertData = inclusions.map((inc, idx) => ({
    package_id: packageId,
    description: inc.description,
    display_order: inc.display_order ?? idx,
    is_active: inc.is_active ?? true,
  }))

  const { data, error } = await supabase.from("package_inclusions").insert(insertData).select()
  if (error) throw new Error(error.message)
  return data
}

// Package Addons
export async function createPackageAddon(data: {
  package_id: string
  name: string
  price_per_unit: number
  unit?: string
  display_order?: number
  is_active?: boolean
}) {
  const supabase = getAdminClient()
  const { data: addon, error } = await supabase.from("package_addons").insert(data).select().single()

  if (error) throw new Error(error.message)
  return addon
}

export async function updatePackageAddon(
  id: string,
  data: {
    name?: string
    price_per_unit?: number
    unit?: string
    display_order?: number
    is_active?: boolean
    is_cart_upsell?: boolean
  },
) {
  const supabase = getAdminClient()
  const { data: addon, error } = await supabase.from("package_addons").update(data).eq("id", id).select().single()

  if (error) throw new Error(error.message)
  return addon
}

export async function deletePackageAddon(id: string) {
  const supabase = getAdminClient()
  const { error } = await supabase.from("package_addons").delete().eq("id", id)

  if (error) throw new Error(error.message)
  return true
}

// Package Addon Choices
export async function savePackageAddonChoices(addonId: string, choices: { name: string; price_modifier?: number; display_order?: number }[]) {
  const supabase = getAdminClient()

  if (choices.length === 0) return []

  const insertData = choices.map((choice, idx) => ({
    package_addon_id: addonId,
    name: choice.name,
    price_modifier: choice.price_modifier || 0,
    display_order: choice.display_order ?? idx,
  }))

  const { data, error } = await supabase.from("package_addon_choices").insert(insertData).select()
  if (error) throw new Error(error.message)
  return data
}

// Delete all addons for a package (used when updating)
export async function deletePackageAddons(packageId: string) {
  const supabase = getAdminClient()
  const { error } = await supabase.from("package_addons").delete().eq("package_id", packageId)

  if (error) throw new Error(error.message)
  return true
}

// Branch Service Packages (many-to-many)
export async function getBranchServicePackages(branchId: string) {
  const supabase = getAdminClient()
  const { data, error } = await supabase
    .from("branch_service_packages")
    .select("package_id")
    .eq("branch_id", branchId)

  if (error) throw new Error(error.message)
  return (data || []).map((r) => r.package_id)
}

export async function saveBranchServicePackages(branchId: string, packageIds: string[]) {
  const supabase = getAdminClient()

  // Delete existing assignments
  await supabase.from("branch_service_packages").delete().eq("branch_id", branchId)

  if (packageIds.length === 0) return []

  const insertData = packageIds.map((pid) => ({
    branch_id: branchId,
    package_id: pid,
  }))

  const { data, error } = await supabase.from("branch_service_packages").insert(insertData).select()
  if (error) throw new Error(error.message)
  return data
}

// Delivery Container Rates
export async function fetchContainerRates(restaurantId: string) {
  const supabase = getAdminClient()
  const { data, error } = await supabase
    .from("delivery_container_rates")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("container_type")

  if (error) throw new Error(error.message)
  return data || []
}

export async function upsertContainerRate(rate: {
  id?: string
  restaurant_id: string
  container_type: string
  label: string
  extra_fee_per_unit: number
}) {
  const supabase = getAdminClient()

  if (rate.id) {
    const { data, error } = await supabase
      .from("delivery_container_rates")
      .update({
        container_type: rate.container_type,
        label: rate.label,
        extra_fee_per_unit: rate.extra_fee_per_unit,
      })
      .eq("id", rate.id)
      .select()
      .single()
    if (error) throw new Error(error.message)
    return data
  }

  const { data, error } = await supabase
    .from("delivery_container_rates")
    .insert(rate)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function deleteContainerRate(id: string) {
  const supabase = getAdminClient()
  const { error } = await supabase.from("delivery_container_rates").delete().eq("id", id)
  if (error) throw new Error(error.message)
  return true
}

// Geocode a free-text address using Google Maps Geocoding API
// Returns lat/lng or null if not found
async function geocodeAddressToCoords(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!apiKey) return null
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`
    const res = await fetch(url)
    const json = await res.json()
    if (json.status === "OK" && json.results?.[0]?.geometry?.location) {
      const { lat, lng } = json.results[0].geometry.location
      return { lat, lng }
    }
    return null
  } catch {
    return null
  }
}

// Restaurant Settings
export async function updateRestaurantSettings(
  id: string,
  data: {
    name?: string
    description?: string
    contact_email?: string
    contact_phone?: string
    logo_url?: string
    hero_image_url?: string | null
    tax_rate?: number | null
    delivery_fee?: number | null
    tip_option_1?: number | null
    tip_option_2?: number | null
    tip_option_3?: number | null
    lead_time_hours?: number | null
    min_delivery_order?: number | null
    min_pickup_order?: number | null
    restaurant_address?: string
    latitude?: number
    longitude?: number
    primary_color?: string
    standalone_domain?: string | null
    design_template?: string
    is_active?: boolean
    packages_section_title?: string | null
    delivery_enabled?: boolean
    show_service_packages?: boolean
    is_chain?: boolean
    hide_branch_selector_title?: boolean
    shipday_api_key?: string | null
    delivery_lead_time_hours?: number | null
    pickup_lead_time_hours?: number | null
    max_advance_days?: number | null
    delivery_base_fee?: number | null
    footer_description?: string | null
    footer_email?: string | null
    footer_phone?: string | null
    footer_links?: any[] | null
    delivery_included_containers?: number | null
    // Location and delivery radius
    delivery_radius?: number | null
    delivery_zip_codes?: string[] | null
    // Order notification settings
    order_notification_method?: "email" | "kds" | "chowly" | "square_kds" | "multiple"
    chowly_enabled?: boolean
    chowly_api_key?: string | null
    chowly_location_id?: string | null
    square_kds_enabled?: boolean
    kds_enabled?: boolean
    kds_auto_print?: boolean
    kds_sound_enabled?: boolean
    kds_access_token?: string | null
  },
) {
  const supabase = getAdminClient()

  const payload: typeof data & { latitude?: number; longitude?: number } = { ...data }

  if (data.latitude !== undefined && data.longitude !== undefined) {
    // Explicit coordinates provided — use them directly, skip geocoding
    payload.latitude = data.latitude
    payload.longitude = data.longitude
  } else if (data.restaurant_address) {
    // No explicit coords — auto-geocode from the address
    const coords = await geocodeAddressToCoords(data.restaurant_address)
    if (coords) {
      payload.latitude = coords.lat
      payload.longitude = coords.lng
    }
  }

  const { data: restaurant, error } = await supabase.from("restaurants").update(payload).eq("id", id).select().single()

  if (error) return { error }
  return { data: restaurant, error: null }
}

// Marketplace Settings
export async function updateRestaurantMarketplaceSettings(
  restaurantId: string,
  showInMarketplace: boolean,
  tagline: string,
  cuisineTypes: string[],
  isFeatured: boolean,
  area?: string,
  mainCuisineType?: string,
) {
  try {
    const supabase = getAdminClient()
    
    // Only update columns that exist in the restaurants table
    const { data, error } = await supabase
      .from("restaurants")
      .update({
        show_in_marketplace: showInMarketplace,
        marketplace_description: tagline || null, // Using existing column
        cuisine_type: cuisineTypes[0] || null,
        cuisine_types: cuisineTypes.length > 0 ? cuisineTypes : null,
        area: area || null,
        main_cuisine_type: mainCuisineType || null,
      })
      .eq("id", restaurantId)
      .select()
      .single()

    if (error) {
      console.error("Marketplace settings save error:", error)
      return { error: "Failed to save: " + error.message }
    }

    return { data, error: null }
  } catch (error) {
    console.error("Marketplace settings save error:", error)
    return { error: "Failed to save: " + (error as Error).message }
  }
}

// Delivery Zones
export async function createDeliveryZone(data: {
  restaurant_id: string
  zone_name: string
  min_distance: number
  max_distance: number
  base_fee: number
  per_item_surcharge?: number
  min_items_for_surcharge?: number
  display_order?: number
  is_active?: boolean
}) {
  const supabase = getAdminClient()
  const { data: zone, error } = await supabase.from("delivery_zones").insert(data).select().single()

  if (error) throw new Error(error.message)
  return zone
}

export async function updateDeliveryZone(
  id: string,
  data: {
    zone_name?: string
    min_distance?: number
    max_distance?: number
    base_fee?: number
    per_item_surcharge?: number
    min_items_for_surcharge?: number
    display_order?: number
    is_active?: boolean
  },
) {
  const supabase = getAdminClient()
  const { data: zone, error } = await supabase.from("delivery_zones").update(data).eq("id", id).select().single()

  if (error) throw new Error(error.message)
  return zone
}

export async function deleteDeliveryZone(id: string) {
  const supabase = getAdminClient()
  const { error } = await supabase.from("delivery_zones").delete().eq("id", id)

  if (error) throw new Error(error.message)
  return true
}

// Replace ALL delivery zones for a restaurant with a new set of tiers in one shot.
// Each tier: { minDistance, maxDistance, baseFee }
export async function bulkApplyDeliveryTiers(
  restaurantId: string,
  tiers: { minDistance: number; maxDistance: number; baseFee: number }[],
) {
  const supabase = getAdminClient()

  // Delete existing zones
  const { error: delError } = await supabase
    .from("delivery_zones")
    .delete()
    .eq("restaurant_id", restaurantId)

  if (delError) throw new Error(delError.message)

  // Insert the new tiers (skip any with no base fee set)
  const rows = tiers
    .filter((t) => t.baseFee > 0)
    .map((t, i) => ({
      restaurant_id: restaurantId,
      zone_name: `Tier ${i + 1} (${t.minDistance}–${t.maxDistance} mi)`,
      min_distance: t.minDistance,
      max_distance: t.maxDistance,
      base_fee: t.baseFee,
      per_item_surcharge: 0,
      min_items_for_surcharge: 50,
      display_order: i,
      is_active: true,
    }))

  if (rows.length === 0) return []

  const { data, error: insError } = await supabase
    .from("delivery_zones")
    .insert(rows)
    .select()

  if (insError) throw new Error(insError.message)
  return data
}

// Transfer an order to a different branch
export async function transferOrder(
  orderId: string,
  targetBranchId: string,
  reason?: string,
) {
  "use server"
  const supabase = getAdminClient()

  // Get the current order
  const { data: order, error: fetchError } = await supabase
    .from("orders")
    .select("id, branch_id, restaurant_id, order_number, customer_name")
    .eq("id", orderId)
    .single()

  if (fetchError || !order) throw new Error("Order not found")

  // Get target branch info
  const { data: targetBranch, error: branchError } = await supabase
    .from("branches")
    .select("id, name, restaurant_id")
    .eq("id", targetBranchId)
    .single()

  if (branchError || !targetBranch) throw new Error("Target branch not found")

  // Ensure same restaurant
  if (targetBranch.restaurant_id !== order.restaurant_id) {
    throw new Error("Cannot transfer order to a branch of a different restaurant")
  }

  // Get full order for special instructions append
  const { data: fullOrder } = await supabase
    .from("orders")
    .select("special_instructions")
    .eq("id", orderId)
    .single()

  const transferNote = `[TRANSFERIDO a ${targetBranch.name}${reason ? `: ${reason}` : ""}]`
  const updatedInstructions = fullOrder?.special_instructions
    ? `${fullOrder.special_instructions}\n${transferNote}`
    : transferNote

  // Update the order's branch_id
  const { error: updateError } = await supabase
    .from("orders")
    .update({
      branch_id: targetBranchId,
      special_instructions: updatedInstructions,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId)

  if (updateError) throw new Error(updateError.message)

  return { success: true, targetBranchName: targetBranch.name }
}

export async function copyItemOption(
  sourceOptionId: string,
  targetMenuItemIds: string[],
): Promise<{ success: boolean; copiedCount: number }> {
  const supabase = getAdminClient()

  // Get the source option with its choices
  const { data: sourceOption, error: optionError } = await supabase
    .from("item_options")
    .select("*, item_option_choices(*)")
    .eq("id", sourceOptionId)
    .single()

  if (optionError || !sourceOption) {
    throw new Error(optionError?.message || "Option not found")
  }

  let copiedCount = 0

  for (const targetMenuItemId of targetMenuItemIds) {
    // Create the option for the target menu item
    const { data: newOption, error: insertError } = await supabase
      .from("item_options")
      .insert({
        menu_item_id: targetMenuItemId,
        category: sourceOption.category,
        is_required: sourceOption.is_required,
        min_selection: sourceOption.min_selection,
        max_selection: sourceOption.max_selection,
        display_type: sourceOption.display_type,
        display_order: sourceOption.display_order,
      })
      .select()
      .single()

    if (insertError || !newOption) {
      console.error(`Failed to copy option to menu item ${targetMenuItemId}:`, insertError)
      continue
    }

    // Copy all choices
    if (sourceOption.item_option_choices && sourceOption.item_option_choices.length > 0) {
      const choicesToInsert = sourceOption.item_option_choices.map((choice: any) => ({
        item_option_id: newOption.id,
        name: choice.name,
        price_modifier: choice.price_modifier,
        display_order: choice.display_order,
        parent_choice_id: null, // Reset parent_choice_id for copied choices
      }))

      const { error: choicesError } = await supabase.from("item_option_choices").insert(choicesToInsert)

      if (choicesError) {
        console.error(`Failed to copy choices for option ${newOption.id}:`, choicesError)
      }
    }

    copiedCount++
  }

  return { success: true, copiedCount }
}

export async function getAllSizesFromOtherItems(
  restaurantId: string,
  currentMenuItemId: string,
): Promise<
  Array<{
    size: any
    menuItemName: string
    menuItemId: string
  }>
> {
  const supabase = getAdminClient()

  // Get all menu items for this restaurant except the current one
  const { data: menuItems, error: menuError } = await supabase
    .from("menu_items")
    .select("id, name")
    .eq("restaurant_id", restaurantId)
    .neq("id", currentMenuItemId)

  if (menuError) throw new Error(menuError.message)
  if (!menuItems || menuItems.length === 0) return []

  const menuItemIds = menuItems.map((item) => item.id)
  const menuItemMap = new Map(menuItems.map((item) => [item.id, item.name]))

  // Get all sizes from these menu items
  const { data: sizes, error: sizesError } = await supabase
    .from("item_sizes")
    .select("*")
    .in("menu_item_id", menuItemIds)
    .order("display_order")

  if (sizesError) throw new Error(sizesError.message)

  return (sizes || []).map((size) => ({
    size,
    menuItemName: menuItemMap.get(size.menu_item_id) || "Unknown Item",
    menuItemId: size.menu_item_id,
  }))
}

export async function copySizeToMenuItem(
  sourceSize: { name: string; price: number; serves: number; is_default: boolean },
  targetMenuItemId: string,
): Promise<void> {
  const supabase = getAdminClient()

  // Get current max display_order for target item
  const { data: existing } = await supabase
    .from("item_sizes")
    .select("display_order")
    .eq("menu_item_id", targetMenuItemId)
    .order("display_order", { ascending: false })
    .limit(1)

  const nextOrder = existing && existing.length > 0 ? (existing[0].display_order || 0) + 1 : 0

  const { error } = await supabase.from("item_sizes").insert({
    menu_item_id: targetMenuItemId,
    name: sourceSize.name,
    price: sourceSize.price,
    serves: sourceSize.serves || 1,
    is_default: sourceSize.is_default || false,
    display_order: nextOrder,
  })

  if (error) throw new Error(error.message)
}

export async function getAllAddonsFromOtherPackages(
  restaurantId: string,
  currentPackageId: string,
): Promise<
  Array<{
    addon: any
    packageName: string
    packageId: string
  }>
> {
  const supabase = getAdminClient()

  // Get all service packages for this restaurant except the current one
  const { data: packages, error: pkgError } = await supabase
    .from("service_packages")
    .select("id, name")
    .eq("restaurant_id", restaurantId)
    .neq("id", currentPackageId)

  if (pkgError) throw new Error(pkgError.message)
  if (!packages || packages.length === 0) return []

  const packageIds = packages.map((pkg) => pkg.id)
  const packageMap = new Map(packages.map((pkg) => [pkg.id, pkg.name]))

  // Get all addons from these packages
  const { data: addons, error: addonsError } = await supabase
    .from("package_addons")
    .select("*")
    .in("package_id", packageIds)
    .order("display_order")

  if (addonsError) throw new Error(addonsError.message)

  return (addons || []).map((addon) => ({
    addon,
    packageName: packageMap.get(addon.package_id) || "Unknown Package",
    packageId: addon.package_id,
  }))
}

export async function getAllOptionsFromOtherItems(
  restaurantId: string,
  currentMenuItemId: string,
): Promise<
  Array<{
    option: any
    menuItemName: string
    menuItemId: string
  }>
> {
  const supabase = getAdminClient()

  // Get all menu items for this restaurant except the current one
  const { data: menuItems, error: menuError } = await supabase
    .from("menu_items")
    .select("id, name")
    .eq("restaurant_id", restaurantId)
    .neq("id", currentMenuItemId)

  if (menuError) throw new Error(menuError.message)
  if (!menuItems || menuItems.length === 0) return []

  const menuItemIds = menuItems.map((item) => item.id)
  const menuItemMap = new Map(menuItems.map((item) => [item.id, item.name]))

  // Get all options from these menu items with their choices
  const { data: options, error: optionsError } = await supabase
    .from("item_options")
    .select("*, item_option_choices(*)")
    .in("menu_item_id", menuItemIds)
    .order("category")

  if (optionsError) throw new Error(optionsError.message)

  // Return options with their source menu item names
  return (options || []).map((option) => ({
    option,
    menuItemName: menuItemMap.get(option.menu_item_id) || "Unknown Item",
    menuItemId: option.menu_item_id,
  }))
}

// Bulk Import Function for CSV Menu Upload
export async function bulkImportMenuItems(
  restaurantId: string,
  items: Array<{
    category_name: string
    item_name: string
    description?: string
    price: number
    is_active?: boolean
  }>,
) {
  const supabase = getAdminClient()

  // First, get existing categories for this restaurant
  const { data: existingCategories, error: catError } = await supabase
    .from("categories")
    .select("id, name")
    .eq("restaurant_id", restaurantId)

  if (catError) throw new Error(`Failed to fetch categories: ${catError.message}`)

  // Create a map of category names to IDs (case-insensitive for matching)
  const categoryMap = new Map<string, string>()
  existingCategories?.forEach((cat) => {
    categoryMap.set(cat.name.toLowerCase().trim(), cat.id)
  })

  // Find unique new categories that need to be created (preserve original case)
  const newCategoryNames = new Set<string>()
  items.forEach((item) => {
    const categoryKey = item.category_name.toLowerCase().trim()
    if (!categoryMap.has(categoryKey)) {
      newCategoryNames.add(item.category_name.trim())
    }
  })

  // Create new categories
  if (newCategoryNames.size > 0) {
    const maxOrder = existingCategories?.length || 0
    const newCategories = Array.from(newCategoryNames).map((name, index) => ({
      restaurant_id: restaurantId,
      name, // Preserve original case
      is_active: true,
      display_order: maxOrder + index,
    }))

    const { data: createdCategories, error: createError } = await supabase
      .from("categories")
      .insert(newCategories)
      .select("id, name")

    if (createError) throw new Error(`Failed to create categories: ${createError.message}`)

    // Add new categories to the map
    createdCategories?.forEach((cat) => {
      categoryMap.set(cat.name.toLowerCase().trim(), cat.id)
    })
  }

  const { data: existingItems, error: itemsError } = await supabase
    .from("menu_items")
    .select("id, name, category_id")
    .eq("restaurant_id", restaurantId)

  if (itemsError) throw new Error(`Failed to fetch existing items: ${itemsError.message}`)

  // Create a map of existing items (category_id + name.toLowerCase())
  const existingItemsMap = new Map<string, string>()
  existingItems?.forEach((item) => {
    const key = `${item.category_id}:${item.name.toLowerCase().trim()}`
    existingItemsMap.set(key, item.id)
  })

  // Separate items into updates and inserts
  const itemsToUpdate: Array<{ id: string; updates: any }> = []
  const itemsToInsert: Array<any> = []

  items.forEach((item, index) => {
    const categoryKey = item.category_name.toLowerCase().trim()
    const categoryId = categoryMap.get(categoryKey)
    if (!categoryId) throw new Error(`Category not found: ${item.category_name}`)

    const itemKey = `${categoryId}:${item.item_name.toLowerCase().trim()}`
    const existingItemId = existingItemsMap.get(itemKey)

    const itemData = {
      restaurant_id: restaurantId,
      category_id: categoryId,
      name: item.item_name, // Preserve original case
      description: item.description || "",
      price: item.price,
      is_active: item.is_active ?? true,
      display_order: index,
    }

    if (existingItemId) {
      itemsToUpdate.push({
        id: existingItemId,
        updates: itemData,
      })
    } else {
      itemsToInsert.push(itemData)
    }
  })

  let updatedCount = 0
  let insertedCount = 0

  for (const { id, updates } of itemsToUpdate) {
    const { error: updateError } = await supabase.from("menu_items").update(updates).eq("id", id)

    if (updateError) {
      console.error(`Failed to update item ${id}:`, updateError)
    } else {
      updatedCount++
    }
  }

  if (itemsToInsert.length > 0) {
    const { data: createdItems, error: insertError } = await supabase.from("menu_items").insert(itemsToInsert).select()

    if (insertError) throw new Error(`Failed to import menu items: ${insertError.message}`)
    insertedCount = createdItems?.length || 0
  }

  return {
    success: true,
    itemsCreated: insertedCount,
    itemsUpdated: updatedCount,
    categoriesCreated: newCategoryNames.size,
  }
}

// ---- Branches CRUD ----

export async function getBranches(restaurantId: string) {
  const supabase = getAdminClient()
  const { data, error } = await supabase
    .from("branches")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("display_order", { ascending: true })

  if (error) throw new Error(error.message)
  return data || []
}

export async function createBranch(data: {
  restaurant_id: string
  name: string
  slug: string
  address?: string
  city?: string
  state?: string
  zip?: string
  phone?: string
  image_url?: string
  delivery_fee?: number | null
  delivery_lead_time_hours?: number | null
  pickup_lead_time_hours?: number | null
  max_advance_days?: number | null
  shipday_api_key?: string | null
  delivery_enabled?: boolean
  pickup_enabled?: boolean
  is_active?: boolean
  display_order?: number
}) {
  const supabase = getAdminClient()
  const { data: branch, error } = await supabase.from("branches").insert(data).select().single()

  if (error) throw new Error(error.message)
  return branch
}

export async function updateBranch(
  id: string,
  data: {
    name?: string
    slug?: string
    address?: string
    city?: string
    state?: string
    zip?: string
    phone?: string
    image_url?: string
    delivery_fee?: number | null
    delivery_lead_time_hours?: number | null
    pickup_lead_time_hours?: number | null
    max_advance_days?: number | null
    shipday_api_key?: string | null
    delivery_enabled?: boolean
    pickup_enabled?: boolean
    is_active?: boolean
    display_order?: number
  },
) {
  const supabase = getAdminClient()
  const { data: branch, error } = await supabase.from("branches").update(data).eq("id", id).select().single()

  if (error) throw new Error(error.message)
  return branch
}

export async function deleteBranch(id: string) {
  const supabase = getAdminClient()
  const { error } = await supabase.from("branches").delete().eq("id", id)

  if (error) throw new Error(error.message)
  return true
}

// ---- Branch Menu Overrides ----

export async function getBranchMenuOverrides(branchId: string) {
  const supabase = getAdminClient()
  const { data, error } = await supabase
    .from("branch_menu_overrides")
    .select("*")
    .eq("branch_id", branchId)

  if (error) throw new Error(error.message)
  return data || []
}

export async function upsertBranchMenuOverride(data: {
  branch_id: string
  menu_item_id: string
  price_override?: number | null
  is_hidden?: boolean
}) {
  const supabase = getAdminClient()
  const { data: override, error } = await supabase
    .from("branch_menu_overrides")
    .upsert(
      {
        branch_id: data.branch_id,
        menu_item_id: data.menu_item_id,
        price_override: data.price_override ?? null,
        is_hidden: data.is_hidden ?? false,
      },
      { onConflict: "branch_id,menu_item_id" }
    )
    .select()
    .single()

  if (error) throw new Error(error.message)
  return override
}

export async function deleteBranchMenuOverride(branchId: string, menuItemId: string) {
  const supabase = getAdminClient()
  const { error } = await supabase
    .from("branch_menu_overrides")
    .delete()
    .eq("branch_id", branchId)
    .eq("menu_item_id", menuItemId)

  if (error) throw new Error(error.message)
  return true
}

export async function updateServicePackagesVisibility(restaurantId: string, isVisible: boolean) {
  const supabase = getAdminClient()

  const { error } = await supabase
    .from("restaurants")
    .update({ show_service_packages: isVisible })
    .eq("id", restaurantId)

  if (error) {
    console.error("Error updating service packages visibility:", error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

// Operating Hours
export interface OperatingHourEntry {
  day_of_week: number // 0=Sunday, 1=Monday, ..., 6=Saturday
  is_open: boolean
  open_time: string // "HH:mm" format
  close_time: string // "HH:mm" format
}

export async function getOperatingHours(restaurantId: string, branchId?: string | null) {
  const supabase = getAdminClient()

  let query = supabase
    .from("operating_hours")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("day_of_week", { ascending: true })

  if (branchId) {
    query = query.eq("branch_id", branchId)
  } else {
    query = query.is("branch_id", null)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data || []
}

export async function saveOperatingHours(
  restaurantId: string,
  hours: OperatingHourEntry[],
  branchId?: string | null
) {
  const supabase = getAdminClient()

  // Delete existing hours for this restaurant/branch combo
  let deleteQuery = supabase
    .from("operating_hours")
    .delete()
    .eq("restaurant_id", restaurantId)

  if (branchId) {
    deleteQuery = deleteQuery.eq("branch_id", branchId)
  } else {
    deleteQuery = deleteQuery.is("branch_id", null)
  }

  const { error: deleteError } = await deleteQuery
  if (deleteError) {
    console.error("Error deleting old operating hours:", deleteError)
    return { success: false, error: deleteError.message }
  }

  // Insert new hours
  const rows = hours.map((h) => ({
    restaurant_id: restaurantId,
    branch_id: branchId || null,
    day_of_week: h.day_of_week,
    is_open: h.is_open,
    open_time: h.is_open ? h.open_time : null,
    close_time: h.is_open ? h.close_time : null,
  }))

  const { error: insertError } = await supabase
    .from("operating_hours")
    .insert(rows)

  if (insertError) {
    console.error("Error inserting operating hours:", insertError)
    return { success: false, error: insertError.message }
  }

  return { success: true }
}
