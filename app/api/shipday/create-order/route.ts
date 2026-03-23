import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const getAdminClient = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = getAdminClient()

    // Support both formats: direct orderData (from checkout) or orderId (from CSR dispatch)
    let order: any = null
    let restaurantId: string
    let branchId: string | null = null

    if (body.orderId) {
      // CSR Dispatch format: fetch order from database
      const { data: fetchedOrder, error: orderError } = await supabase
        .from("orders")
        .select(`
          *,
          order_items (id, item_name, quantity, unit_price, total_price, selected_options),
          restaurants (id, name, shipday_api_key, restaurant_address)
        `)
        .eq("id", body.orderId)
        .single()

      if (orderError || !fetchedOrder) {
        console.error("[Shipday] Could not fetch order:", orderError)
        return NextResponse.json({ error: "Order not found" }, { status: 404 })
      }

      order = fetchedOrder
      restaurantId = body.restaurantId || order.restaurant_id
      branchId = body.branchId || order.branch_id

      // Only process delivery orders
      if (order.delivery_type !== "delivery") {
        return NextResponse.json({ success: true, message: "Not a delivery order" })
      }
    } else if (body.orderData) {
      // Checkout format: use provided orderData directly
      const orderData = body.orderData

      // Only process delivery orders
      if (orderData.orderType !== "delivery" && orderData.orderType !== "Delivery") {
        return NextResponse.json({ success: true, message: "Not a delivery order" })
      }

      restaurantId = orderData.restaurantId
      branchId = orderData.branchId || null

      if (!restaurantId) {
        console.error("[Shipday] No restaurantId in orderData")
        return NextResponse.json({ error: "Missing restaurantId" }, { status: 400 })
      }
    } else {
      return NextResponse.json({ error: "Missing orderId or orderData" }, { status: 400 })
    }

    // Fetch the restaurant's Shipday API key from the database
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
      return NextResponse.json({ error: "Shipday no está configurado para este restaurante" }, { status: 400 })
    }

    // Pickup address: use branch address if available, otherwise restaurant
    const pickupAddress = branchData
      ? [branchData.address, branchData.city, branchData.state, branchData.zip].filter(Boolean).join(", ")
      : restaurant.restaurant_address || ""

    let shipdayOrder: any

    if (order) {
      // Build from database order (CSR Dispatch format)
      const customerAddress = [
        order.delivery_address,
        order.delivery_city,
        order.delivery_state,
        order.delivery_zip,
      ]
        .filter(Boolean)
        .join(", ")

      shipdayOrder = {
        orderNumber: order.order_number || `ORD-${order.id.slice(0, 8)}`,
        customerName: order.customer_name || "Customer",
        customerAddress: customerAddress || "Address not provided",
        customerEmail: order.customer_email || "",
        customerPhoneNumber: order.customer_phone || "",
        restaurantName: branchData ? `${restaurant.name} - ${branchData.name}` : restaurant.name,
        restaurantAddress: pickupAddress,
        orderItems: (order.order_items || []).map((item: any) => ({
          name: item.item_name,
          quantity: item.quantity || 1,
          unitPrice: item.unit_price || 0,
          addOns: item.selected_options
            ? Object.values(item.selected_options)
                .flat()
                .map((opt: any) => (typeof opt === "string" ? opt : opt?.name || ""))
                .filter(Boolean)
                .join(", ")
            : "",
        })),
        totalOrderCost: order.total || 0,
        deliveryFee: order.delivery_fee || 0,
        tips: order.tip || 0,
        tax: order.tax || 0,
        expectedDeliveryDate: order.delivery_date || "",
        expectedPickupTime: order.delivery_time || "12:00",
        expectedDeliveryTime: order.delivery_time || "12:00",
        deliveryInstruction: order.special_instructions || "",
      }
    } else {
      // Build from orderData (checkout format)
      const orderData = body.orderData
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

      shipdayOrder = {
        orderNumber: `CAT-${Date.now()}`,
        customerName: eventDetails.name || eventDetails.company || orderData.customerEmail?.split("@")[0] || "Customer",
        customerAddress: customerAddress || "Address not provided",
        customerEmail: orderData.customerEmail || "",
        customerPhoneNumber: orderData.customerPhone || "",
        restaurantName: branchData ? `${restaurant.name} - ${branchData.name}` : (restaurant.name || orderData.restaurantName || ""),
        restaurantAddress: pickupAddress || orderData.restaurantAddress || "",
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
        expectedDeliveryDate: eventDetails.eventDate || "",
        expectedPickupTime: eventDetails.eventTime || "12:00",
        expectedDeliveryTime: eventDetails.eventTime || "12:00",
        deliveryInstruction: [
          eventDetails.specialInstructions || "",
          orderData.includeUtensils ? "Include utensils." : "",
          orderData.deliveryZone ? `Zone: ${orderData.deliveryZone}` : "",
        ]
          .filter(Boolean)
          .join(" | "),
      }
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

    const shipdayOrderId = result.id || result.orderId

    // Update the order with the Shipday ID if we have an order from database
    if (order && shipdayOrderId) {
      await supabase
        .from("orders")
        .update({ shipday_order_id: String(shipdayOrderId) })
        .eq("id", order.id)
    }

    return NextResponse.json({
      success: true,
      shipdayOrderId,
      trackingUrl: result.trackingUrl || null,
    })
  } catch (error: any) {
    console.error("[Shipday] Error creating order:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
