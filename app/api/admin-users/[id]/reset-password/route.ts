import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

// Admin client with service role
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

// POST - Reset password for admin user
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { password } = body
    
    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      )
    }
    
    const supabase = getAdminClient()
    
    // Get auth_user_id
    const { data: adminUser } = await supabase
      .from("admin_users")
      .select("auth_user_id")
      .eq("id", id)
      .single()
    
    if (!adminUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }
    
    // Update password using admin API
    const { error } = await supabase.auth.admin.updateUserById(
      adminUser.auth_user_id,
      { password }
    )
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
