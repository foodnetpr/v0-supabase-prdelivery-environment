import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    
    // Get the block details before deleting for logging
    const { data: block } = await supabase
      .from("scheduled_blocks")
      .select("*")
      .eq("id", id)
      .single()
    
    // Delete the block
    const { error } = await supabase
      .from("scheduled_blocks")
      .delete()
      .eq("id", id)
    
    if (error) throw error
    
    // Log the deletion
    if (block) {
      await supabase.from("block_log").insert({
        restaurant_id: block.restaurant_id,
        action: "block_deleted",
        details: {
          block_id: id,
          block_type: block.block_type,
          original_starts_at: block.starts_at,
          original_ends_at: block.ends_at,
        },
        performed_by: "super-admin",
      })
    }
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error deleting scheduled block:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
