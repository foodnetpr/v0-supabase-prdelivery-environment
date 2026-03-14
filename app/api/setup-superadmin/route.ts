import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function GET() {
  return setupSuperadmin()
}

export async function POST() {
  return setupSuperadmin()
}

async function setupSuperadmin() {
  console.log("[v0] Setup superadmin called")
  
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

    const email = "fnpr@foodnetdelivery.com"
    const password = "admin123"

    console.log("[v0] Checking for existing user...")

    // First, try to list users to find if one exists with this email
    const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    
    console.log("[v0] List users result:", { count: listData?.users?.length, error: listError?.message })
    
    const existingUser = listData?.users?.find(u => u.email === email)
    
    let userId: string

    if (existingUser) {
      console.log("[v0] Found existing user, updating password...")
      // User exists, update password
      const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        existingUser.id,
        { password }
      )
      
      if (updateError) {
        console.error("[v0] Failed to update user password:", updateError)
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }
      
      userId = existingUser.id
      console.log("[v0] Updated existing user password:", userId)
    } else {
      console.log("[v0] Creating new user...")
      // Create new user via Supabase Admin API
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      })

      if (createError) {
        console.error("[v0] Failed to create auth user:", createError)
        return NextResponse.json({ error: createError.message }, { status: 500 })
      }

      userId = newUser.user.id
      console.log("[v0] Created new auth user:", userId)
    }

    console.log("[v0] Updating admin_users record...")
    
    // Update or create admin_users record
    const { data: adminUser, error: adminError } = await supabaseAdmin
      .from("admin_users")
      .upsert({
        email,
        username: "fnpr",
        role: "super_admin",
        auth_user_id: userId,
      }, {
        onConflict: "email",
      })
      .select()
      .single()

    if (adminError) {
      console.error("[v0] Failed to update admin_users:", adminError)
      return NextResponse.json({ error: adminError.message }, { status: 500 })
    }

    console.log("[v0] Setup complete!")

    return NextResponse.json({ 
      success: true, 
      message: "Superadmin account setup complete",
      user: { email, username: "fnpr", role: "super_admin", auth_user_id: userId }
    })

  } catch (error: any) {
    console.error("[v0] Setup error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
