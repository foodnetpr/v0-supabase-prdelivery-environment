import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { OrdersDisplay } from "@/components/orders-display"

export default async function OrdersPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()

  // Get restaurant
  const { data: restaurant } = await supabase.from("restaurants").select("id, name, slug").eq("slug", slug).single()

  if (!restaurant) {
    redirect("/")
  }

  // Get initial orders
  const { data: orders } = await supabase
    .from("orders")
    .select(`
      *,
      order_items (
        id,
        item_name,
        quantity,
        unit_price,
        total_price,
        selected_options
      )
    `)
    .eq("restaurant_id", restaurant.id)
    .order("created_at", { ascending: false })
    .limit(50)

  return <OrdersDisplay restaurant={restaurant} initialOrders={orders || []} />
}
