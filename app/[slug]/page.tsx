import { createClient } from "@/lib/supabase/server"
import { notFound, redirect } from "next/navigation"
import CustomerPortal from "@/components/customer-portal"

export default async function TenantPortalPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ reorder?: string }>
}) {
  const { slug } = await params
  const { reorder } = await searchParams

  if (slug === "admin" || slug === "auth" || slug === "api") {
    redirect(`/${slug}`)
  }

  const supabase = await createClient()
  
  // Get logged-in user and their customer data
  const { data: { user } } = await supabase.auth.getUser()
  
  let customer = null
  let customerAddresses: any[] = []
  
  if (user) {
    // Get customer record
    const { data: customerData } = await supabase
      .from("customers")
      .select("*")
      .eq("auth_user_id", user.id)
      .single()
    
    customer = customerData
    
    if (customer) {
      // Get customer addresses
      const { data: addresses } = await supabase
        .from("customer_addresses")
        .select("*")
        .eq("customer_id", customer.id)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false })
      
      customerAddresses = addresses || []
    }
  }

  try {
    const { data: restaurant, error: restaurantError } = await supabase
      .from("restaurants")
      .select("*")
      .eq("slug", slug)
      .eq("is_active", true)
      .single()

    if (restaurantError || !restaurant) {
      notFound()
    }

    const { data: categories } = await supabase
      .from("categories")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .eq("is_active", true)
      .order("display_order", { ascending: true, nullsFirst: false })

    const { data: menuItems } = await supabase
      .from("menu_items")
      .select("*, item_options(*, item_option_choices(*))")
      .eq("restaurant_id", restaurant.id)
      .eq("is_active", true)
      .order("display_order", { ascending: true, nullsFirst: false })

    let servicePackages = []
    let packageAddons = []
    let packageInclusions = []

    try {
      const { data: packagesData, error: packagesError } = await supabase
        .from("service_packages")
        .select("*")
        .eq("restaurant_id", restaurant.id)
        .eq("is_active", true)
        .order("display_order")

      if (packagesError) {
        console.error("[v0] Service packages query error:", packagesError)
      } else if (packagesData && packagesData.length > 0) {
        servicePackages = packagesData
        const packageIds = packagesData.map((pkg) => pkg.id)

        // Fetch package addons separately
        const { data: addonsData } = await supabase.from("package_addons").select("*").in("package_id", packageIds)

        if (addonsData) {
          packageAddons = addonsData
          const addonIds = addonsData.map((addon) => addon.id)

          // Fetch addon choices
          if (addonIds.length > 0) {
            const { data: choicesData } = await supabase
              .from("package_addon_choices")
              .select("*")
              .in("addon_id", addonIds)

            // Attach choices to addons
            packageAddons = addonsData.map((addon) => ({
              ...addon,
              package_addon_choices: (choicesData || []).filter((choice) => choice.addon_id === addon.id),
            }))
          }
        }

        // Fetch package inclusions separately
        const { data: inclusionsData } = await supabase
          .from("package_inclusions")
          .select("*")
          .in("package_id", packageIds)

        if (inclusionsData) {
          packageInclusions = inclusionsData
        }

        // Combine the data
        servicePackages = packagesData.map((pkg) => ({
          ...pkg,
          package_addons: packageAddons.filter((addon) => addon.package_id === pkg.id),
          package_inclusions: packageInclusions.filter((inc) => inc.package_id === pkg.id),
        }))
      }
    } catch (error) {
      console.error("[v0] Service packages fetch error:", error)
      // Continue without service packages
      servicePackages = []
    }

    const menuItemIds = (menuItems || []).map((item) => item.id)

    // Fetch item sizes (still needed separately — not nested above to keep ordering)
    const { data: itemSizes } =
      menuItemIds.length > 0
        ? await supabase
            .from("item_sizes")
            .select("*")
            .in("menu_item_id", menuItemIds)
            .order("display_order", { ascending: true })
        : { data: [] }

    // item_options and item_option_choices are already nested on each menuItem via the select above
    console.log('[v0] Raw menuItems sample:', JSON.stringify(menuItems?.slice(0, 3).map((item: any) => ({
      id: item.id,
      name: item.name,
      item_options_count: item.item_options?.length,
      item_options_sample: item.item_options?.slice(0, 2).map((opt: any) => ({
        id: opt.id,
        category: opt.category,
        choices_count: opt.item_option_choices?.length
      }))
    }))))
    const menuItemsWithOptions = (menuItems || []).map((item) => ({
      ...item,
      base_price: Number(item.price) || 0,
      category: categories?.find((cat) => cat.id === item.category_id)?.name || "",
      item_options: (item.item_options || []).map((opt: any) => ({
        ...opt,
        item_option_choices: (opt.item_option_choices || []).sort(
          (a: any, b: any) => (a.display_order ?? 0) - (b.display_order ?? 0)
        ),
      })),
      sizes: (itemSizes || []).filter((size) => size.menu_item_id === item.id),
    }))

    const { data: deliveryZones } = await supabase
      .from("delivery_zones")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .eq("is_active", true)
      .order("display_order")

    // Fetch branches if this is a chain restaurant
    let branches: any[] = []
    let branchMenuOverrides: any[] = []
    if (restaurant.is_chain) {
      const { data: branchData } = await supabase
        .from("branches")
        .select("*")
        .eq("restaurant_id", restaurant.id)
        .eq("is_active", true)
        .order("display_order", { ascending: true })
      branches = branchData || []

      // Fetch all overrides for all branches in one query
      if (branches.length > 0) {
        const branchIds = branches.map((b) => b.id)
        const { data: overrideData } = await supabase
          .from("branch_menu_overrides")
          .select("*")
          .in("branch_id", branchIds)
        branchMenuOverrides = overrideData || []

        // Fetch branch-package assignments
        const { data: branchPkgData } = await supabase
          .from("branch_service_packages")
          .select("branch_id, package_id")
          .in("branch_id", branchIds)

        // Attach assigned package IDs to each branch
        branches = branches.map((b) => ({
          ...b,
          assigned_package_ids: (branchPkgData || [])
            .filter((bp) => bp.branch_id === b.id)
            .map((bp) => bp.package_id),
        }))
      }
    }

    // Fetch container rates for delivery fee calculation
    const { data: containerRates } = await supabase
      .from("delivery_container_rates")
      .select("*")
      .eq("restaurant_id", restaurant.id)

    // Fetch restaurant meal period hours (breakfast, lunch, dinner)
    const { data: restaurantHours } = await supabase
      .from("restaurant_hours")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .order("day_of_week", { ascending: true })

    let reorderData = null
    if (reorder) {
      const { data: order } = await supabase
        .from("orders")
        .select(
          `
          *,
          order_items (*)
        `,
        )
        .eq("id", reorder)
        .single()

      if (order) {
        reorderData = order
      }
    }

    return (
      <CustomerPortal
        restaurant={restaurant}
        categories={categories || []}
        menuItems={menuItemsWithOptions}
        servicePackages={servicePackages || []}
        deliveryZones={deliveryZones || []}
        reorderData={reorderData}
        branches={branches}
        branchMenuOverrides={branchMenuOverrides}
        containerRates={containerRates || []}
        restaurantHours={restaurantHours || []}
        customer={customer}
        customerAddresses={customerAddresses}
      />
    )
  } catch (error) {
    console.error("[v0] Portal error:", error)
    notFound()
  }
}
