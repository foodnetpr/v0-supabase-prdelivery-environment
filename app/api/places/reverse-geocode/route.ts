import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const lat = searchParams.get("lat")
  const lng = searchParams.get("lng")

  if (!lat || !lng) {
    return NextResponse.json({ error: "lat and lng are required" }, { status: 400 })
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY
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
      
      // Extract zip code from address components
      let zip = ""
      for (const component of result.address_components) {
        if (component.types.includes("postal_code")) {
          zip = component.short_name
          break
        }
      }

      return NextResponse.json({
        address: result.formatted_address,
        zip,
      })
    }

    return NextResponse.json({ error: "No address found" }, { status: 404 })
  } catch (error) {
    console.error("Reverse geocode error:", error)
    return NextResponse.json({ error: "Failed to reverse geocode" }, { status: 500 })
  }
}
