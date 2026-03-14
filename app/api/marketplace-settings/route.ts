import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { id, hero_image_url, hero_title, hero_subtitle } = body

    const supabase = await createServerClient()

    // Use service role for admin operations
    const adminSupabase = await createServerClient()

    if (id) {
      // Update existing settings
      const { error } = await adminSupabase
        .from("marketplace_settings")
        .update({
          hero_image_url,
          hero_title,
          hero_subtitle,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)

      if (error) {
        console.error("[v0] Marketplace settings update error:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    } else {
      // Insert new settings (shouldn't happen often)
      const { error } = await adminSupabase.from("marketplace_settings").insert({
        hero_image_url,
        hero_title,
        hero_subtitle,
      })

      if (error) {
        console.error("[v0] Marketplace settings insert error:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Marketplace settings API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
