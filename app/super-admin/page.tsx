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

  // Fetch aggregated counts using SQL for accurate results (no row limit issues)
  const { data: menuCountsRaw } = await supabase.rpc('get_menu_item_counts').catch(() => ({ data: null }))
  const { data: orderCountsRaw } = await supabase.rpc('get_order_counts').catch(() => ({ data: null }))
  const { data: categoryCountsRaw } = await supabase.rpc('get_category_counts').catch(() => ({ data: null }))
  
  // Fallback: If RPC functions don't exist, fetch with higher limit
  let menuCounts = menuCountsRaw
  let orderCounts = orderCountsRaw
  let categoryCounts = categoryCountsRaw
  
  if (!menuCounts) {
    const { data } = await supabase.from("menu_items").select("restaurant_id").limit(50000)
    menuCounts = data
  }
  if (!orderCounts) {
    const { data } = await supabase.from("orders").select("restaurant_id").limit(50000)
    orderCounts = data
  }
  if (!categoryCounts) {
    const { data } = await supabase.from("categories").select("restaurant_id").limit(50000)
    categoryCounts = data
  }

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

  // Aggregate counts - handle both RPC format {restaurant_id, count} and raw format {restaurant_id}
  const menuCountMap: Record<string, number> = {}
  const orderCountMap: Record<string, number> = {}
  const categoryCountMap: Record<string, number> = {}

  menuCounts?.forEach((item: any) => {
    if (item.count !== undefined) {
      // RPC format: {restaurant_id, count}
      menuCountMap[item.restaurant_id] = item.count
    } else {
      // Raw format: just {restaurant_id}
      menuCountMap[item.restaurant_id] = (menuCountMap[item.restaurant_id] || 0) + 1
    }
  })

  orderCounts?.forEach((item: any) => {
    if (item.count !== undefined) {
      orderCountMap[item.restaurant_id] = item.count
    } else {
      orderCountMap[item.restaurant_id] = (orderCountMap[item.restaurant_id] || 0) + 1
    }
  })

  categoryCounts?.forEach((item: any) => {
    if (item.count !== undefined) {
      categoryCountMap[item.restaurant_id] = item.count
    } else {
      categoryCountMap[item.restaurant_id] = (categoryCountMap[item.restaurant_id] || 0) + 1
    }
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
