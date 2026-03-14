"use server"

import { createClient } from "@supabase/supabase-js"
import { createClient as createServerClient } from "@/lib/supabase/server"

export async function loginAction(username: string, password: string) {
  try {
    // Use service role to look up admin_users (bypasses RLS)
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

    const { data: adminData, error: lookupError } = await supabaseAdmin
      .from("admin_users")
      .select("email, restaurant_id, role, restaurants(slug)")
      .eq("username", username)
      .single()

    console.log("[v0] Login: username lookup result:", { adminData, lookupError })

    if (lookupError || !adminData) {
      console.log("[v0] Login: Admin user not found for username:", username)
      return { error: "Usuario o contraseña incorrectos" }
    }

    console.log("[v0] Login: Found admin user, attempting auth with email:", adminData.email)

    // Use the server client (with cookies) to sign in
    const supabase = await createServerClient()

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: adminData.email,
      password,
    })

    console.log("[v0] Login: Auth result:", { authError: authError?.message })

    if (authError) {
      console.log("[v0] Login: Auth failed:", authError.message)
      return { error: "Usuario o contraseña incorrectos" }
    }

    if (adminData.role === "super_admin") {
      return { redirectTo: "/super-admin" }
    } else {
      const restaurantSlug = (adminData.restaurants as any)?.slug
      if (restaurantSlug) {
        return { redirectTo: `/${restaurantSlug}/admin` }
      } else {
        return { error: "Restaurant not found" }
      }
    }
  } catch (err: any) {
    return { error: err.message || "Failed to login" }
  }
}
