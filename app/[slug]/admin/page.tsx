import { createServerClient } from "@/lib/supabase/server"
import { notFound, redirect } from "next/navigation"
import RestaurantAdminClient from "./admin-client"

export default async function TenantAdminPage({
  params,
  searchParams,
}: {
  params: { slug: string }
  searchParams: { view?: string }
}) {
  const { slug } = await params
  const { view } = await searchParams
  const supabase = await createServerClient()

  // Check authentication
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/auth/login")
  }

  // Get restaurant by slug
  const { data: restaurant, error: restaurantError } = await supabase
    .from("restaurants")
    .select("*")
    .eq("slug", slug)
    .single()

  if (restaurantError || !restaurant) {
    notFound()
  }

  // Check if user has access to this restaurant
  // Use auth_user_id to link Supabase auth user to admin_users record
  const { data: adminData } = await supabase
    .from("admin_users")
    .select("role, restaurant_id")
    .eq("auth_user_id", session.user.id)
    .single()

  if (!adminData) {
    redirect("/auth/login")
  }

  // Super admins can access any restaurant, restaurant admins only their own
  const hasAccess = adminData.role === "super_admin" || adminData.restaurant_id === restaurant.id

  if (!hasAccess) {
    redirect("/auth/login")
  }

  // Fetch cuisine types for the dropdown
  const { data: cuisineTypes } = await supabase
    .from("cuisine_types")
    .select("id, name")
    .eq("is_active", true)
    .order("display_order", { ascending: true })

  // Hardcoded marketplace areas (no database table exists yet)
  const marketplaceAreas = [
    { id: "area-metro", name: "Area Metro" },
    { id: "bayamon", name: "Bayamon" },
    { id: "caguas", name: "Caguas" },
    { id: "carolina", name: "Carolina" },
    { id: "guaynabo", name: "Guaynabo" },
    { id: "san-juan", name: "San Juan" },
    { id: "trujillo-alto", name: "Trujillo Alto" },
  ]
  
  // Allow super admins to view as restaurant admin for testing/review
  const effectiveRole = (view === "restricted" && adminData.role === "super_admin")
    ? "restaurant_admin"
    : adminData.role

  return <RestaurantAdminClient restaurantId={restaurant.id} restaurantName={restaurant.name} restaurant={restaurant} cuisineTypes={cuisineTypes || []} marketplaceAreas={marketplaceAreas || []} userRole={effectiveRole} />
}
