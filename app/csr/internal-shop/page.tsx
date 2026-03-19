import { createClient } from "@/lib/supabase/server"
import { InternalShopClient } from "@/app/super-admin/internal-shop/internal-shop-client"

export const metadata = {
  title: "Internal Shop - CSR Portal",
  description: "Manage platform-owned items",
}

export default async function CSRInternalShopPage() {
  const supabase = await createClient()
  
  const { data: items } = await supabase
    .from("internal_shop_items")
    .select("*")
    .order("display_order", { ascending: true })
  
  return (
    <InternalShopClient 
      initialItems={items || []} 
      backUrl="/csr"
      backLabel="Volver al Portal"
    />
  )
}
