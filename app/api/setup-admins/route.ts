import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function POST() {
  try {
    // Create Supabase admin client (service role bypasses RLS)
    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const restaurants = [
      {
        id: "0f46ab78-25cf-4d69-87e9-79ada77b5ba2",
        name: "JunteReady",
        slug: "junteready",
        username: "junteready",
        email: "junteready@internal.com",
        city: "San Juan",
        state: "PR",
        cuisine_type: "Puerto Rican",
        primary_color: "#E8852E",
        design_template: "classic",
      },
      {
        id: "473c5ac2-6734-4a0f-be63-8d33194692bb",
        name: "Metropol Catering",
        slug: "metropol",
        username: "metropol",
        email: "metropol@internal.com",
        city: "San Juan",
        state: "PR",
        cuisine_type: "Puerto Rican",
        primary_color: "#8B0000",
        design_template: "classic",
      },
    ]

    const results = []
    const genericPassword = "admin123"

    // Step 1: Ensure restaurant records exist
    for (const restaurant of restaurants) {
      const { data: existing } = await supabaseAdmin
        .from("restaurants")
        .select("id")
        .eq("id", restaurant.id)
        .single()

      if (!existing) {
        const { error: restaurantInsertError } = await supabaseAdmin.from("restaurants").insert({
          id: restaurant.id,
          name: restaurant.name,
          slug: restaurant.slug,
          email: restaurant.email,
          city: restaurant.city,
          state: restaurant.state,
          cuisine_type: restaurant.cuisine_type,
          primary_color: restaurant.primary_color,
          design_template: restaurant.design_template,
          is_active: true,
          show_in_marketplace: true,
          tax_rate: 0.115,
          lead_time_hours: 24,
          delivery_fee: 0,
          min_delivery_order: 0,
          tip_option_1: 15,
          tip_option_2: 18,
          tip_option_3: 20,
        })

        if (restaurantInsertError) {
          results.push({
            restaurant: restaurant.name,
            success: false,
            error: `Restaurant seed failed: ${restaurantInsertError.message}`,
          })
          continue
        }
      }
    }

    // Step 2: Create auth users and admin_users records
    for (const restaurant of restaurants) {
      // Check if admin_user already exists for this restaurant
      const { data: existingAdmin } = await supabaseAdmin
        .from("admin_users")
        .select("id")
        .eq("username", restaurant.username)
        .single()

      if (existingAdmin) {
        results.push({
          restaurant: restaurant.name,
          username: restaurant.username,
          password: genericPassword,
          success: true,
          note: "Already existed",
        })
        continue
      }

      // Create auth user
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: restaurant.email,
        password: genericPassword,
        email_confirm: true,
      })

      if (authError) {
        // If user already exists in auth, try to get them
        if (authError.message.includes("already been registered")) {
          const { data: { users } } = await supabaseAdmin.auth.admin.listUsers()
          const existingUser = users?.find((u: any) => u.email === restaurant.email)
          if (existingUser) {
            const { error: adminError } = await supabaseAdmin.from("admin_users").insert({
              id: existingUser.id,
              email: restaurant.email,
              username: restaurant.username,
              role: "admin",
              restaurant_id: restaurant.id,
            })
            results.push({
              restaurant: restaurant.name,
              username: restaurant.username,
              password: genericPassword,
              success: !adminError,
              error: adminError?.message,
            })
          } else {
            results.push({ restaurant: restaurant.name, success: false, error: authError.message })
          }
          continue
        }
        results.push({ restaurant: restaurant.name, success: false, error: authError.message })
        continue
      }

      const { error: adminError } = await supabaseAdmin.from("admin_users").insert({
        id: authData.user.id,
        email: restaurant.email,
        username: restaurant.username,
        role: "admin",
        restaurant_id: restaurant.id,
      })

      if (adminError) {
        results.push({ restaurant: restaurant.name, success: false, error: adminError.message })
        continue
      }

      results.push({
        restaurant: restaurant.name,
        username: restaurant.username,
        password: genericPassword,
        success: true,
      })
    }

    // Step 3: Create super admin
    const superAdminEmail = "superadmin@internal.com"
    const superAdminUsername = "superadmin"

    const { data: existingSuperAdmin } = await supabaseAdmin
      .from("admin_users")
      .select("id")
      .eq("username", superAdminUsername)
      .single()

    if (!existingSuperAdmin) {
      const { data: superAuthData, error: superAuthError } = await supabaseAdmin.auth.admin.createUser({
        email: superAdminEmail,
        password: genericPassword,
        email_confirm: true,
      })

      if (superAuthError && superAuthError.message.includes("already been registered")) {
        const { data: { users } } = await supabaseAdmin.auth.admin.listUsers()
        const existingUser = users?.find((u: any) => u.email === superAdminEmail)
        if (existingUser) {
          await supabaseAdmin.from("admin_users").insert({
            id: existingUser.id,
            email: superAdminEmail,
            username: superAdminUsername,
            role: "super_admin",
            restaurant_id: null,
          })
          results.push({ restaurant: "Super Admin", username: superAdminUsername, password: genericPassword, success: true })
        }
      } else if (!superAuthError) {
        const { error: superAdminError } = await supabaseAdmin.from("admin_users").insert({
          id: superAuthData.user.id,
          email: superAdminEmail,
          username: superAdminUsername,
          role: "super_admin",
          restaurant_id: null,
        })
        results.push({
          restaurant: "Super Admin",
          username: superAdminUsername,
          password: genericPassword,
          success: !superAdminError,
        })
      }
    } else {
      results.push({ restaurant: "Super Admin", username: superAdminUsername, password: genericPassword, success: true, note: "Already existed" })
    }

    // Step 4: Seed a default category for each restaurant
    for (const restaurant of restaurants) {
      const { data: existingCats } = await supabaseAdmin
        .from("categories")
        .select("id")
        .eq("restaurant_id", restaurant.id)
        .limit(1)

      if (!existingCats || existingCats.length === 0) {
        await supabaseAdmin.from("categories").insert({
          restaurant_id: restaurant.id,
          name: "Featured Items",
          display_order: 0,
          is_active: true,
        })
      }
    }

    return NextResponse.json({ results })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
