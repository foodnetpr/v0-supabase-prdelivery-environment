import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import importData from "@/data/foodnet_import_complete.json"

function createSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim()
}

export async function POST() {
  const supabase = await createClient()
  
  let updated = 0
  let skipped = 0
  let errors: string[] = []

  for (const entry of importData as any[]) {
    const restaurant = entry.restaurant
    if (!restaurant || !restaurant.name) continue

    const slug = createSlug(restaurant.name)
    const logoUrl = restaurant.logo_url || null
    const featuredUrl = restaurant.featured_url || null

    if (!logoUrl && !featuredUrl) {
      skipped++
      continue
    }

    const { error } = await supabase
      .from("restaurants")
      .update({
        logo_url: logoUrl,
        hero_image_url: featuredUrl,
        marketplace_image_url: featuredUrl || logoUrl,
      })
      .eq("slug", slug)

    if (error) {
      errors.push(`${restaurant.name}: ${error.message}`)
    } else {
      updated++
    }
  }

  return NextResponse.json({
    success: true,
    updated,
    skipped,
    errors: errors.length,
    errorDetails: errors.slice(0, 10), // First 10 errors
  })
}

export async function GET() {
  return NextResponse.json({
    message: "POST to this endpoint to update restaurant images from foodnet_import_complete.json"
  })
}
