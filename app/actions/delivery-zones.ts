"use server"

import { createServerClient } from "@/lib/supabase/server"

interface CalculateDeliveryFeeParams {
  restaurantId: string
  deliveryAddress: string
  restaurantAddress: string
  itemCount: number
}

interface CalculateDeliveryFeeResult {
  success: boolean
  fee: number           // Full fee — used for order totals, reporting, payment
  displayedFee: number  // Subsidy-reduced fee shown to the customer
  distance: number
  zoneName: string
  itemSurcharge: number
  error?: string
}

// Calculate delivery fee based on distance and item count
export async function calculateDeliveryFee(params: CalculateDeliveryFeeParams): Promise<CalculateDeliveryFeeResult> {
  try {
    const { restaurantId, deliveryAddress, restaurantAddress, itemCount } = params

    // Calculate distance using Google Maps Distance Matrix API
    const distance = await calculateDistance(restaurantAddress, deliveryAddress)

    if (distance === null) {
      return {
        success: false,
        fee: 0,
        displayedFee: 0,
        distance: 0,
        zoneName: "",
        itemSurcharge: 0,
        error: "Could not calculate distance. Please check the delivery address.",
      }
    }

    // Fetch delivery zones + platform subsidy in parallel
    const supabase = await createServerClient()
    const [zonesResult, settingsResult] = await Promise.all([
      supabase
        .from("delivery_zones")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .eq("is_active", true)
        .order("display_order", { ascending: true }),
      supabase
        .from("platform_settings")
        .select("delivery_fee_subsidy")
        .limit(1)
        .single(),
    ])

    const subsidy = Number(settingsResult.data?.delivery_fee_subsidy ?? 3.0)
    const { data: zones, error } = zonesResult

    if (error || !zones || zones.length === 0) {
      // No zones configured — delivery unavailable
      return {
        success: false,
        fee: 0,
        displayedFee: 0,
        distance,
        zoneName: "",
        itemSurcharge: 0,
        error: "Delivery zones not configured for this restaurant.",
      }
    }

    // Find matching zone
    const matchingZone = zones.find((zone) => distance >= zone.min_distance && distance <= zone.max_distance)

    if (!matchingZone) {
      // Distance outside all zones
      return {
        success: false,
        fee: 0,
        displayedFee: 0,
        distance,
        zoneName: "",
        itemSurcharge: 0,
        error: `Delivery not available for ${distance.toFixed(1)} miles. Maximum delivery distance is ${Math.max(...zones.map((z) => z.max_distance))} miles.`,
      }
    }

    // Calculate item surcharge if applicable
    let itemSurcharge = 0
    if (itemCount > matchingZone.min_items_for_surcharge && matchingZone.per_item_surcharge > 0) {
      const extraItems = itemCount - matchingZone.min_items_for_surcharge
      itemSurcharge = extraItems * matchingZone.per_item_surcharge
    }

    const totalFee = Number(matchingZone.base_fee) + itemSurcharge

    return {
      success: true,
      fee: totalFee,
      displayedFee: Math.max(0, totalFee - subsidy),
      distance,
      zoneName: matchingZone.zone_name,
      itemSurcharge,
    }
  } catch (error) {
    console.error("[v0] Error calculating delivery fee:", error)
    return {
      success: false,
      fee: 0,
      displayedFee: 0,
      distance: 0,
      zoneName: "",
      itemSurcharge: 0,
      error: "Failed to calculate delivery fee. Please try again.",
    }
  }
}

// Calculate delivery fee using customer lat/lng directly (no geocoding needed)
export async function calculateDeliveryFeeByCoords(params: {
  restaurantId: string
  customerLat: number
  customerLng: number
  restaurantLat: number
  restaurantLng: number
  itemCount: number
}): Promise<CalculateDeliveryFeeResult> {
  try {
    const { restaurantId, customerLat, customerLng, restaurantLat, restaurantLng, itemCount } = params

    const distance = haversineDistance(restaurantLat, restaurantLng, customerLat, customerLng)

    const supabase = await createServerClient()
    const [zonesResult, settingsResult] = await Promise.all([
      supabase
        .from("delivery_zones")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .eq("is_active", true)
        .order("display_order", { ascending: true }),
      supabase
        .from("platform_settings")
        .select("delivery_fee_subsidy")
        .limit(1)
        .single(),
    ])

    const subsidy = Number(settingsResult.data?.delivery_fee_subsidy ?? 3.0)
    const { data: zones, error } = zonesResult

    if (error || !zones || zones.length === 0) {
      return { success: false, fee: 0, displayedFee: 0, distance, zoneName: "", itemSurcharge: 0, error: "Delivery zones not configured." }
    }

    const matchingZone = zones.find((z) => distance >= z.min_distance && distance <= z.max_distance)
    if (!matchingZone) {
      return {
        success: false, fee: 0, displayedFee: 0, distance, zoneName: "", itemSurcharge: 0,
        error: `Delivery not available for ${distance.toFixed(1)} miles. Maximum is ${Math.max(...zones.map((z) => z.max_distance))} miles.`,
      }
    }

    let itemSurcharge = 0
    if (itemCount > matchingZone.min_items_for_surcharge && matchingZone.per_item_surcharge > 0) {
      itemSurcharge = (itemCount - matchingZone.min_items_for_surcharge) * matchingZone.per_item_surcharge
    }

    const totalFee = Number(matchingZone.base_fee) + itemSurcharge
    return {
      success: true,
      fee: totalFee,
      displayedFee: Math.max(0, totalFee - subsidy),
      distance,
      zoneName: matchingZone.zone_name,
      itemSurcharge,
    }
  } catch (error) {
    console.error("[v0] Error calculating delivery fee by coords:", error)
    return { success: false, fee: 0, displayedFee: 0, distance: 0, zoneName: "", itemSurcharge: 0, error: "Failed to calculate delivery fee." }
  }
}

