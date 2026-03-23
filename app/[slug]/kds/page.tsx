import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import { KDSClient } from "@/components/kds-client"

export const dynamic = "force-dynamic"

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return {
    title: `KDS - Kitchen Display`,
    description: `Sistema de visualización de cocina para ${slug}`,
  }
}

export default async function KDSPage({ 
  params, 
  searchParams 
}: { 
  params: Promise<{ slug: string }>
  searchParams: Promise<{ branch?: string; token?: string }>
}) {
  const { slug } = await params
  const { branch: branchId, token: accessToken } = await searchParams
  console.log('[v0] KDS Page - slug:', slug, 'branchId:', branchId, 'accessToken:', accessToken ? 'present' : 'missing')
  const supabase = await createClient()

  // Get restaurant first (allow inactive for KDS)
  const { data: restaurant, error: restaurantError } = await supabase
    .from("restaurants")
    .select("*")
    .eq("slug", slug)
    .single()

  if (restaurantError || !restaurant) {
    notFound()
  }

  let hasAccess = false
  let tokenValidForBranch: string | null = null

  // Method 1: Token-based authentication (for tablets/direct bookmarks)
  // This is the primary method for kitchen tablets - no login required
  if (accessToken) {
    console.log('[v0] KDS Page - checking token auth, restaurant token:', restaurant.kds_access_token ? 'exists' : 'missing')
    // Check if token matches restaurant's KDS token
    if (restaurant.kds_access_token && restaurant.kds_access_token === accessToken) {
      hasAccess = true
      console.log('[v0] KDS Page - token matched restaurant token!')
    }
    
    // Check if token matches a specific branch's KDS token
    if (!hasAccess && branchId) {
      const { data: branch } = await supabase
        .from("branches")
        .select("kds_access_token")
        .eq("id", branchId)
        .eq("restaurant_id", restaurant.id)
        .single()
      
      if (branch?.kds_access_token && branch.kds_access_token === accessToken) {
        hasAccess = true
        tokenValidForBranch = branchId
      }
    }
    
    // No branch specified but token provided - check all branches for a match
    if (!hasAccess) {
      const { data: branches } = await supabase
        .from("branches")
        .select("id, kds_access_token")
        .eq("restaurant_id", restaurant.id)
        .not("kds_access_token", "is", null)
      
      const matchingBranch = branches?.find(b => b.kds_access_token === accessToken)
      if (matchingBranch) {
        hasAccess = true
        tokenValidForBranch = matchingBranch.id
      }
    }
  }

  // Method 2: User session authentication (for logged-in admin users)
  if (!hasAccess) {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      // No valid token and not logged in - redirect to login
      const returnUrl = encodeURIComponent(`/${slug}/kds${branchId ? `?branch=${branchId}` : ''}`)
      redirect(`/auth/login?returnUrl=${returnUrl}`)
    }

    // Check if user has access to this restaurant via restaurant_users
    const { data: restaurantUser } = await supabase
      .from("restaurant_users")
      .select("role")
      .eq("restaurant_id", restaurant.id)
      .eq("user_id", user.id)
      .single()

    // Check admin_users table (for restaurant admins created via admin panel)
    const { data: adminUser } = await supabase
      .from("admin_users")
      .select("role, restaurant_id")
      .eq("auth_user_id", user.id)
      .single()
    
    const isRestaurantAdmin = adminUser?.restaurant_id === restaurant.id || adminUser?.role === "super_admin"

    // Also check super admin via profiles
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_super_admin")
      .eq("id", user.id)
      .single()

    const isSuperAdmin = profile?.is_super_admin || false
    hasAccess = !!(restaurantUser || isRestaurantAdmin || isSuperAdmin)
    
    if (!hasAccess) {
      // User is logged in but doesn't have access - show unauthorized page
      redirect(`/${slug}`)
    }
  }

  // At this point hasAccess is guaranteed to be true
  // Use branch from token validation if no explicit branch specified
  const effectiveBranchId = branchId || tokenValidForBranch
  console.log("[v0] KDS - restaurant:", restaurant.id, "effectiveBranchId:", effectiveBranchId)

  // Get orders: include current day pending/preparing/ready AND future scheduled orders
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString().split('T')[0]

  // Build orders query - get active orders for today AND future scheduled orders
  // We use delivery_date to determine if an order is for today or future
  let ordersQuery = supabase
    .from("orders")
    .select(`
      *,
      order_items (
        id,
        item_name,
        quantity,
        unit_price,
        total_price,
        selected_options
      )
    `)
    .eq("restaurant_id", restaurant.id)
    .in("status", ["pending", "preparing", "ready", "completed", "confirmed"])
    .gte("delivery_date", todayStr) // Include today and future dates
    .order("delivery_date", { ascending: true })
    .order("created_at", { ascending: false })

  // If branch filter is specified, only show that branch's orders
  if (effectiveBranchId) {
    ordersQuery = ordersQuery.eq("branch_id", effectiveBranchId)
  }

  const { data: orders, error: ordersError } = await ordersQuery
  console.log("[v0] KDS - todayStr:", todayStr, "orders found:", orders?.length, "error:", ordersError?.message)

  // Get branch name if filtering by branch
  let branchName = null
  if (effectiveBranchId) {
    const { data: branch } = await supabase
      .from("branches")
      .select("name")
      .eq("id", effectiveBranchId)
      .single()
    branchName = branch?.name
  }

  // Get branch logo if available, otherwise use restaurant logo
  let logoUrl = restaurant.logo_url
  if (effectiveBranchId) {
    const { data: branchData } = await supabase
      .from("branches")
      .select("logo_url")
      .eq("id", effectiveBranchId)
      .single()
    if (branchData?.logo_url) {
      logoUrl = branchData.logo_url
    }
  }

  // Get admin PIN (prefer branch PIN if accessing a branch, fallback to restaurant PIN)
  let adminPin = restaurant.kds_admin_pin || null
  if (effectiveBranchId) {
    const { data: branchPinData } = await supabase
      .from("branches")
      .select("kds_admin_pin")
      .eq("id", effectiveBranchId)
      .single()
    if (branchPinData?.kds_admin_pin) {
      adminPin = branchPinData.kds_admin_pin
    }
  }

  return (
    <KDSClient
      restaurant={{
        id: restaurant.id,
        name: restaurant.name,
        slug: restaurant.slug,
        logo_url: logoUrl,
        kds_admin_pin: adminPin,
      }}
      branchId={effectiveBranchId}
      branchName={branchName}
      initialOrders={orders || []}
      accessToken={accessToken || undefined}
    />
  )
}
