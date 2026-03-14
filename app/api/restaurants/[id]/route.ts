"use server"

import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

// GET /api/restaurants/[id] - Returns single restaurant details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Try to find by UUID first, then by slug, then by external_id
    let query = supabase.from("restaurants").select("*")
    
    // Check if it's a UUID format
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
    const isNumeric = /^\d+$/.test(id)

    if (isUUID) {
      query = query.eq("id", id)
    } else if (isNumeric) {
      query = query.eq("external_id", parseInt(id))
    } else {
      query = query.eq("slug", id)
    }

    const { data: restaurant, error } = await query.single()

    if (error || !restaurant) {
      return NextResponse.json(
        { error: "Restaurant not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(restaurant)
  } catch (error) {
    console.error("Error in GET /api/restaurants/[id]:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// PATCH /api/restaurants/[id] - Update restaurant fields
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const supabase = await createClient()

    // Allowed fields to update
    const allowedFields = [
      "name",
      "slug",
      "phone",
      "restaurant_address",
      "logo_url",
      "hero_image_url",
      "marketplace_image_url",
      "cuisine_type",
      "is_active",
      "primary_color",
      "secondary_color",
      "accent_color",
      "delivery_enabled",
      "pickup_enabled",
      "min_order_amount",
      "delivery_fee",
      "tax_rate",
    ]

    // Filter to only allowed fields
    const updates: Record<string, any> = {}
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field]
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      )
    }

    // Check if it's a UUID format
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
    const isNumeric = /^\d+$/.test(id)

    let query = supabase.from("restaurants").update(updates)
    
    if (isUUID) {
      query = query.eq("id", id)
    } else if (isNumeric) {
      query = query.eq("external_id", parseInt(id))
    } else {
      query = query.eq("slug", id)
    }

    const { data: restaurant, error } = await query.select().single()

    if (error) {
      console.error("Error updating restaurant:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(restaurant)
  } catch (error) {
    console.error("Error in PATCH /api/restaurants/[id]:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
