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

// PUT - Update admin user
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { username, email, role, restaurant_id } = body
    
    const supabase = getAdminClient()
    
    // Check if username is taken by another user
    if (username) {
      const { data: existingUser } = await supabase
        .from("admin_users")
        .select("id")
        .eq("username", username)
        .neq("id", id)
        .single()
      
      if (existingUser) {
        return NextResponse.json(
          { error: "Username already exists" },
          { status: 400 }
        )
      }
    }
    
    // Get current user data for email update
    const { data: currentUser } = await supabase
      .from("admin_users")
      .select("auth_user_id, email")
      .eq("id", id)
      .single()
    
    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }
    
    // Update auth user email if changed
    if (email && email !== currentUser.email) {
      const { error: authError } = await supabase.auth.admin.updateUserById(
        currentUser.auth_user_id,
        { email }
      )
      
      if (authError) {
        return NextResponse.json({ error: authError.message }, { status: 500 })
      }
    }
    
    // Update admin_users record
    const updateData: any = {}
    if (username) updateData.username = username
    if (email) updateData.email = email
    if (role) updateData.role = role
    updateData.restaurant_id = role === "restaurant_admin" ? restaurant_id : null
    
    const { data, error } = await supabase
      .from("admin_users")
      .update(updateData)
      .eq("id", id)
      .select("*, restaurants(name, slug)")
      .single()
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE - Delete admin user
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = getAdminClient()
    
    // Get auth_user_id first
    const { data: adminUser } = await supabase
      .from("admin_users")
      .select("auth_user_id")
      .eq("id", id)
      .single()
    
    if (!adminUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }
    
    // Delete from admin_users first
    const { error: deleteError } = await supabase
      .from("admin_users")
      .delete()
      .eq("id", id)
    
    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }
    
    // Delete auth user
    const { error: authError } = await supabase.auth.admin.deleteUser(
      adminUser.auth_user_id
    )
    
    if (authError) {
      console.error("Failed to delete auth user:", authError)
      // Don't fail the request since admin_users was already deleted
    }
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
