import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const placeId = searchParams.get("place_id") || searchParams.get("placeId")

  if (!placeId) {
    return NextResponse.json({ error: "Place ID required" }, { status: 400 })
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  if (!apiKey) {
    return NextResponse.json({ error: "API key not configured" }, { status: 500 })
  }

  try {
    // Use legacy Places API - Place Details
    const url = new URL("https://maps.googleapis.com/maps/api/place/details/json")
    url.searchParams.set("place_id", placeId)
    url.searchParams.set("key", apiKey)
    url.searchParams.set("fields", "geometry,address_components,formatted_address")
    // No language= param — preserves accurate short_name values for state abbreviations

    const response = await fetch(url.toString())

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch place details" }, { status: 500 })
    }

    const data = await response.json()

    if (data.status !== "OK") {
      return NextResponse.json({ error: "Failed to fetch place details" }, { status: 500 })
    }

    const result = data.result || {}

    // Parse address components
    let streetNumber = ""
    let route = ""
    let city = ""
    let state = ""
    let zip = ""

    for (const comp of result.address_components || []) {
      const types = comp.types || []

      if (types.includes("street_number")) {
        streetNumber = comp.long_name || ""
      }
      if (types.includes("route")) {
        route = comp.long_name || ""
      }
      if (types.includes("locality")) {
        city = comp.long_name || ""
      }
      if (!city && types.includes("sublocality_level_1")) {
        city = comp.long_name || ""
      }
      if (!city && types.includes("administrative_area_level_2")) {
        city = comp.long_name || ""
      }
      // Always use short_name (2-letter abbreviation) for state — covers PR, FL, NY, etc.
      if (types.includes("administrative_area_level_1")) {
        state = comp.short_name || ""
      }
      if (types.includes("postal_code")) {
        zip = comp.long_name || ""
      }
    }

    // Fallback: parse from formatted_address
    const formattedAddress = result.formatted_address || ""
    if (formattedAddress) {
      if (!city) {
        const parts = formattedAddress.split(",").map((p: string) => p.trim())
        if (parts.length >= 2) {
          city = parts[1]
        }
      }
      if (!zip) {
        const zipMatch = formattedAddress.match(/\b(\d{5})(?:-\d{4})?\b/)
        if (zipMatch) {
          zip = zipMatch[1]
        }
      }
    }

    // Default state to PR
    if (!state) {
      state = "PR"
    }

    const streetAddress = `${streetNumber} ${route}`.trim()

    const lat = result.geometry?.location?.lat ?? null
    const lng = result.geometry?.location?.lng ?? null

    return NextResponse.json({
      lat,
      lng,
      address: formattedAddress,
      addressComponents: result.address_components,
      formattedAddress,
      streetAddress,
      city,
      state,
      zip,
    })
  } catch {
    return NextResponse.json({ error: "Failed to fetch place details" }, { status: 500 })
  }
}
