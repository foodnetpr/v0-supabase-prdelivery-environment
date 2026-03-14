import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// Mark an order as ready in Shipday
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { orderId, restaurantId, branchId } = body

    if (!orderId || !restaurantId) {
      return NextResponse.json({ success: false, error: "Missing orderId or restaurantId" }, { status: 400 })
    }

    const supabase = await createClient()

    // Get the order with its Shipday ID
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, shipday_order_id, status")
      .eq("id", orderId)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 })
    }

    // Update order status in our database first
    const { error: updateError } = await supabase
      .from("orders")
      .update({ status: "ready" })
      .eq("id", orderId)

    if (updateError) {
      return NextResponse.json({ success: false, error: "Failed to update order status" }, { status: 500 })
    }

    // If there's no Shipday order ID, just return success for local update
    if (!order.shipday_order_id) {
      return NextResponse.json({
        success: true,
        message: "Order marked as ready (no Shipday order linked)",
        shipdayUpdated: false,
      })
    }

    // Get restaurant/branch for API key
    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("id, shipday_api_key")
      .eq("id", restaurantId)
      .single()

    let apiKey = restaurant?.shipday_api_key

    // Check branch-level key if provided
    if (branchId) {
      const { data: branch } = await supabase
        .from("branches")
        .select("shipday_api_key")
        .eq("id", branchId)
        .single()
      
      if (branch?.shipday_api_key) {
        apiKey = branch.shipday_api_key
      }
    }

    // Fall back to environment variable
    if (!apiKey) {
      apiKey = process.env.SHIPDAY_API_KEY
    }

    if (!apiKey) {
      return NextResponse.json({
        success: true,
        message: "Order marked as ready locally (no Shipday API key configured)",
        shipdayUpdated: false,
      })
    }

    // Update Shipday order status to "READY_FOR_PICKUP"
    // Shipday API uses orderNumber to update status
    const shipdayResponse = await fetch(`https://api.shipday.com/orders/${order.shipday_order_id}/status`, {
      method: "PUT",
      headers: {
        "Authorization": `Basic ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        orderStatus: "READY_FOR_PICKUP",
      }),
    })

    if (shipdayResponse.ok) {
      return NextResponse.json({
        success: true,
        message: "Order marked as ready in both systems",
        shipdayUpdated: true,
        shipdayOrderId: order.shipday_order_id,
      })
    } else {
      const errorText = await shipdayResponse.text()
      // Still return success since local update worked
      return NextResponse.json({
        success: true,
        message: "Order marked as ready locally, Shipday update failed",
        shipdayUpdated: false,
        shipdayError: errorText,
      })
    }

  } catch (error) {
    console.error("[Shipday Mark Ready] Error:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 })
  }
}
