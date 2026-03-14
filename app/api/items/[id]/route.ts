"use server"

import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

// GET /api/items/[id] - Returns single item with options
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: item, error } = await supabase
      .from("menu_items")
      .select(`
        *,
        category:categories(*),
        item_options(
          *,
          item_option_choices(*)
        )
      `)
      .eq("id", id)
      .single()

    if (error || !item) {
      return NextResponse.json(
        { error: "Item not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(item)
  } catch (error) {
    console.error("Error in GET /api/items/[id]:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// PATCH /api/items/[id] - Update item fields
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
      "description",
      "price",
      "image_url",
      "is_active",
      "sort_order",
      "lead_time_minutes",
      "selling_unit",
      "per_unit_price",
      "per_unit_label",
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

    const { data: item, error } = await supabase
      .from("menu_items")
      .update(updates)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("Error updating item:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(item)
  } catch (error) {
    console.error("Error in PATCH /api/items/[id]:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// DELETE /api/items/[id] - Soft delete item (set is_active = false)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: item, error } = await supabase
      .from("menu_items")
      .update({ is_active: false })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("Error deleting item:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, item })
  } catch (error) {
    console.error("Error in DELETE /api/items/[id]:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
