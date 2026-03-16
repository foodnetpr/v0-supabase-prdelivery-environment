import { NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/"

  if (code) {
    const cookieStore = await cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options),
              )
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing sessions.
            }
          },
        },
      },
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // After exchanging the code, check if we need to create/link a customer record.
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        const provider = user.app_metadata?.provider

        // Check if a customer record already exists for this auth user.
        const { data: existingByAuthId } = await supabase
          .from("customers")
          .select("id")
          .eq("auth_user_id", user.id)
          .single()

        if (!existingByAuthId) {
          // No customer row yet. Check if another account exists with the same email
          // (e.g. an old account from a previous system or a different OAuth provider).
          const { data: existingByEmail } = await supabase
            .from("customers")
            .select("id, auth_user_id")
            .eq("email", user.email!)
            .is("auth_user_id", null) // unlinked legacy record
            .single()

          if (existingByEmail && provider === "apple") {
            // An unlinked legacy account exists with this email.
            // Redirect to the link-account page so the user can decide.
            return NextResponse.redirect(
              `${origin}/auth/link-account?next=${encodeURIComponent(next)}&legacy_customer_id=${existingByEmail.id}`,
            )
          }

          // No conflict — create a fresh customer record.
          await supabase.from("customers").insert({
            auth_user_id: user.id,
            email: user.email!,
            first_name: user.user_metadata?.full_name?.split(" ")[0] || user.user_metadata?.name?.split(" ")[0] || "",
            last_name: user.user_metadata?.full_name?.split(" ").slice(1).join(" ") || "",
          })
        }
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
