"use server"

export async function getGoogleMapsScriptUrl() {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  console.log("[v0] getGoogleMapsScriptUrl called, API key available:", !!apiKey, "Length:", apiKey?.length || 0)
  if (!apiKey) {
    console.error("[v0] Google Maps API key not configured in environment")
    throw new Error("Google Maps API key not configured")
  }
  const url = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
  console.log("[v0] Generated Google Maps script URL")
  return url
}
