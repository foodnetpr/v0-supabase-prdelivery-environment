import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const orderId = searchParams.get("orderId")

  if (!orderId) {
    return NextResponse.json({ success: false, error: "Missing orderId" }, { status: 400 })
  }

  // Get API key from environment
  const apiKey = process.env.SHIPDAY_API_KEY

  if (!apiKey) {
    return NextResponse.json({ 
      success: false, 
      error: "Shipday API key not configured" 
    }, { status: 400 })
  }

  try {
    // Fetch order details from Shipday
    const response = await fetch(`https://api.shipday.com/orders/${orderId}`, {
      method: "GET",
      headers: {
        "Authorization": `Basic ${apiKey}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json({
        success: false,
        error: "Failed to fetch Shipday order",
        details: errorText,
      }, { status: response.status })
    }

    const orderData = await response.json()

    // Extract tracking info
    const tracking = {
      orderId: orderData.orderId || orderData.id,
      status: orderData.orderStatus?.orderState || orderData.status || "Unknown",
      driverName: orderData.assignedCarrier?.name || orderData.driverName || null,
      driverPhone: orderData.assignedCarrier?.phoneNumber || orderData.driverPhone || null,
      eta: orderData.estimatedDeliveryTime || orderData.eta || null,
      trackingLink: orderData.trackingLink || null,
      lastUpdate: orderData.lastUpdate || orderData.updatedAt || null,
    }

    return NextResponse.json({
      success: true,
      tracking,
    })
  } catch (error) {
    console.error("Error fetching Shipday tracking:", error)
    return NextResponse.json({
      success: false,
      error: "Error fetching tracking info",
      details: (error as Error).message,
    }, { status: 500 })
  }
}
