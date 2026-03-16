import { createServiceClient } from "@/lib/supabase/service"
import { NextResponse } from "next/server"

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
  const supabase = createServiceClient()
  const body = await req.json()

  // Assign next display_order
  const { data: existing } = await supabase
    .from("promo_cards")
    .select("display_order")
    .order("display_order", { ascending: false })
    .limit(1)
    .single()

  const nextOrder = existing ? existing.display_order + 1 : 1

  const { data, error } = await supabase
    .from("promo_cards")
    .insert({ ...body, display_order: nextOrder })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
