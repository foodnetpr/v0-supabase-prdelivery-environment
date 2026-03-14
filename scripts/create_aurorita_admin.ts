import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function main() {
  const username = "aurorita"
  const email = "aurorita@internal.com"
  const password = "admin123"

  // Get Aurorita restaurant ID
  const { data: restaurant, error: restError } = await supabase
    .from("restaurants")
    .select("id, name")
    .ilike("name", "%aurorita%")
    .single()

  if (restError || !restaurant) {
    console.error("Aurorita restaurant not found:", restError)
    process.exit(1)
  }

  console.log(`Found restaurant: ${restaurant.name} (${restaurant.id})`)

  // Check if admin already exists
  const { data: existingAdmin } = await supabase
    .from("admin_users")
    .select("id")
    .eq("username", username)
    .single()

  if (existingAdmin) {
    console.log("Admin user already exists, deleting to recreate...")
    // Delete existing admin_users record
    await supabase.from("admin_users").delete().eq("username", username)
  }

  // Create Supabase Auth user
  let authUserId

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError) {
    if (authError.message.includes("already been registered")) {
      console.log("Auth user already exists, looking up...")
      const { data: { users } } = await supabase.auth.admin.listUsers()
      const existingUser = users?.find((u) => u.email === email)
      if (!existingUser) {
        console.error("Could not find existing auth user")
        process.exit(1)
      }
      authUserId = existingUser.id
      // Reset password
      await supabase.auth.admin.updateUserById(authUserId, { password })
      console.log("Password reset to admin123")
    } else {
      console.error("Auth error:", authError)
      process.exit(1)
    }
  } else {
    authUserId = authData.user.id
    console.log("Auth user created:", authUserId)
  }

  // Create admin_users record
  const { error: adminError } = await supabase.from("admin_users").insert({
    id: authUserId,
    email,
    username,
    role: "admin",
    restaurant_id: restaurant.id,
  })

  if (adminError) {
    console.error("Admin user insert error:", adminError)
    process.exit(1)
  }

  console.log("SUCCESS!")
  console.log(`Username: ${username}`)
  console.log(`Password: ${password}`)
  console.log(`Restaurant: ${restaurant.name}`)
}

main()
