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

// GET - Fetch all admin users
export async function GET() {
  try {
    const supabase = getAdminClient()
    
    const { data, error } = await supabase
      .from("admin_users")
      .select("*, restaurants(name, slug)")
      .order("created_at", { ascending: false })
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - Create new admin user
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { username, email, password, role, restaurant_id } = body
    
    if (!username || !email || !password) {
      return NextResponse.json(
        { error: "Username, email, and password are required" },
        { status: 400 }
      )
    }
    
    if (role === "restaurant_admin" && !restaurant_id) {
      return NextResponse.json(
        { error: "Restaurant is required for restaurant admin" },
        { status: 400 }
      )
    }
    
    const supabase = getAdminClient()
    
    // Check if username already exists
    const { data: existingUser } = await supabase
      .from("admin_users")
      .select("id")
      .eq("username", username)
      .single()
    
    if (existingUser) {
      return NextResponse.json(
        { error: "Username already exists" },
        { status: 400 }
      )
    }
    
    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true // Auto-confirm email
    })
    
    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 500 })
    }
    
    // Create admin_users record
    const { data: adminUser, error: insertError } = await supabase
      .from("admin_users")
      .insert({
        id: authData.user.id, // Use auth user id
        auth_user_id: authData.user.id,
        username,
        email,
        role,
        restaurant_id: role === "restaurant_admin" ? restaurant_id : null
      })
      .select("*, restaurants(name, slug)")
      .single()
    
    if (insertError) {
      // Rollback: delete auth user if admin_users insert fails
      await supabase.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }
    
    return NextResponse.json(adminUser, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
