import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// Test Shipday connection and optionally send a test order
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { restaurantId, branchId, orderId, mode = "test" } = body

    // mode: "test" = just test API connection, "send" = send actual order to Shipday

    const supabase = await createClient()

    // Get restaurant data
    const { data: restaurant, error: restaurantError } = await supabase
      .from("restaurants")
      .select("id, name, shipday_api_key, address, city, state, zip, phone")
      .eq("id", restaurantId)
      .single()

    if (restaurantError || !restaurant) {
      return NextResponse.json({ success: false, error: "Restaurant not found" }, { status: 404 })
    }

    // Get branch data if provided
    let branch = null
    if (branchId) {
      const { data: branchData } = await supabase
        .from("branches")
        .select("id, name, shipday_api_key, address, city, state, zip, phone")
        .eq("id", branchId)
        .single()
      branch = branchData
    }

    // Determine API key (branch > restaurant > env)
    const apiKey = branch?.shipday_api_key || restaurant.shipday_api_key || process.env.SHIPDAY_API_KEY

    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: "No Shipday API key configured",
        details: {
          branchKey: !!branch?.shipday_api_key,
          restaurantKey: !!restaurant.shipday_api_key,
          envKey: !!process.env.SHIPDAY_API_KEY,
        }
      }, { status: 400 })
    }

    // Test mode: just verify API connection
    if (mode === "test") {
      const testResponse = await fetch("https://api.shipday.com/carriers", {
        method: "GET",
        headers: {
          "Authorization": `Basic ${apiKey}`,
          "Content-Type": "application/json",
        },
      })

      if (testResponse.ok) {
        const carriers = await testResponse.json()
        return NextResponse.json({
          success: true,
          message: "Shipday connection successful!",
          apiKeySource: branch?.shipday_api_key ? "branch" : restaurant.shipday_api_key ? "restaurant" : "environment",
          carriersFound: Array.isArray(carriers) ? carriers.length : 0,
        })
      } else {
        const errorText = await testResponse.text()
        return NextResponse.json({
          success: false,
          error: "Shipday API connection failed",
          status: testResponse.status,
          details: errorText,
        }, { status: 400 })
      }
    }

    // Send mode: create actual Shipday order from existing order
    if (mode === "send" && orderId) {
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .select(`
          *,
          order_items (*)
        `)
        .eq("id", orderId)
        .single()

      if (orderError || !order) {
        return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 })
      }

      if (order.order_type !== "delivery" && order.delivery_type !== "delivery") {
        return NextResponse.json({ success: false, error: "Order is not a delivery order" }, { status: 400 })
      }

      // Build pickup address from branch or restaurant
      const pickupAddress = branch 
        ? `${branch.address}, ${branch.city}, ${branch.state} ${branch.zip}`
        : `${restaurant.address}, ${restaurant.city}, ${restaurant.state} ${restaurant.zip}`

      // Build order items description
      const itemsDescription = order.order_items
        ?.map((item: any) => `${item.quantity}x ${item.name}`)
        .join(", ") || "Catering Order"

      // Format time as HH:MM:SS (Shipday requires this format)
      const formatTime = (time: string | null) => {
        if (!time) return "12:00:00"
        // If already has seconds, return as-is
        if (time.match(/^\d{2}:\d{2}:\d{2}$/)) return time
        // Add seconds if missing
        if (time.match(/^\d{2}:\d{2}$/)) return `${time}:00`
        return "12:00:00"
      }

      // Create Shipday order payload per Shipday API v2 docs
      // IMPORTANT: Numbers must be numbers, not strings!
      const shipdayPayload = {
        orderNumber: `JR-${order.id.slice(0, 8).toUpperCase()}`,
        customerName: order.customer_name || "Customer",
        customerPhoneNumber: order.customer_phone || "",
        customerEmail: order.customer_email || "",
        customerAddress: order.delivery_address || "",
        deliveryInstruction: order.special_instructions || "",
        restaurantName: restaurant.name,
        restaurantAddress: pickupAddress,
        restaurantPhoneNumber: branch?.phone || restaurant.phone || "",
        expectedDeliveryDate: order.order_date || new Date().toISOString().split("T")[0],
        expectedDeliveryTime: formatTime(order.order_time),
        expectedPickupTime: formatTime(order.order_time),
        orderItem: [{
          name: itemsDescription,
          quantity: 1,
          unitPrice: Number(order.total_amount) || 0,
        }],
        tips: Number(order.tip_amount) || 0,
        tax: Number(order.tax_amount) || 0,
        discountAmount: 0,
        deliveryFee: Number(order.delivery_fee) || 0,
        totalOrderCost: Number(order.total_amount) || 0,
        paymentMethod: "credit_card",
        orderSource: "JunteReady",
      }

      const shipdayResponse = await fetch("https://api.shipday.com/orders", {
        method: "POST",
        headers: {
          "Authorization": `Basic ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(shipdayPayload),
      })

      const responseText = await shipdayResponse.text()

      if (shipdayResponse.ok) {
        let shipdayResult
        try {
          shipdayResult = JSON.parse(responseText)
        } catch {
          shipdayResult = { raw: responseText }
        }
        
        // Shipday returns orderNumber or id depending on API version
        const shipdayOrderId = shipdayResult.orderId || shipdayResult.orderNumber || shipdayResult.id || shipdayResult.orderID
        
        // Update order with Shipday ID if available
        if (shipdayOrderId) {
          await supabase
            .from("orders")
            .update({ shipday_order_id: String(shipdayOrderId) })
            .eq("id", orderId)
        }

        return NextResponse.json({
          success: true,
          message: "Order sent to Shipday successfully!",
          shipdayOrderId: shipdayOrderId || "Created (check Shipday dashboard)",
          shipdayResponse: shipdayResult,
        })
      } else {
        return NextResponse.json({
          success: false,
          error: "Failed to create Shipday order",
          status: shipdayResponse.status,
          details: responseText,
        }, { status: 400 })
      }
    }

    return NextResponse.json({ success: false, error: "Invalid mode or missing orderId for send mode" }, { status: 400 })

  } catch (error) {
    console.error("[Shipday Test] Error:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 })
  }
}
