/**
 * One-time script: geocode Aurorita's address and update lat/lng + delivery_fee minimum
 * Run with: npx tsx scripts/fix-aurorita-coords.ts
 */
import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const GOOGLE_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!

async function geocodeAddress(address: string) {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_KEY}`
  const res = await fetch(url)
  const data = await res.json()
  if (data.status !== "OK" || !data.results.length) throw new Error(`Geocode failed: ${data.status}`)
  const { lat, lng } = data.results[0].geometry.location
  return { lat, lng, formattedAddress: data.results[0].formatted_address }
}

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  const address = "303 Ave De Diego, Puerto Nuevo, San Juan, PR 00920"
  console.log(`Geocoding: ${address}`)

  const { lat, lng, formattedAddress } = await geocodeAddress(address)
  console.log(`Result: lat=${lat}, lng=${lng}`)
  console.log(`Formatted: ${formattedAddress}`)

  const { error } = await supabase
    .from("restaurants")
    .update({
      latitude: lat,
      longitude: lng,
      delivery_fee: 5.89,   // minimum fee floor ($5.89 - $3 subsidy = $2.89 shown to customer)
    })
    .eq("slug", "aurorita")

  if (error) {
    console.error("Update failed:", error.message)
    process.exit(1)
  }

  console.log("Aurorita updated successfully.")
  console.log(`  latitude:  ${lat}`)
  console.log(`  longitude: ${lng}`)
  console.log(`  delivery_fee: $5.89 (floor)`)
}

main().catch((e) => { console.error(e); process.exit(1) })
