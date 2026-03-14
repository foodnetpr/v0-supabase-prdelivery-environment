import { createClient } from "@/lib/supabase/server"
import { SuperAdminClient } from "./components/super-admin-client"

export const dynamic = "force-dynamic"

export default async function SuperAdminPage() {
  const supabase = await createClient()

  // Fetch all restaurants with counts
  const { data: restaurants, error: restaurantsError } = await supabase
    .from("restaurants")
    .select("*")
    .order("created_at", { ascending: false })

  if (restaurantsError) {
    console.error("Error fetching restaurants:", restaurantsError)
  }

  // Fetch counts with higher limit to avoid default 1000 row cap
  const { data: menuCounts, error: menuError } = await supabase
    .from("menu_items")
    .select("restaurant_id")
    .limit(100000)
  
  console.log("[v0] Super Admin - menuCounts fetched:", menuCounts?.length, "error:", menuError?.message)
  
  const { data: orderCounts } = await supabase
    .from("orders")
    .select("restaurant_id")
    .limit(100000)
  
  const { data: categoryCounts } = await supabase
    .from("categories")
    .select("restaurant_id")
    .limit(100000)

  const { data: marketplaceSettings } = await supabase.from("marketplace_settings").select("*").limit(1).single()

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

  // Aggregate counts
  const menuCountMap: Record<string, number> = {}
  const orderCountMap: Record<string, number> = {}
  const categoryCountMap: Record<string, number> = {}

  menuCounts?.forEach((item) => {
    if (item.restaurant_id) {
      menuCountMap[item.restaurant_id] = (menuCountMap[item.restaurant_id] || 0) + 1
    }
  })
  
  console.log("[v0] Super Admin - menuCountMap keys:", Object.keys(menuCountMap).length, "sample:", Object.entries(menuCountMap).slice(0, 3))

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

  return <SuperAdminClient restaurants={restaurantsWithCounts} marketplaceSettings={marketplaceSettings || undefined} initialCuisineTypes={cuisineTypes || []} initialMarketplaceAreas={marketplaceAreas || []} />
}
