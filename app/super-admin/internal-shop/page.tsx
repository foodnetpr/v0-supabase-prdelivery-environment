import { createClient } from "@/lib/supabase/server"
import { InternalShopClient } from "./internal-shop-client"

export const dynamic = "force-dynamic"

export default async function InternalShopPage() {
  const supabase = await createClient()

  const { data: items, error } = await supabase
    .from("internal_shop_items")
    .select("*")
    .order("display_order", { ascending: true })
    .order("name", { ascending: true })

  if (error) {
    console.error("Error fetching internal shop items:", error)
  }

  return <InternalShopClient initialItems={items || []} />
}
