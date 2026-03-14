import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Fetch active scheduled blocks with restaurant names
    const { data, error } = await supabase
      .from("scheduled_blocks")
      .select(`
        *,
        restaurants (name)
      `)
      .eq("is_active", true)
      .gte("ends_at", new Date().toISOString())
      .order("starts_at", { ascending: true })
    
    if (error) throw error
    
    // Transform to include restaurant_name
    const blocks = data.map((block) => ({
      ...block,
      restaurant_name: block.restaurants?.name || null,
      restaurants: undefined,
    }))
    
    return NextResponse.json(blocks)
  } catch (error: any) {
    console.error("Error fetching scheduled blocks:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    
    const { data, error } = await supabase
      .from("scheduled_blocks")
      .insert({
        restaurant_id: body.restaurant_id,
        block_type: body.block_type || "restaurant",
        starts_at: body.starts_at,
        ends_at: body.ends_at,
        reason: body.reason,
        is_active: true,
        created_by: "super-admin",
      })
      .select(`
        *,
        restaurants (name)
      `)
      .single()
    
    if (error) throw error
    
    // Log the block creation
    await supabase.from("block_log").insert({
      restaurant_id: body.restaurant_id,
      action: "block_created",
      details: {
        block_type: body.block_type,
        starts_at: body.starts_at,
        ends_at: body.ends_at,
        reason: body.reason,
      },
      performed_by: "super-admin",
    })
    
    return NextResponse.json({
      ...data,
      restaurant_name: data.restaurants?.name || null,
      restaurants: undefined,
    })
  } catch (error: any) {
    console.error("Error creating scheduled block:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
