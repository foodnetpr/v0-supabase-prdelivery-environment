import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { ShopClient } from "./shop-client"
import { isInternalShopAvailable } from "@/lib/availability"
import type { Metadata } from "next"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "FoodNet Shop — Bebidas & Extras",
  description: "Agrega bebidas y extras a tu pedido.",
}

export default async function ShopPage() {
  // Check if shop is available - redirect to home if closed
  const shopAvailable = await isInternalShopAvailable()
  if (!shopAvailable) {
    redirect("/")
  }

  const supabase = await createClient()

  const { data: items } = await supabase
    .from("internal_shop_items")
    .select("*")
    .eq("is_active", true)
    .order("display_order", { ascending: true })
    .order("name", { ascending: true })

  return <ShopClient initialItems={items || []} />
}
