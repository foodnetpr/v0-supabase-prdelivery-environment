import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function POST() {
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

    // First, check if user already exists
    const { data: existingUser } = await supabaseAdmin.auth.admin.getUserByEmail(email)
    
    let userId: string

    if (existingUser?.user) {
      // User exists, update password
      const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        existingUser.user.id,
        { password }
      )
      
      if (updateError) {
        console.error("[v0] Failed to update user password:", updateError)
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }
      
      userId = existingUser.user.id
      console.log("[v0] Updated existing user password:", userId)
    } else {
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

    return NextResponse.json({ 
      success: true, 
      message: "Superadmin account setup complete",
      user: { email, username: "fnpr", role: "super_admin" }
    })

  } catch (error: any) {
    console.error("[v0] Setup error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
