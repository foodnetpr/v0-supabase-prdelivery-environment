import { createServerClient } from "@/lib/supabase/server"
import { MarketplaceHome } from "@/components/marketplace-home"

/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in miles
 */
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3959 // Earth's radius in miles
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180)
}

interface SearchParams {
  mode?: string
  lat?: string
  lng?: string
  address?: string
}

export default async function HomePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams
  const mode = params.mode || "all"
  const userLat = params.lat ? parseFloat(params.lat) : null
  const userLng = params.lng ? parseFloat(params.lng) : null
  const deliveryAddress = params.address || null

  const supabase = await createServerClient()

  // Base query for restaurants
  let query = supabase
    .from("restaurants")
    .select("id, name, slug, logo_url, marketplace_image_url, primary_color, cuisine_type, city, state, area, latitude, longitude, delivery_radius_miles, delivery_enabled, pickup_enabled")
    .eq("is_active", true)
    .eq("show_in_marketplace", true)

  // If in delivery mode, only show restaurants with delivery enabled
  if (mode === "delivery") {
    query = query.eq("delivery_enabled", true)
  }

  // If in pickup mode, only show restaurants with pickup enabled  
  if (mode === "pickup") {
    query = query.eq("pickup_enabled", true)
  }

  const { data: restaurants, error } = await query.order("name")

  if (error) {
    console.error("Error fetching marketplace restaurants:", error)
    return <MarketplaceHome restaurants={[]} />
  }

  const { data: marketplaceSettings } = await supabase.from("marketplace_settings").select("*").limit(1).single()

  // If no restaurants in marketplace, show empty state
  if (!restaurants || restaurants.length === 0) {
    return <MarketplaceHome restaurants={[]} marketplaceSettings={marketplaceSettings || undefined} />
  }

  // In delivery mode with user location, filter and sort by distance
  let filteredRestaurants = restaurants

  if (mode === "delivery" && userLat && userLng) {
    filteredRestaurants = restaurants
      .filter((restaurant) => {
        // Skip if no coordinates
        if (!restaurant.latitude || !restaurant.longitude) {
          return false
        }

        const distance = calculateDistance(
          userLat,
          userLng,
          parseFloat(restaurant.latitude),
          parseFloat(restaurant.longitude)
        )

        const deliveryRadius = restaurant.delivery_radius_miles || 10
        return distance <= deliveryRadius
      })
      .map((restaurant) => {
        const distance = calculateDistance(
          userLat,
          userLng,
          parseFloat(restaurant.latitude!),
          parseFloat(restaurant.longitude!)
        )
        return { ...restaurant, distance }
      })
      .sort((a, b) => (a.distance || 0) - (b.distance || 0))
  }

  return (
    <MarketplaceHome 
      restaurants={filteredRestaurants} 
      marketplaceSettings={marketplaceSettings || undefined}
      deliveryMode={mode === "delivery"}
      deliveryAddress={deliveryAddress}
    />
  )
}
