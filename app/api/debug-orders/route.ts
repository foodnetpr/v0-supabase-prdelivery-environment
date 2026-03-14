import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const restaurantSlug = searchParams.get("slug") || "metropol-catering"
  
  const supabase = await createClient()
  
  // Get restaurant
  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id, name, slug")
    .eq("slug", restaurantSlug)
    .single()
  
  if (!restaurant) {
    return NextResponse.json({ error: "Restaurant not found" })
  }
  
  // Get branches for this restaurant
  const { data: branches } = await supabase
    .from("branches")
    .select("id, name, is_active")
    .eq("restaurant_id", restaurant.id)
  
  // Get today's date
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString().split('T')[0]
  
  // Get all orders for this restaurant (recent 20)
  const { data: orders, error } = await supabase
    .from("orders")
    .select("id, order_number, branch_id, status, delivery_type, delivery_date, created_at, customer_name, total")
    .eq("restaurant_id", restaurant.id)
    .order("created_at", { ascending: false })
    .limit(20)
  
  // Get orders that WOULD show in KDS (with today's filter)
  const { data: kdsOrders } = await supabase
    .from("orders")
    .select("id, order_number, branch_id, status, delivery_type, delivery_date")
    .eq("restaurant_id", restaurant.id)
    .in("status", ["pending", "preparing", "ready", "completed", "confirmed"])
    .gte("delivery_date", todayStr)
    .order("created_at", { ascending: false })
    .limit(20)
  
  return NextResponse.json({
    restaurant,
    branches,
    todayStr,
    recentOrders: orders,
    kdsFilteredOrders: kdsOrders,
    ordersError: error?.message,
    analysis: {
      totalOrders: orders?.length || 0,
      kdsVisibleOrders: kdsOrders?.length || 0,
      ordersWithNullBranch: orders?.filter(o => !o.branch_id).length || 0,
      ordersWithNullDeliveryDate: orders?.filter(o => !o.delivery_date).length || 0,
      ordersBeforeToday: orders?.filter(o => o.delivery_date && o.delivery_date < todayStr).length || 0,
    }
  }, { status: 200 })
}
