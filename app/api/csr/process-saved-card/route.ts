import { stripe } from "@/lib/stripe"
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const orderData = await request.json()
    const { stripeCustomerId, paymentMethodId, stripeAccountId } = orderData

    if (!stripe) {
      return NextResponse.json({ success: false, error: "Stripe not configured" }, { status: 500 })
    }

    if (!stripeCustomerId || !paymentMethodId) {
      return NextResponse.json({ success: false, error: "Missing payment method info" }, { status: 400 })
    }

    // Generate order number
    const orderNumber = `CSR-${Date.now().toString(36).toUpperCase()}`

    // Convert to cents
    const toCents = (amount: number) => Math.round(amount * 100)

    // Create and confirm PaymentIntent using saved payment method
    const paymentIntentParams: any = {
      amount: toCents(orderData.total),
      currency: "usd",
      customer: stripeCustomerId,
      payment_method: paymentMethodId,
      confirm: true,
      off_session: true, // Customer is not present
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: "never",
      },
      metadata: {
        order_source: "csr_saved_card",
        restaurantId: orderData.restaurantId,
        orderType: orderData.orderType,
        customerName: orderData.eventDetails?.name || "",
        customerPhone: orderData.eventDetails?.phone || "",
      },
    }

    // If restaurant has connected Stripe account, use it
    if (stripeAccountId) {
      paymentIntentParams.transfer_data = {
        destination: stripeAccountId,
      }
    }

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams)

    if (paymentIntent.status !== "succeeded") {
      return NextResponse.json({ 
        success: false, 
        error: `Payment failed: ${paymentIntent.status}` 
      }, { status: 400 })
    }

    // Insert the order
    const { data: order, error } = await supabase.from("orders").insert({
      restaurant_id: orderData.restaurantId,
      branch_id: null,
      order_number: orderNumber,
      stripe_payment_intent_id: paymentIntent.id,
      status: "pending",
      delivery_type: orderData.orderType || "delivery",
      delivery_date: orderData.eventDetails?.eventDate || new Date().toISOString().split('T')[0],
      customer_id: orderData.customerId || null,
      customer_name: orderData.eventDetails?.name || null,
      customer_email: orderData.eventDetails?.email || null,
      customer_phone: orderData.eventDetails?.phone || null,
      delivery_address: orderData.eventDetails?.address || null,
      delivery_city: orderData.eventDetails?.city || null,
      delivery_state: orderData.eventDetails?.state || "PR",
      delivery_zip: orderData.eventDetails?.zip || null,
      special_instructions: orderData.eventDetails?.specialInstructions || null,
      subtotal: orderData.subtotal || 0,
      tax: orderData.tax || 0,
      delivery_fee: orderData.deliveryFee || 0,
      tip: orderData.tip || 0,
      total: orderData.total || 0,
      order_source: "csr",
      payment_provider: "stripe",
    }).select().single()

    if (error) {
      console.error("[CSR Saved Card Order Error]", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    // Insert order items
    if (orderData.cart && orderData.cart.length > 0 && order) {
      const orderItems = orderData.cart.map((item: any) => ({
        order_id: order.id,
        menu_item_id: item.id || null,
        item_name: item.name,
        quantity: item.quantity || 1,
        unit_price: item.price || 0,
        total_price: (item.price || 0) * (item.quantity || 1),
        selected_options: item.selectedOptions || {},
      }))

      await supabase.from("order_items").insert(orderItems)
    }

    // Send notifications
    try {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
      await fetch(`${baseUrl}/api/send-notifications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          orderData: { ...orderData, order_number: orderNumber }, 
          sessionId: orderNumber 
        }),
      })

      // Create Shipday delivery order
      if (orderData.orderType === "delivery") {
        await fetch(`${baseUrl}/api/shipday/create-order`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderData: { ...orderData, order_number: orderNumber } }),
        })
      }
    } catch (notifyError) {
      console.error("[CSR Saved Card Notification Error]", notifyError)
    }

    return NextResponse.json({ 
      success: true, 
      orderNumber,
      orderId: order.id,
      paymentIntentId: paymentIntent.id,
    })

  } catch (error: any) {
    console.error("[CSR Saved Card Error]", error)
    
    // Handle specific Stripe errors
    if (error.type === "StripeCardError") {
      return NextResponse.json({ 
        success: false, 
        error: `Card error: ${error.message}` 
      }, { status: 400 })
    }
    
    return NextResponse.json({ 
      success: false, 
      error: error.message || "Failed to process saved card payment" 
    }, { status: 500 })
  }
}
