import { createClient } from "@/lib/supabase/server"
import { CSRPortalClient } from "./csr-portal-client"

export const dynamic = "force-dynamic"

export default async function CSRPortalPage() {
  const supabase = await createClient()

  // Fetch all active restaurants for the selector
  const { data: restaurants } = await supabase
    .from("restaurants")
    .select(`
      id, name, slug, logo_url, cuisine_type, cuisine_types, area, tax_rate,
      delivery_fee, delivery_base_fee, dispatch_fee_percent,
      address, city, state,
      athmovil_public_token, athmovil_ecommerce_id, athmovil_enabled,
      stripe_account_id
    `)
    .eq("is_active", true)
    .order("name", { ascending: true })

  return (
    <CSRPortalClient restaurants={restaurants || []} />
  )
}
