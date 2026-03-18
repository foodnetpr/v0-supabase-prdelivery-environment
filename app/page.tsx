import { createServerClient } from "@/lib/supabase/server"
import { MarketplaceHome } from "@/components/marketplace-home"
import { getRestaurantsOpenStatus } from "@/lib/availability"

export default async function HomePage() {
  const supabase = await createServerClient()

  // Fetch all marketplace restaurants with coordinates for client-side filtering
  const { data: restaurants, error } = await supabase
    .from("restaurants")
    .select("id, name, slug, logo_url, marketplace_image_url, primary_color, cuisine_type, cuisine_types, city, state, area, latitude, longitude, delivery_radius_miles, delivery_zip_codes, delivery_enabled")
    .eq("is_active", true)
    .eq("show_in_marketplace", true)
    .order("name")

  if (error) {
    console.error("Error fetching marketplace restaurants:", error)
    return <MarketplaceHome restaurants={[]} cuisineTypes={[]} />
  }

  // Get open/closed status for all restaurants
  const restaurantIds = restaurants?.map(r => r.id) || []
  const openStatusMap = await getRestaurantsOpenStatus(restaurantIds)
  
  // Merge open status into restaurant data
  const restaurantsWithStatus = restaurants?.map(r => {
    const status = openStatusMap.get(r.id)
    return {
      ...r,
      isOpen: status?.isOpen ?? true,
      nextOpenTime: status?.nextOpenTime ?? null,
    }
  }) || []

  // Fetch cuisine types from database
  const { data: cuisineTypes } = await supabase
    .from("cuisine_types")
    .select("id, name, icon_url, display_order")
    .eq("is_active", true)
    .order("display_order")

  const { data: marketplaceSettings } = await supabase.from("marketplace_settings").select("*").limit(1).single()

  const { data: platformSettings } = await supabase
    .from("platform_settings")
    .select("blocked_zip_codes")
    .limit(1)
    .single()

  return (
    <MarketplaceHome 
      restaurants={restaurantsWithStatus} 
      marketplaceSettings={marketplaceSettings || undefined}
      cuisineTypes={cuisineTypes || []}
      blockedZipCodes={platformSettings?.blocked_zip_codes || []}
    />
  )
}
