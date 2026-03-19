import { createClient } from "@/lib/supabase/server"
import { SuperAdminClient } from "./components/super-admin-client"

export const dynamic = "force-dynamic"

export default async function SuperAdminPage() {
  const supabase = await createClient()

  // Fetch all restaurants with counts - alphabetically ordered
  const { data: restaurants, error: restaurantsError } = await supabase
    .from("restaurants")
    .select("*")
    .order("name", { ascending: true })

  if (restaurantsError) {
    console.error("Error fetching restaurants:", restaurantsError)
  }

  // Fetch counts - need to handle Supabase's default 1000 row limit
  // Fetch in batches or use count aggregation
  let allMenuCounts: { restaurant_id: string }[] = []
  let offset = 0
  const batchSize = 1000
  
  // Fetch menu items in batches to get all of them
  while (true) {
    const { data: batch, error } = await supabase
      .from("menu_items")
      .select("restaurant_id")
      .range(offset, offset + batchSize - 1)
    
    if (error) {
      console.error("[v0] Super Admin - Error fetching menu items:", error.message)
      break
    }
    
    if (!batch || batch.length === 0) break
    allMenuCounts = [...allMenuCounts, ...batch]
    if (batch.length < batchSize) break
    offset += batchSize
  }
  
  console.log("[v0] Super Admin - Total menu items fetched:", allMenuCounts.length)
  
  // Fetch categories (usually less than 1000 total)
  const { data: categoryCounts } = await supabase
    .from("categories")
    .select("restaurant_id")
  
  // Fetch orders (usually less than 1000 for now)
  const { data: orderCounts } = await supabase
    .from("orders")
    .select("restaurant_id")

  const { data: marketplaceSettings } = await supabase.from("marketplace_settings").select("*").limit(1).single()

  // Fetch platform settings for operations tab
  const { data: platformSettings } = await supabase.from("platform_settings").select("*").single()
  
  // Fetch active scheduled blocks
  const { data: scheduledBlocks } = await supabase
    .from("scheduled_blocks")
    .select("*, restaurants(name)")
    .eq("is_active", true)
    .order("starts_at", { ascending: true })

  // Fetch cuisine types
  const { data: cuisineTypes } = await supabase
    .from("cuisine_types")
    .select("*")
    .eq("is_active", true)
    .order("display_order", { ascending: true })

  // Fetch marketplace areas
  const { data: marketplaceAreas } = await supabase
    .from("marketplace_areas")
    .select("*")
    .eq("is_active", true)
    .order("display_order", { ascending: true })

  // Fetch admin users for admin management tab
  const { data: adminUsers } = await supabase
    .from("admin_users")
    .select("*, restaurants(name, slug)")
    .order("created_at", { ascending: false })

  // Aggregate counts
  const menuCountMap: Record<string, number> = {}
  const orderCountMap: Record<string, number> = {}
  const categoryCountMap: Record<string, number> = {}

  allMenuCounts.forEach((item) => {
    if (item.restaurant_id) {
      menuCountMap[item.restaurant_id] = (menuCountMap[item.restaurant_id] || 0) + 1
    }
  })
  
  console.log("[v0] Super Admin - menuCountMap has", Object.keys(menuCountMap).length, "restaurants with items")

  orderCounts?.forEach((item) => {
    orderCountMap[item.restaurant_id] = (orderCountMap[item.restaurant_id] || 0) + 1
  })

  categoryCounts?.forEach((item) => {
    categoryCountMap[item.restaurant_id] = (categoryCountMap[item.restaurant_id] || 0) + 1
  })

  // Combine data
  const restaurantsWithCounts = (restaurants || []).map((restaurant) => ({
    ...restaurant,
    menu_items_count: menuCountMap[restaurant.id] || 0,
    orders_count: orderCountMap[restaurant.id] || 0,
    categories_count: categoryCountMap[restaurant.id] || 0,
  }))

  return (
    <SuperAdminClient 
      restaurants={restaurantsWithCounts} 
      marketplaceSettings={marketplaceSettings || undefined} 
      initialCuisineTypes={cuisineTypes || []} 
      initialMarketplaceAreas={marketplaceAreas || []}
      platformSettings={platformSettings || undefined}
      scheduledBlocks={scheduledBlocks || []}
      adminUsers={adminUsers || []}
    />
  )
}
