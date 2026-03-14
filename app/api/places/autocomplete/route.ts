import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const input = searchParams.get("input")

  if (!input) {
    return NextResponse.json({ predictions: [] })
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  if (!apiKey) {
    return NextResponse.json({ error: "API key not configured" }, { status: 500 })
  }

  try {
    // Use legacy Places API Autocomplete endpoint (works with standard Places API)
    const url = new URL("https://maps.googleapis.com/maps/api/place/autocomplete/json")
    url.searchParams.set("input", input)
    url.searchParams.set("key", apiKey)
    url.searchParams.set("components", "country:pr") // Restrict to Puerto Rico
    url.searchParams.set("types", "address")
    url.searchParams.set("language", "es")

    const response = await fetch(url.toString())

    if (!response.ok) {
      return NextResponse.json({ predictions: [] })
    }

    const data = await response.json()

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      return NextResponse.json({ predictions: [] })
    }

    // Transform to simpler format
    const predictions = (data.predictions || []).map((prediction: any) => ({
      placeId: prediction.place_id,
      text: prediction.description,
      mainText: prediction.structured_formatting?.main_text || prediction.description,
      secondaryText: prediction.structured_formatting?.secondary_text || "",
    }))

    return NextResponse.json({ predictions })
  } catch {
    return NextResponse.json({ predictions: [] })
  }
}
