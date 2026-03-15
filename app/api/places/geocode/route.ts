import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const address = searchParams.get("address")

  if (!address) {
    return NextResponse.json({ error: "address is required" }, { status: 400 })
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "Google Maps API key not configured" }, { status: 500 })
  }

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}&language=es`
    )
    const data = await response.json()

    if (data.status === "OK" && data.results.length > 0) {
      const result = data.results[0]
      const { lat, lng } = result.geometry.location

      // Extract zip code from address components
      let zip = ""
      for (const component of result.address_components) {
        if (component.types.includes("postal_code")) {
          zip = component.short_name
          break
        }
      }

      return NextResponse.json({
        lat,
        lng,
        address: result.formatted_address,
        zip,
      })
    }

    return NextResponse.json({ error: "No location found" }, { status: 404 })
  } catch (error) {
    console.error("Geocode error:", error)
    return NextResponse.json({ error: "Failed to geocode" }, { status: 500 })
  }
}
