import { stripe } from "@/lib/stripe"
import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Track which sessions we've already processed to avoid duplicates
const processedSessions = new Set<string>()

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const sessionId = searchParams.get("session_id")

  if (!sessionId) {
    return NextResponse.json({ error: "Missing session_id" }, { status: 400 })
  }

  try {
    // Parse the stripeAccountId from the query if provided (for connected accounts)
    const stripeAccountId = searchParams.get("stripe_account_id")
    
    // Retrieve session, using connected account if specified
    const stripeOptions = stripeAccountId ? { stripeAccount: stripeAccountId } : undefined
    const session = await stripe.checkout.sessions.retrieve(sessionId, stripeOptions)

    // If payment is complete and we haven't processed this session yet
    if (session.payment_status === "paid" && session.metadata?.restaurantId && !processedSessions.has(sessionId)) {
      processedSessions.add(sessionId)

      // Reconstruct orderData from individual metadata fields
      const metadata = session.metadata
      const orderData = {
        restaurantId: metadata.restaurantId,
        branchId: metadata.branchId,
        orderType: metadata.orderType,
        customerEmail: metadata.customerEmail,
        customerPhone: metadata.customerPhone,
        eventDetails: {
          name: metadata.customerName,
          email: metadata.customerEmail,
          phone: metadata.customerPhone,
          eventDate: metadata.eventDate,
          eventTime: metadata.eventTime,
          address: metadata.address,
          city: metadata.city,
          zip: metadata.zip,
        },
        subtotal: parseFloat(metadata.subtotal || "0"),
        tax: parseFloat(metadata.tax || "0"),
        deliveryFee: parseFloat(metadata.deliveryFee || "0"),
        tip: parseFloat(metadata.tip || "0"),
        total: parseFloat(metadata.total || "0"),
        includeUtensils: metadata.includeUtensils === "true",
        // Parse cart from truncated JSON (may be incomplete for very large orders)
        cart: metadata.cart ? (() => {
          try {
            const parsed = JSON.parse(metadata.cart.replace(/\.\.\.$/,""))
            // Expand the abbreviated cart back to full format
            return parsed.map((item: any) => ({
              name: item.n,
              quantity: item.q,
              price: item.p,
              totalPrice: item.p
            }))
          } catch {
            return []
          }
        })() : [],
        stripeAccountId: stripeAccountId || null,
      }

      // --- Insert order into DB with financial snapshot ---
      try {
        await insertOrderWithFinancials(orderData, sessionId)
      } catch (dbError) {
        console.error("[v0] Order DB insert failed:", dbError)
        // Don't fail the payment flow if DB insert fails
      }

      // Send notifications
      await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/send-notifications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderData, sessionId }),
      })

      if (orderData.orderType === "Delivery" || orderData.orderType === "delivery") {
        try {
          await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/shipday/create-order`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderData }),
          })
        } catch (shipdayError) {
          console.error("[v0] Shipday order creation failed:", shipdayError)
        }
      }
    }

    return NextResponse.json({
      status: session.status,
      payment_status: session.payment_status,
    })
  } catch (error: any) {
    console.error("Error checking payment status:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * Insert the order into the DB and compute the financial split:
 * - food_subtotal: total of menu items only (what the restaurant provides)
 * - service_revenue: total of service package items (JunteReady's service/equipment)
 * - restaurant_discount_percent: the discount the restaurant gives JunteReady
 * - restaurant_payout: food_subtotal minus the discount
 */
async function insertOrderWithFinancials(orderData: any, sessionId: string) {
  const restaurantId = orderData.restaurantId
  const branchId = orderData.branchId

  // Separate cart into food items vs service package items
  let foodSubtotal = 0
  let serviceRevenue = 0

  for (const item of orderData.cart || []) {
    const itemTotal = (item.price || 0) * (item.quantity || 1)
    if (item.type === "package") {
      serviceRevenue += itemTotal
    } else {
      foodSubtotal += itemTotal
    }
  }

  // Add service package total from orderData if present
  if (orderData.servicePackageTotal) {
    serviceRevenue += orderData.servicePackageTotal
  }

  // Fetch the applicable discount percentage based on order type
  const orderType = orderData.orderType // "delivery" or "pickup"
  let discountPercent = 0

  if (branchId) {
    // Check branch-level override first
    const { data: branch } = await supabase
      .from("branches")
      .select("restaurant_discount_percent, delivery_discount_percent, pickup_discount_percent")
      .eq("id", branchId)
      .single()

    if (branch) {
      // Use order-type-specific discount if available, otherwise fall back to general
      const typeDiscount = orderType === "delivery"
        ? branch.delivery_discount_percent
        : orderType === "pickup"
          ? branch.pickup_discount_percent
          : null

      if (typeDiscount != null && typeDiscount > 0) {
        discountPercent = typeDiscount
      } else if (branch.restaurant_discount_percent != null && branch.restaurant_discount_percent > 0) {
        discountPercent = branch.restaurant_discount_percent
      }
    }
  }

  // Fall back to restaurant-level discount
  if (discountPercent === 0 && restaurantId) {
    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("restaurant_discount_percent, delivery_discount_percent, pickup_discount_percent")
      .eq("id", restaurantId)
      .single()

    if (restaurant) {
      const typeDiscount = orderType === "delivery"
        ? restaurant.delivery_discount_percent
        : orderType === "pickup"
          ? restaurant.pickup_discount_percent
          : null

      if (typeDiscount != null && typeDiscount > 0) {
        discountPercent = typeDiscount
      } else if (restaurant.restaurant_discount_percent != null) {
        discountPercent = restaurant.restaurant_discount_percent
      }
    }
  }

  // Calculate what JunteReady pays the restaurant
  const restaurantPayout = foodSubtotal * (1 - discountPercent / 100)

  // STRICT REQUIREMENT: branchId MUST be provided - no fallbacks allowed
  if (!branchId) {
    console.error("[v0] CRITICAL: Stripe order REJECTED - branchId is REQUIRED, no fallbacks allowed")
    return NextResponse.json(
      { error: "Error del sistema: Sucursal no especificada. Contacte soporte." },
      { status: 400 }
    )
  }

  // Generate order number
  const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`

  // Insert the order - only use columns that exist in the schema
  console.log("[v0] Inserting order for restaurant:", restaurantId, "branch:", branchId, "delivery_date:", orderData.eventDetails?.eventDate || new Date().toISOString().split('T')[0])
  const { data: order, error } = await supabase.from("orders").insert({
    restaurant_id: restaurantId,
    branch_id: branchId,
    original_branch_id: branchId,
    order_number: orderNumber,
    stripe_account_id: orderData.stripeAccountId || null,
    stripe_payment_intent_id: sessionId,
    status: "pending",
    delivery_type: orderData.orderType || "pickup",
    delivery_date: orderData.eventDetails?.eventDate || new Date().toISOString().split('T')[0],
    customer_name: orderData.eventDetails?.name || null,
    customer_email: orderData.customerEmail || null,
    customer_phone: orderData.customerPhone || null,
    delivery_address: orderData.eventDetails?.address || null,
    delivery_city: orderData.eventDetails?.city || null,
    delivery_state: orderData.eventDetails?.state || null,
    delivery_zip: orderData.eventDetails?.zip || null,
    special_instructions: orderData.eventDetails?.specialInstructions || null,
    subtotal: orderData.subtotal || 0,
    tax: orderData.tax || 0,
    delivery_fee: orderData.deliveryFee || 0,
    tip: orderData.tip || 0,
    total: orderData.total || 0,
    food_subtotal: foodSubtotal,
    service_revenue: serviceRevenue,
    restaurant_discount_percent: discountPercent,
    restaurant_payout: Math.round(restaurantPayout * 100) / 100,
    order_source: orderData.order_source || "online",
    payment_provider: "stripe",
  }).select().single()

  if (error) {
    console.error("[v0] Order insert error:", error)
    throw error
  }

  // Insert order items into order_items table
  if (orderData.cart && orderData.cart.length > 0 && order) {
    const orderItems = orderData.cart.map((item: any) => ({
      order_id: order.id,
      menu_item_id: item.menu_item_id || item.id || null,
      item_name: item.name || item.item_name,
      quantity: item.quantity || 1,
      unit_price: item.price || item.unit_price || 0,
      total_price: item.total_price || (item.price * (item.quantity || 1)),
      selected_options: item.selectedOptions || item.selected_options || {},
    }))

    const { error: itemsError } = await supabase.from("order_items").insert(orderItems)
    if (itemsError) {
      console.error("[v0] Order items insert error:", itemsError)
    }
  }

  console.log("[v0] Order created successfully:", order?.order_number)
}
