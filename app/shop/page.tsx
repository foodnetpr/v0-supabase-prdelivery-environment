import { createClient } from "@/lib/supabase/server"
import { ShopClient } from "./shop-client"
import type { Metadata } from "next"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "FoodNet Shop — Bebidas & Extras",
  description: "Agrega bebidas y extras a tu pedido.",
}

export default async function ShopPage() {
  const supabase = await createClient()

  const { data: items } = await supabase
    .from("internal_shop_items")
    .select("*")
    .eq("is_active", true)
    .order("display_order", { ascending: true })
    .order("name", { ascending: true })

  return <ShopClient initialItems={items || []} />
}
