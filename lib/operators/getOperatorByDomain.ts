import { createClient } from "@/lib/supabase/server"

export interface Operator {
  id: string
  name: string
  slug: string
  domain: string | null
  logo_url: string | null
  primary_color: string | null
  secondary_color: string | null
}

export async function getOperatorByDomain(domain: string): Promise<Operator | null> {
  const supabase = await createClient()

  // First, try to find operator by exact domain match
  const { data: operator } = await supabase
    .from("operators")
    .select("id, name, slug, domain, logo_url, primary_color, secondary_color")
    .eq("domain", domain)
    .single()

  // Fallback logic for localhost, Vercel preview URLs, or no match
  if (
    domain.includes("localhost") ||
    domain.includes("v0-supabase-environment-error") ||
    !operator
  ) {
    // Return foodnetpr operator as default
    const { data: foodnetpr } = await supabase
      .from("operators")
      .select("id, name, slug, domain, logo_url, primary_color, secondary_color")
      .eq("slug", "foodnetpr")
      .single()

    return foodnetpr
  }

  return operator
}
