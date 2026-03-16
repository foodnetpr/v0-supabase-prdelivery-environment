import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const lat = searchParams.get("lat")
  const lng = searchParams.get("lng")

  if (!lat || !lng) {
    return NextResponse.json({ error: "lat and lng are required" }, { status: 400 })
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "Google Maps API key not configured" }, { status: 500 })
  }

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}&language=es`
    )
    const data = await response.json()

    if (data.status === "OK" && data.results.length > 0) {
      const result = data.results[0]
      const components = result.address_components as Array<{ types: string[]; long_name: string; short_name: string }>

      const get = (type: string, nameType: "long_name" | "short_name" = "long_name") =>
        components.find((c) => c.types.includes(type))?.[nameType] ?? ""

      // Build street number + route
      const streetNumber = get("street_number")
      const route = get("route")
      const street = [streetNumber, route].filter(Boolean).join(" ") || get("premise") || get("subpremise")

      const city =
        get("locality") ||
        get("sublocality_level_1") ||
        get("sublocality") ||
        get("administrative_area_level_2")
      const state = get("administrative_area_level_1", "short_name")
      const zip = get("postal_code", "short_name")
      const country = get("country", "short_name")

      return NextResponse.json({
        address: result.formatted_address,
        street,
        city,
        state,
        zip,
        country,
      })
    }

    return NextResponse.json({ error: "No address found" }, { status: 404 })
  } catch (error) {
    console.error("Reverse geocode error:", error)
    return NextResponse.json({ error: "Failed to reverse geocode" }, { status: 500 })
  }
}
