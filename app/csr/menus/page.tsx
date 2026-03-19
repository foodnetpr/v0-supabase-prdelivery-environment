import { createClient } from "@/lib/supabase/server"
import { CSRMenusClient } from "./csr-menus-client"

export const metadata = {
  title: "Restaurant Menus - CSR Portal",
  description: "Edit and update restaurant menus",
}

export default async function CSRMenusPage() {
  const supabase = await createClient()
  
  // Fetch all restaurants for CSR to manage
  const { data: restaurants } = await supabase
    .from("restaurants")
    .select("id, name, slug, logo_url, cuisine_type, area, is_active")
    .order("name", { ascending: true })
  
  return <CSRMenusClient restaurants={restaurants || []} />
}
