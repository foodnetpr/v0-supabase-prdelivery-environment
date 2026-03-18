import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

// Inline service client — no external lib dependency
function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function GET() {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from("promo_cards")
    .select("*")
    .order("display_order", { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  try {
    const supabase = createServiceClient()
    const body = await req.json()

    console.log("[v0] Promo cards POST - body:", body)

    // Assign next display_order
    const { data: existing, error: existingError } = await supabase
      .from("promo_cards")
      .select("display_order")
      .order("display_order", { ascending: false })
      .limit(1)
      .single()

    if (existingError && existingError.code !== "PGRST116") {
      console.log("[v0] Error fetching existing promo cards:", existingError)
    }

    const nextOrder = existing ? existing.display_order + 1 : 1

    const { data, error } = await supabase
      .from("promo_cards")
      .insert({ ...body, display_order: nextOrder })
      .select()
      .single()

    console.log("[v0] Insert result:", { data, error })

    if (error) {
      console.log("[v0] Promo card insert error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json(data)
  } catch (err) {
    console.error("[v0] Promo cards POST exception:", err)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
