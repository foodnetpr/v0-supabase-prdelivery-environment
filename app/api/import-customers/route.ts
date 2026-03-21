import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Create admin client with service role key
function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase URL and Service Role Key are required")
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

// Ensure profiles table exists
async function ensureProfilesTable(supabase: ReturnType<typeof createClient>) {
  // Try to query the table first
  const { error } = await supabase.from("profiles").select("id").limit(1)
  
  // If table doesn't exist, we need to create it via SQL
  if (error && error.message.includes("does not exist")) {
    // Note: This requires the postgres extension to be enabled
    // If the table doesn't exist, the admin should run the SQL manually
    console.warn("[Import Customers] profiles table does not exist. Please create it manually.")
    return false
  }
  
  return true
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient()
    
    // Ensure profiles table exists
    const tableExists = await ensureProfilesTable(supabase)
    if (!tableExists) {
      return NextResponse.json(
        { error: "profiles table does not exist. Please run the migration first." },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { firstName, lastName, email, phone } = body

    // Validate required fields
    if (!email && !phone) {
      return NextResponse.json(
        { error: "Either email or phone is required" },
        { status: 400 }
      )
    }

    const fullName = [firstName, lastName].filter(Boolean).join(" ").trim() || "Unknown"
    let authUserId: string | null = null

    // Create Supabase Auth user if email is provided
    if (email) {
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: email,
        phone: phone || undefined,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          created_via: "csv_import",
        },
      })

      if (authError) {
        // Check if user already exists
        if (authError.message.includes("already been registered") || authError.message.includes("already exists")) {
          // Try to find existing user
          const { data: { users } } = await supabase.auth.admin.listUsers()
          const existingUser = users?.find((u) => u.email === email)
          if (existingUser) {
            authUserId = existingUser.id
          } else {
            return NextResponse.json(
              { error: `User exists but could not be found: ${authError.message}` },
              { status: 400 }
            )
          }
        } else {
          return NextResponse.json(
            { error: authError.message },
            { status: 400 }
          )
        }
      } else {
        authUserId = authData.user.id
      }
    }

    // Check if profile already exists with this email or phone
    let existingProfile = null
    if (email) {
      const { data } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", email)
        .single()
      existingProfile = data
    }
    if (!existingProfile && phone) {
      const { data } = await supabase
        .from("profiles")
        .select("id")
        .eq("phone", phone)
        .single()
      existingProfile = data
    }

    if (existingProfile) {
      // Update existing profile
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          email: email || undefined,
          phone: phone || undefined,
          auth_user_id: authUserId || undefined,
        })
        .eq("id", existingProfile.id)

      if (updateError) {
        return NextResponse.json(
          { error: updateError.message },
          { status: 400 }
        )
      }

      // Also update/insert in customers table
      let existingCustomer = null
      if (email) {
        const { data } = await supabase
          .from("customers")
          .select("id")
          .eq("email", email)
          .single()
        existingCustomer = data
      }
      if (!existingCustomer && phone) {
        const { data } = await supabase
          .from("customers")
          .select("id")
          .eq("phone", phone)
          .single()
        existingCustomer = data
      }

      if (existingCustomer) {
        await supabase
          .from("customers")
          .update({
            first_name: firstName || fullName.split(" ")[0] || null,
            last_name: lastName || fullName.split(" ").slice(1).join(" ") || null,
            email: email || undefined,
            phone: phone || undefined,
            auth_user_id: authUserId || undefined,
          })
          .eq("id", existingCustomer.id)
      } else {
        await supabase
          .from("customers")
          .insert({
            auth_user_id: authUserId,
            first_name: firstName || fullName.split(" ")[0] || null,
            last_name: lastName || fullName.split(" ").slice(1).join(" ") || null,
            email: email || null,
            phone: phone || null,
          })
      }

      return NextResponse.json({
        success: true,
        action: "updated",
        profileId: existingProfile.id,
        authUserId,
      })
    }

    // Insert new profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .insert({
        auth_user_id: authUserId,
        full_name: fullName,
        email: email || null,
        phone: phone || null,
        created_via: "csv_import",
      })
      .select()
      .single()

    if (profileError) {
      return NextResponse.json(
        { error: profileError.message },
        { status: 400 }
      )
    }

    // Also insert into customers table (used by CSR portal)
    // Check if customer already exists by email or phone
    let existingCustomer = null
    if (email) {
      const { data } = await supabase
        .from("customers")
        .select("id")
        .eq("email", email)
        .single()
      existingCustomer = data
    }
    if (!existingCustomer && phone) {
      const { data } = await supabase
        .from("customers")
        .select("id")
        .eq("phone", phone)
        .single()
      existingCustomer = data
    }

    let customerId = existingCustomer?.id
    if (existingCustomer) {
      // Update existing customer
      await supabase
        .from("customers")
        .update({
          first_name: firstName || fullName.split(" ")[0] || null,
          last_name: lastName || fullName.split(" ").slice(1).join(" ") || null,
          email: email || undefined,
          phone: phone || undefined,
          auth_user_id: authUserId || undefined,
        })
        .eq("id", existingCustomer.id)
    } else {
      // Insert new customer
      const { data: customer } = await supabase
        .from("customers")
        .insert({
          auth_user_id: authUserId,
          first_name: firstName || fullName.split(" ")[0] || null,
          last_name: lastName || fullName.split(" ").slice(1).join(" ") || null,
          email: email || null,
          phone: phone || null,
        })
        .select()
        .single()
      customerId = customer?.id
    }

    return NextResponse.json({
      success: true,
      action: "created",
      profileId: profile.id,
      customerId,
      authUserId,
    })
  } catch (error) {
    console.error("[Import Customers] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An unexpected error occurred" },
      { status: 500 }
    )
  }
}
