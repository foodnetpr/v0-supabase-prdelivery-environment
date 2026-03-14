import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export default async function AdminLoginPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()

  // Check if user is already logged in
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    // Already logged in, redirect to admin
    redirect(`/${slug}/admin`)
  }

  // Not logged in, redirect to auth login with return URL
  const returnUrl = encodeURIComponent(`/${slug}/admin`)
  redirect(`/auth/login?returnUrl=${returnUrl}`)
}
