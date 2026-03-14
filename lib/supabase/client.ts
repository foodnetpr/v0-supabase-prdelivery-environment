import { createBrowserClient as createSupabaseBrowserClient } from "@supabase/ssr"

export function createBrowserClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[v0] Supabase environment variables not found")
    throw new Error("Supabase URL and Key are required")
  }

  return createSupabaseBrowserClient(supabaseUrl, supabaseAnonKey)
}

export function createClient() {
  return createBrowserClient()
}
