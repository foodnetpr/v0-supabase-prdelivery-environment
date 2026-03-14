import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from("platform_settings")
      .select("*")
      .single()
    
    if (error) {
      // If no settings exist, return defaults
      if (error.code === "PGRST116") {
        return NextResponse.json({
          id: null,
          is_platform_open: true,
          is_pop_blocked: false,
          operating_hours_start: "11:00",
          operating_hours_end: "20:30",
          operating_days: {
            sunday: true,
            monday: true,
            tuesday: true,
            wednesday: true,
            thursday: true,
            friday: true,
            saturday: true,
          },
          emergency_block_active: false,
          emergency_block_reason: null,
          pop_reopen_at: null,
          pop_block_message: null,
        })
      }
      throw error
    }
    
    return NextResponse.json(data)
  } catch (error: any) {
    console.error("Error fetching platform settings:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    
    // Check if settings exist
    const { data: existing } = await supabase
      .from("platform_settings")
      .select("id")
      .single()
    
    let result
    
    if (existing) {
      // Update existing settings
      const { data, error } = await supabase
        .from("platform_settings")
        .update({
          is_platform_open: body.is_platform_open,
          is_pop_blocked: body.is_pop_blocked,
          operating_hours_start: body.operating_hours_start,
          operating_hours_end: body.operating_hours_end,
          operating_days: body.operating_days,
          emergency_block_active: body.emergency_block_active,
          emergency_block_reason: body.emergency_block_reason,
          pop_reopen_at: body.pop_reopen_at,
          pop_block_message: body.pop_block_message,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select()
        .single()
      
      if (error) throw error
      result = data
    } else {
      // Insert new settings
      const { data, error } = await supabase
        .from("platform_settings")
        .insert({
          is_platform_open: body.is_platform_open ?? true,
          is_pop_blocked: body.is_pop_blocked ?? false,
          operating_hours_start: body.operating_hours_start ?? "11:00",
          operating_hours_end: body.operating_hours_end ?? "20:30",
          operating_days: body.operating_days ?? {
            sunday: true,
            monday: true,
            tuesday: true,
            wednesday: true,
            thursday: true,
            friday: true,
            saturday: true,
          },
          emergency_block_active: body.emergency_block_active ?? false,
          emergency_block_reason: body.emergency_block_reason,
          pop_reopen_at: body.pop_reopen_at,
          pop_block_message: body.pop_block_message,
        })
        .select()
        .single()
      
      if (error) throw error
      result = data
    }
    
    return NextResponse.json(result)
  } catch (error: any) {
    console.error("Error updating platform settings:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
