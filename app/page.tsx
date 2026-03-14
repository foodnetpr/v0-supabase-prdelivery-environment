import { createServerClient } from "@/lib/supabase/server"
import { MarketplaceHome } from "@/components/marketplace-home"

export default async function HomePage() {
  console.log("[v0] Marketplace: Fetching restaurants from database")

  const supabase = await createServerClient()

  const { data: restaurants, error } = await supabase
    .from("restaurants")
    .select("id, name, slug, logo_url, marketplace_image_url, primary_color, cuisine_type, city, state, area")
    .eq("is_active", true)
    .eq("show_in_marketplace", true)
    .order("name")

  if (error) {
    console.error("[v0] Error fetching marketplace restaurants:", error)
    return <MarketplaceHome restaurants={[]} />
  }

  console.log("[v0] Marketplace: Found", restaurants?.length || 0, "restaurants")

  const { data: marketplaceSettings } = await supabase.from("marketplace_settings").select("*").limit(1).single()

  // If no restaurants in marketplace, show empty state
  if (!restaurants || restaurants.length === 0) {
    console.log("[v0] Marketplace: No restaurants found, showing empty state")
    return <MarketplaceHome restaurants={[]} marketplaceSettings={marketplaceSettings || undefined} />
  }

  return <MarketplaceHome restaurants={restaurants} marketplaceSettings={marketplaceSettings || undefined} />
}
