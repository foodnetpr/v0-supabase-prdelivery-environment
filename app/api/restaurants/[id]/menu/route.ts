import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Check if id is a UUID or a slug
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
    
    // Get restaurant by ID or slug
    const { data: restaurant, error: restaurantError } = await supabase
      .from("restaurants")
      .select("*")
      .eq(isUUID ? "id" : "slug", id)
      .single()

    if (restaurantError || !restaurant) {
      return NextResponse.json(
        { error: "Restaurant not found" },
        { status: 404 }
      )
    }

    // Get categories for this restaurant
    const { data: categories, error: categoriesError } = await supabase
      .from("categories")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .eq("is_active", true)
      .order("display_order", { ascending: true })

    if (categoriesError) {
      return NextResponse.json(
        { error: "Failed to fetch categories" },
        { status: 500 }
      )
    }

    // Get menu items with their options and choices
    const { data: menuItems, error: itemsError } = await supabase
      .from("menu_items")
      .select(`
        *,
        item_options (
          *,
          item_option_choices (
            *
          )
        )
      `)
      .eq("restaurant_id", restaurant.id)
      .eq("is_active", true)
      .order("display_order", { ascending: true })

    if (itemsError) {
      return NextResponse.json(
        { error: "Failed to fetch menu items" },
        { status: 500 }
      )
    }

    // Sort options and choices
    const sortedMenuItems = menuItems?.map(item => ({
      ...item,
      item_options: item.item_options
        ?.sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0))
        .map((option: any) => ({
          ...option,
          item_option_choices: option.item_option_choices
            ?.sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0))
        }))
    }))

    // Group items by category
    const categoriesWithItems = categories?.map(category => ({
      ...category,
      items: sortedMenuItems?.filter(item => item.category_id === category.id) || []
    }))

    // Build the response in the same format as the import JSON
    const response = {
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        slug: restaurant.slug,
        description: restaurant.description,
        logo_url: restaurant.logo_url,
        primary_color: restaurant.primary_color,
        secondary_color: restaurant.secondary_color,
        accepts_delivery: restaurant.accepts_delivery,
        accepts_pickup: restaurant.accepts_pickup,
        tax_rate: restaurant.tax_rate,
        is_active: restaurant.is_active,
      },
      categories: categoriesWithItems?.map(category => ({
        id: category.id,
        external_id: category.external_id,
        name: category.name,
        description: category.description,
        items: category.items.map((item: any) => ({
          id: item.id,
          external_id: item.external_id,
          name: item.name,
          description: item.description,
          price: item.price,
          image_url: item.image_url,
          is_available: item.is_available,
          options: item.item_options?.map((option: any) => ({
            id: option.id,
            external_id: option.external_id,
            group_name: option.category,
            required: option.is_required,
            min_select: option.min_selection,
            max_select: option.max_selection,
            choices: option.item_option_choices?.map((choice: any) => ({
              id: choice.id,
              external_id: choice.external_id,
              name: choice.name,
              price_delta: choice.price_modifier || 0,
            })) || []
          })) || []
        }))
      })) || []
    }

    return NextResponse.json(response)
  } catch (error: any) {
    console.error("Menu fetch error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch menu" },
      { status: 500 }
    )
  }
}