// Haversine formula to calculate distance between two lat/lng points in miles
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8 // Earth radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Geocode an address to lat/lng using Google Maps Geocoding API
async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!apiKey) return null

    const url = new URL("https://maps.googleapis.com/maps/api/geocode/json")
    url.searchParams.append("address", address)
    url.searchParams.append("key", apiKey)

    const response = await fetch(url.toString())
    const data = await response.json()

    if (data.status !== "OK" || !data.results || data.results.length === 0) return null

    const { lat, lng } = data.results[0].geometry.location
    return { lat, lng }
  } catch {
    return null
  }
}

interface CheckDeliveryZoneResult {
  inZone: boolean
  distance: number | null
  radius: number
  closerBranch: { id: string; name: string; address: string; distance: number } | null
}

// Check if a delivery address is within the branch's delivery radius.
// If out of zone, find the closest branch from the same restaurant.
export async function checkDeliveryZone(
  restaurantId: string,
  branchId: string,
  deliveryAddress: string
): Promise<CheckDeliveryZoneResult> {
  const defaultResult: CheckDeliveryZoneResult = { inZone: true, distance: null, radius: 7, closerBranch: null }

  try {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!apiKey) return defaultResult // No Google key -- skip check, allow order

    const supabase = await createServerClient()

    // Get all branches for this restaurant
    const { data: branches, error } = await supabase
      .from("branches")
      .select("id, name, address, city, state, zip, latitude, longitude, delivery_radius")
      .eq("restaurant_id", restaurantId)
      .eq("is_active", true)

    if (error || !branches || branches.length === 0) return defaultResult

    // Get the restaurant-level default radius
    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("delivery_radius")
      .eq("id", restaurantId)
      .single()

    const defaultRadius = restaurant?.delivery_radius ?? 7.0

    // Find the current branch
    const currentBranch = branches.find((b) => b.id === branchId)
    if (!currentBranch) return defaultResult

    const branchRadius = currentBranch.delivery_radius ?? defaultRadius

    // Geocode the delivery address
    const customerCoords = await geocodeAddress(deliveryAddress)
    if (!customerCoords) return defaultResult // Can't geocode -- allow order

    // If branch has lat/lng, use Haversine; otherwise use Google Distance Matrix
    let distanceToBranch: number | null = null

    if (currentBranch.latitude && currentBranch.longitude) {
      distanceToBranch = haversineDistance(
        currentBranch.latitude, currentBranch.longitude,
        customerCoords.lat, customerCoords.lng
      )
    } else {
      // Fallback: use the branch address string
      const branchAddr = [currentBranch.address, currentBranch.city, currentBranch.state, currentBranch.zip].filter(Boolean).join(", ")
      distanceToBranch = await calculateDistance(branchAddr, deliveryAddress)
    }

    if (distanceToBranch === null) return defaultResult

    const inZone = distanceToBranch <= branchRadius

    // If in zone, return early
    if (inZone) {
      return { inZone: true, distance: distanceToBranch, radius: branchRadius, closerBranch: null }
    }

    // Out of zone -- find the closest branch
    let closerBranch: CheckDeliveryZoneResult["closerBranch"] = null

    const otherBranches = branches.filter((b) => b.id !== branchId)
    for (const branch of otherBranches) {
      let dist: number | null = null
      if (branch.latitude && branch.longitude) {
        dist = haversineDistance(branch.latitude, branch.longitude, customerCoords.lat, customerCoords.lng)
      } else {
        const addr = [branch.address, branch.city, branch.state, branch.zip].filter(Boolean).join(", ")
        dist = await calculateDistance(addr, deliveryAddress)
      }

      if (dist !== null) {
        const thisBranchRadius = branch.delivery_radius ?? defaultRadius
        if (dist <= thisBranchRadius && (!closerBranch || dist < closerBranch.distance)) {
          closerBranch = {
            id: branch.id,
            name: branch.name,
            address: [branch.address, branch.city, branch.state].filter(Boolean).join(", "),
            distance: Math.round(dist * 10) / 10,
          }
        }
      }
    }

    return {
      inZone: false,
      distance: Math.round(distanceToBranch * 10) / 10,
      radius: branchRadius,
      closerBranch,
    }
  } catch (error) {
    console.error("[v0] Error checking delivery zone:", error)
    return defaultResult
  }
}

// Calculate distance between two addresses using Google Maps Distance Matrix API
async function calculateDistance(origin: string, destination: string): Promise<number | null> {
  try {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

    if (!apiKey) return null

    const url = new URL("https://maps.googleapis.com/maps/api/distancematrix/json")
    url.searchParams.append("origins", origin)
    url.searchParams.append("destinations", destination)
    url.searchParams.append("units", "imperial")
    url.searchParams.append("key", apiKey)

    const response = await fetch(url.toString())
    const data = await response.json()

    if (data.status !== "OK" || !data.rows || data.rows.length === 0) return null

    const element = data.rows[0].elements[0]
    if (element.status !== "OK") return null

    // Convert meters to miles
    const meters = element.distance.value
    const miles = meters / 1609.34

    return miles
  } catch (error) {
    console.error("[v0] Error fetching distance:", error)
    return null
  }
}
