import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function GET() {
  return setupSuperadmin()
}

export async function POST() {
  return setupSuperadmin()
}

// Version 2 - Updated at: 2026-03-14
async function setupSuperadmin() {
  const email = "fnpr@foodnetdelivery.com"
  const password = "admin123"
  
  console.log("[v0] Setup v2 - Starting superadmin setup")
  
  try {
    // Use service role to create auth user
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    let userId: string

    console.log("[v0] Setup v2 - Listing users...")
    
    // First, list all users to check if one exists with this email
    const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    
    console.log("[v0] Setup v2 - List result:", { 
      userCount: listData?.users?.length, 
      error: listError?.message 
    })
    
    if (listError) {
      return NextResponse.json({ error: "Failed to list users: " + listError.message, version: 2 }, { status: 500 })
    }
    
    const existingUser = listData?.users?.find(u => u.email === email)

    if (existingUser) {
      // User exists, update their password
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        existingUser.id,
        { password }
      )
      
      if (updateError) {
        return NextResponse.json({ error: "Failed to update password: " + updateError.message }, { status: 500 })
      }
      
      userId = existingUser.id
    } else {
      // Create new user
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      })

      if (createError) {
        return NextResponse.json({ error: createError.message }, { status: 500 })
      }
      
      userId = newUser.user.id
    }
    
    // Update admin_users record
    const { error: adminError } = await supabaseAdmin
      .from("admin_users")
      .upsert({
        email,
        username: "fnpr",
        role: "super_admin",
        auth_user_id: userId,
      }, {
        onConflict: "email",
      })

    if (adminError) {
      return NextResponse.json({ error: adminError.message }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      version: 2,
      message: "Superadmin account setup complete! Login with username: fnpr, password: admin123",
      user: { email, username: "fnpr", role: "super_admin", auth_user_id: userId }
    })

  } catch (error: any) {
    console.log("[v0] Setup v2 - Caught error:", error)
    return NextResponse.json({ error: error.message, version: 2 }, { status: 500 })
  }
}
