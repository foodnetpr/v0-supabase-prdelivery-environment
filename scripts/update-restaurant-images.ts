// Script to update restaurant image URLs from foodnet_import_complete.json
// Run with: npx tsx scripts/update-restaurant-images.ts

import { createClient } from "@supabase/supabase-js"
import fs from "fs"
import path from "path"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase environment variables")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

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

async function updateImages() {
  // Load the complete import JSON
  const jsonPath = path.join(process.cwd(), "data", "foodnet_import_complete.json")
  const jsonData = JSON.parse(fs.readFileSync(jsonPath, "utf-8"))

  let updated = 0
  let errors = 0

  for (const entry of jsonData) {
    const restaurant = entry.restaurant
    if (!restaurant || !restaurant.name) continue

    const slug = createSlug(restaurant.name)
    const logoUrl = restaurant.logo_url || null
    const featuredUrl = restaurant.featured_url || null

    if (!logoUrl && !featuredUrl) {
      console.log(`Skipping ${restaurant.name} - no images`)
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
      console.error(`Error updating ${restaurant.name}:`, error.message)
      errors++
    } else {
      console.log(`Updated ${restaurant.name}: logo=${logoUrl ? 'yes' : 'no'}, featured=${featuredUrl ? 'yes' : 'no'}`)
      updated++
    }
  }

  console.log(`\nDone! Updated: ${updated}, Errors: ${errors}`)
}

updateImages()
