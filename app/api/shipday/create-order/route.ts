import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const getAdminClient = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  try {
    const { orderData } = await request.json()

    // Only process delivery orders
    if (orderData.orderType !== "delivery" && orderData.orderType !== "Delivery") {
      return NextResponse.json({ success: true, message: "Not a delivery order" })
    }

    const restaurantId = orderData.restaurantId
    if (!restaurantId) {
      console.error("[Shipday] No restaurantId in orderData")
      return NextResponse.json({ error: "Missing restaurantId" }, { status: 400 })
    }

    // Fetch the restaurant's Shipday API key from the database
    const supabase = getAdminClient()
    const { data: restaurant, error } = await supabase
      .from("restaurants")
      .select("shipday_api_key, name, restaurant_address")
      .eq("id", restaurantId)
      .single()

    if (error || !restaurant) {
      console.error("[Shipday] Could not fetch restaurant:", error)
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 })
    }

    // Check for branch-specific overrides
    let branchData: any = null
    const branchId = orderData.branchId
    if (branchId) {
      const { data: branch } = await supabase
        .from("branches")
        .select("shipday_api_key, name, address, city, state, zip")
        .eq("id", branchId)
        .single()
      branchData = branch
    }

    // API key priority: branch -> restaurant -> platform default
    const apiKey = branchData?.shipday_api_key || restaurant.shipday_api_key || process.env.SHIPDAY_API_KEY
    if (!apiKey) {
      console.log("[Shipday] No Shipday API key configured for restaurant:", restaurantId)
      return NextResponse.json({ success: true, message: "Shipday not configured for this restaurant" })
    }

    // Pickup address: use branch address if available, otherwise restaurant
    const pickupAddress = branchData
      ? [branchData.address, branchData.city, branchData.state, branchData.zip].filter(Boolean).join(", ")
      : restaurant.restaurant_address || ""

    // Build the full customer address
    const eventDetails = orderData.eventDetails || {}
    const customerAddress = [
      eventDetails.address,
      eventDetails.address2,
      eventDetails.city,
      eventDetails.state,
      eventDetails.zip,
    ]
      .filter(Boolean)
      .join(", ")

    // Format order for Shipday API
    const shipdayOrder = {
      orderNumber: `CAT-${Date.now()}`,
      customerName: eventDetails.name || eventDetails.company || orderData.customerEmail?.split("@")[0] || "Customer",
      customerAddress: customerAddress || "Address not provided",
      customerEmail: orderData.customerEmail || "",
      customerPhoneNumber: orderData.customerPhone || "",

      // Restaurant/branch details
      restaurantName: branchData ? `${restaurant.name} - ${branchData.name}` : (restaurant.name || orderData.restaurantName || ""),
      restaurantAddress: pickupAddress || orderData.restaurantAddress || "",

      // Order items
      orderItems: (orderData.cart || []).map((item: any) => ({
        name: item.name,
        quantity: item.quantity || 1,
        unitPrice: item.price || 0,
        addOns: item.selectedOptions
          ? Object.values(item.selectedOptions)
              .flat()
              .map((opt: any) => (typeof opt === "string" ? opt : opt?.name || ""))
              .filter(Boolean)
              .join(", ")
          : "",
      })),

      totalOrderCost: orderData.total || 0,
      deliveryFee: orderData.deliveryFee || 0,
      tips: orderData.tip || 0,
      tax: orderData.tax || 0,

      // Delivery timing
      expectedDeliveryDate: eventDetails.eventDate || "",
      expectedPickupTime: eventDetails.eventTime || "12:00",
      expectedDeliveryTime: eventDetails.eventTime || "12:00",

      // Additional info
      deliveryInstruction: [
        eventDetails.specialInstructions || "",
        orderData.includeUtensils ? "Include utensils." : "",
        orderData.deliveryZone ? `Zone: ${orderData.deliveryZone}` : "",
      ]
        .filter(Boolean)
        .join(" | "),
    }

    console.log("[Shipday] Creating delivery order:", shipdayOrder.orderNumber, "for:", shipdayOrder.restaurantName)

    // Call Shipday API
    const response = await fetch("https://api.shipday.com/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${apiKey}`,
      },
      body: JSON.stringify(shipdayOrder),
    })

    if (!response.ok) {
      let errorMsg = response.statusText
      try {
        const errorData = await response.json()
        errorMsg = errorData.message || errorMsg
      } catch {}
      console.error("[Shipday] API error:", errorMsg)
      throw new Error(`Shipday API error: ${errorMsg}`)
    }

    const result = await response.json()
    console.log("[Shipday] Order created successfully:", result)

    return NextResponse.json({
      success: true,
      shipdayOrderId: result.id || result.orderId,
      trackingUrl: result.trackingUrl || null,
    })
  } catch (error: any) {
    console.error("[Shipday] Error creating order:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
