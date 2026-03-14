import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { CustomerAccount } from "@/components/customer-account"

export default async function AccountPage({ params }: { params: { slug: string } }) {
  const { slug } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/${slug}/customer-auth?mode=login&redirect=account`)
  }

  // Get restaurant details
  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id, name, primary_color")
    .eq("slug", slug)
    .single()

  if (!restaurant) {
    redirect("/")
  }

  // Get user's orders
  const { data: orders } = await supabase
    .from("orders")
    .select(
      `
      *,
      order_items (
        *,
        menu_items (name, image_url)
      )
    `,
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  // Get saved addresses
  const { data: addresses } = await supabase
    .from("customer_addresses")
    .select("*")
    .eq("user_id", user.id)
    .order("is_default", { ascending: false })

  return (
    <CustomerAccount
      user={user}
      restaurant={restaurant}
      orders={orders || []}
      addresses={addresses || []}
      slug={slug}
    />
  )
}
