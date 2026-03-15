import { createServerClient } from "@/lib/supabase/server"
import { MarketplaceHome } from "@/components/marketplace-home"

export default async function HomePage() {
  const supabase = await createServerClient()

  // Fetch all marketplace restaurants with coordinates for client-side filtering
  const { data: restaurants, error } = await supabase
    .from("restaurants")
    .select("id, name, slug, logo_url, marketplace_image_url, primary_color, cuisine_type, city, state, area, latitude, longitude, delivery_radius_miles, delivery_enabled")
    .eq("is_active", true)
    .eq("show_in_marketplace", true)
    .order("name")

  if (error) {
    console.error("Error fetching marketplace restaurants:", error)
    return <MarketplaceHome restaurants={[]} />
  }

  const { data: marketplaceSettings } = await supabase.from("marketplace_settings").select("*").limit(1).single()

  return (
    <MarketplaceHome 
      restaurants={restaurants || []} 
      marketplaceSettings={marketplaceSettings || undefined}
    />
  )
}
