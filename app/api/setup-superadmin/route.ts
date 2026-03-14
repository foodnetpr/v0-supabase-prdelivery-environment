import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function GET() {
  return setupSuperadmin()
}

export async function POST() {
  return setupSuperadmin()
}

async function setupSuperadmin() {
  const email = "fnpr@foodnetdelivery.com"
  const password = "admin123"
  
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

    // Try to create the user first
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (createError) {
      // If user already exists, try to find and update them
      if (createError.message.includes("already") || createError.message.includes("exists")) {
        // Get the user ID from auth.users table directly
        const { data: existingUsers } = await supabaseAdmin
          .from("auth.users")
          .select("id")
          .eq("email", email)
          .single()
        
        if (!existingUsers) {
          // Try raw SQL query as fallback
          const { data: rawUser, error: rawError } = await supabaseAdmin.rpc('get_user_id_by_email', { user_email: email })
          
          if (rawError || !rawUser) {
            return NextResponse.json({ 
              error: "User exists but couldn't retrieve ID. Please delete existing user from Supabase Auth dashboard.",
              createError: createError.message 
            }, { status: 500 })
          }
          userId = rawUser
        } else {
          userId = existingUsers.id
        }
        
        // Update password for existing user
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, { password })
        if (updateError) {
          return NextResponse.json({ error: "Failed to update password: " + updateError.message }, { status: 500 })
        }
      } else {
        return NextResponse.json({ error: createError.message }, { status: 500 })
      }
    } else {
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
      message: "Superadmin account setup complete! Login with username: fnpr, password: admin123",
      user: { email, username: "fnpr", role: "super_admin", auth_user_id: userId }
    })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
