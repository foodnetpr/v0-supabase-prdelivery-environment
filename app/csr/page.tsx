import { createClient } from "@/lib/supabase/server"
import { CSRDispatchClient } from "./csr-dispatch-client"

export const dynamic = "force-dynamic"

export default async function CSRDispatchPage() {
  const supabase = await createClient()

  // Get today's date at midnight for filtering
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString().split('T')[0]

  // Fetch orders from today onwards
  const { data: orders } = await supabase
    .from("orders")
    .select(`
      *,
      order_items (id, item_name, quantity, unit_price, total_price, selected_options),
      restaurants (id, name, slug, logo_url, shipday_api_key)
    `)
    .gte("delivery_date", todayStr)
    .order("created_at", { ascending: false })
    .limit(100)

  // Fetch all active restaurants for reference
  const { data: restaurants } = await supabase
    .from("restaurants")
    .select("id, name, slug, logo_url, shipday_api_key")
    .eq("is_active", true)
    .order("name", { ascending: true })

  return (
    <CSRDispatchClient 
      initialOrders={orders || []} 
      restaurants={restaurants || []}
    />
  )
}
