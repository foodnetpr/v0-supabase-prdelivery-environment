import { createServerClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

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

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const lat = searchParams.get("lat")
  const lng = searchParams.get("lng")

  if (!lat || !lng) {
    return NextResponse.json(
      { error: "Missing latitude or longitude" },
      { status: 400 }
    )
  }

  const userLat = parseFloat(lat)
  const userLng = parseFloat(lng)

  if (isNaN(userLat) || isNaN(userLng)) {
    return NextResponse.json(
      { error: "Invalid latitude or longitude" },
      { status: 400 }
    )
  }

  try {
    const supabase = await createServerClient()

    // Fetch all active restaurants that deliver
    const { data: restaurants, error } = await supabase
      .from("restaurants")
      .select(`
        id,
        name,
        slug,
        logo_url,
        marketplace_image_url,
        primary_color,
        cuisine_type,
        city,
        state,
        area,
        latitude,
        longitude,
        delivery_radius_miles,
        delivery_enabled
      `)
      .eq("is_active", true)
      .eq("show_in_marketplace", true)
      .eq("delivery_enabled", true)

    if (error) {
      console.error("Error fetching restaurants:", error)
      return NextResponse.json(
        { error: "Failed to fetch restaurants" },
        { status: 500 }
      )
    }

    // Filter restaurants by delivery radius and calculate distance
    const nearbyRestaurants = restaurants
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

        return {
          ...restaurant,
          distance: Math.round(distance * 10) / 10, // Round to 1 decimal
        }
      })
      .sort((a, b) => a.distance - b.distance) // Sort by distance

    return NextResponse.json({
      restaurants: nearbyRestaurants,
      count: nearbyRestaurants.length,
    })
  } catch (error) {
    console.error("Error in nearby restaurants API:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
