"use server"

import { createClient } from "@/lib/supabase/server"

// ATH Móvil API endpoints (from official ATHM-Payment-Button-API documentation)
const ATH_MOVIL_PAYMENT_URL = "https://payments.athmovil.com/api/business-transaction/ecommerce/payment"
const ATH_MOVIL_FIND_PAYMENT_URL = "https://payments.athmovil.com/api/business-transaction/ecommerce/business/findPayment"

interface ATHMovilOrderData {
  restaurantId: string
  branchId?: string
  cart: any[]
  total: number
  tax: number
  tip: number
  subtotal: number
  deliveryFee: number
  customerEmail: string
  customerPhone?: string
  eventDetails?: any
  orderType: string
  restaurantName?: string
  branchName?: string
  athmovil_public_token?: string
  athmovil_ecommerce_id?: string
}

// Helper to convert dollars to cents (ATH Móvil uses dollars with 2 decimal places)
function formatAmount(amount: number): string {
  return amount.toFixed(2)
}

export async function createATHMovilPayment(orderData: ATHMovilOrderData) {
  try {
    const supabase = await createClient()

    // Get ATH Móvil credentials from branch or restaurant
    let publicToken = orderData.athmovil_public_token
    let ecommerceId = orderData.athmovil_ecommerce_id

    if (!publicToken || !ecommerceId) {
      // Try to get from branch first, then restaurant
      if (orderData.branchId) {
        const { data: branch } = await supabase
          .from("branches")
          .select("athmovil_public_token, athmovil_ecommerce_id")
          .eq("id", orderData.branchId)
          .single()

        if (branch?.athmovil_public_token) {
          publicToken = branch.athmovil_public_token
          ecommerceId = branch.athmovil_ecommerce_id
        }
      }

      if (!publicToken) {
        const { data: restaurant } = await supabase
          .from("restaurants")
          .select("athmovil_public_token, athmovil_ecommerce_id")
          .eq("id", orderData.restaurantId)
          .single()

        if (restaurant?.athmovil_public_token) {
          publicToken = restaurant.athmovil_public_token
          ecommerceId = restaurant.athmovil_ecommerce_id
        }
      }
    }

    if (!publicToken) {
      throw new Error("ATH Móvil no está configurado para este restaurante")
    }

    // Build order description for metadata (max 40 chars each)
    const itemDescriptions = orderData.cart
      .map((item: any) => `${item.quantity}x ${item.name}`)
      .join(", ")

    const metadata1 = `${orderData.restaurantName || "Order"}`.substring(0, 40)
    const metadata2 = itemDescriptions.substring(0, 40)

    // Build items array for ATH Móvil (required field)
    const items = orderData.cart.slice(0, 10).map((item: any) => ({
      name: (item.name || "Item").substring(0, 50),
      description: (item.selectedOptions 
        ? Object.values(item.selectedOptions).flat().map((opt: any) => 
            typeof opt === "string" ? opt : opt?.name || ""
          ).filter(Boolean).join(", ")
        : "Item").substring(0, 100) || "Item",
      quantity: String(item.quantity || 1),
      price: formatAmount(item.totalPrice ?? item.finalPrice ?? item.price ?? 0),
      tax: "0",
      metadata: null,
    }))

    // ATH Móvil payment request payload (per official API documentation)
    const paymentRequest = {
      env: "production",
      publicToken: publicToken,
      timeout: 600, // 10 minutes timeout (between 120-600)
      total: formatAmount(orderData.total),
      subtotal: formatAmount(orderData.subtotal),
      tax: formatAmount(orderData.tax),
      metadata1: metadata1,
      metadata2: metadata2,
      items: items,
      // phoneNumber is optional - if provided, payment request goes directly to that number
      ...(orderData.customerPhone ? { phoneNumber: orderData.customerPhone.replace(/\D/g, '') } : {}),
    }

    console.log("[ATH Móvil] Creating payment with request:", JSON.stringify(paymentRequest, null, 2))

    // Create the ATH Móvil payment session via their API
    const response = await fetch(ATH_MOVIL_PAYMENT_URL, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(paymentRequest),
    })

    const responseText = await response.text()
    console.log("[ATH Móvil] API Response:", response.status, responseText)

    if (!response.ok) {
      console.error("[ATH Móvil] API Error:", responseText)
      throw new Error(`ATH Móvil API error: ${response.status} - ${responseText}`)
    }

    let result
    try {
      result = JSON.parse(responseText)
    } catch {
      throw new Error(`Invalid response from ATH Móvil: ${responseText}`)
    }

    if (result.status !== "success" || !result.data?.ecommerceId) {
      throw new Error(result.message || "Error creating ATH Móvil payment")
    }

    // Return the ecommerceId which is needed to check payment status
    return {
      success: true,
      ecommerceId: result.data.ecommerceId,
      authToken: result.data.auth_token, // Needed for authorization step
      publicToken: publicToken,
      total: orderData.total,
    }
  } catch (error: any) {
    console.error("[ATH Móvil] Payment creation error:", error)
    return {
      success: false,
      error: error.message || "Error al crear el pago de ATH Móvil",
    }
  }
}

export async function checkATHMovilPaymentStatus(ecommerceId: string, publicToken: string) {
  try {
    // Use the findPayment endpoint to check transaction status
    const response = await fetch(ATH_MOVIL_FIND_PAYMENT_URL, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ecommerceId: ecommerceId,
        publicToken: publicToken,
      }),
    })

    const responseText = await response.text()
    console.log("[ATH Móvil] Find Payment Response:", response.status, responseText)

    if (!response.ok) {
      return {
        success: false,
        status: "error",
        error: `Failed to check payment status: ${response.status}`,
      }
    }

    let result
    try {
      result = JSON.parse(responseText)
    } catch {
      return {
        success: false,
        status: "error",
        error: "Invalid response from ATH Móvil",
      }
    }

    if (result.status !== "success" || !result.data) {
      return {
        success: false,
        status: "error",
        error: result.message || "Error checking payment status",
      }
    }

    // ecommerceStatus values: "OPEN" (pending), "CONFIRM" (user confirmed, needs authorization), "COMPLETED", "CANCEL"
    const ecommerceStatus = result.data.ecommerceStatus

    return {
      success: true,
      status: ecommerceStatus, // "OPEN", "CONFIRM", "COMPLETED", "CANCEL"
      transactionId: result.data.referenceNumber || null,
      dailyTransactionId: result.data.dailyTransactionId || null,
      ecommerceId: result.data.ecommerceId,
      total: result.data.total,
      completedAt: result.data.transactionDate || null,
      businessName: result.data.businessName,
    }
  } catch (error: any) {
    console.error("[ATH Móvil] Status check error:", error)
    return {
      success: false,
      status: "error",
      error: error.message,
    }
  }
}

/**
 * Create order in database after ATH Movil payment is confirmed
 */
export async function createATHMovilOrder(orderData: ATHMovilOrderData & { 
  athMovilTransactionId?: string 
}): Promise<{ success: boolean; error?: string; orderId?: string }> {
  try {
    console.log("[v0] createATHMovilOrder called with branchId:", orderData.branchId, "restaurantId:", orderData.restaurantId)
    const supabase = await createClient()
    
    // Calculate financial split
    let foodSubtotal = 0
    let serviceRevenue = 0
    
    if (orderData.cart) {
      for (const item of orderData.cart) {
        if (item.item_type === "service_package") {
          serviceRevenue += item.total_price || 0
        } else {
          foodSubtotal += item.total_price || 0
        }
      }
    }

    // STRICT REQUIREMENT: branchId MUST be provided - no fallbacks allowed
    if (!orderData.branchId) {
      console.error("[v0] CRITICAL: ATH Movil order REJECTED - branchId is REQUIRED, no fallbacks allowed")
      return { success: false, error: "Error del sistema: Sucursal no especificada. Contacte soporte." }
    }

    // Get restaurant discount percent
    let discountPercent = 0
    if (orderData.restaurantId) {
      const { data: restaurant } = await supabase
        .from("restaurants")
        .select("restaurant_discount_percent")
        .eq("id", orderData.restaurantId)
        .single()
      
      if (restaurant?.restaurant_discount_percent) {
        discountPercent = restaurant.restaurant_discount_percent
      }
    }

    const restaurantPayout = foodSubtotal * (1 - discountPercent / 100)

    // Generate order number
    const orderNumber = `ATH-${Date.now().toString(36).toUpperCase()}`

    // Insert the order - branch_id is REQUIRED
    console.log("[v0] ATH Movil creating order - branchId:", orderData.branchId, "restaurantId:", orderData.restaurantId, "delivery_date:", orderData.eventDetails?.eventDate || new Date().toISOString().split('T')[0])
    const { data: order, error } = await supabase.from("orders").insert({
      restaurant_id: orderData.restaurantId,
      branch_id: orderData.branchId,
      original_branch_id: orderData.branchId,
      order_number: orderNumber,
      status: "pending",
      delivery_type: orderData.orderType || "pickup",
      customer_name: orderData.eventDetails?.name || orderData.customerEmail?.split('@')[0] || null,
      customer_email: orderData.customerEmail || null,
      customer_phone: orderData.customerPhone || null,
      delivery_date: orderData.eventDetails?.eventDate || new Date().toISOString().split('T')[0],
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
      order_source: "online",
      payment_provider: "athmovil",
      athmovil_reference_number: orderData.athMovilTransactionId || null,
    }).select().single()

    if (error) {
      console.error("[v0] ATH Movil order insert error:", error)
      return { success: false, error: error.message }
    }
    
    console.log("[v0] ATH Movil order created successfully:", order?.id, "branch_id:", order?.branch_id)

    // Insert order items
    if (orderData.cart && orderData.cart.length > 0 && order) {
      const orderItems = orderData.cart.map((item: any) => ({
        order_id: order.id,
        menu_item_id: item.menu_item_id || item.id || null,
        item_name: item.name || item.item_name,
        quantity: item.quantity || 1,
        unit_price: item.price || item.unit_price || 0,
        total_price: item.total_price || (item.price * (item.quantity || 1)),
        selected_options: item.selectedOptions || item.selected_options || {},
        special_instructions: item.specialInstructions || null,
      }))

      const { error: itemsError } = await supabase.from("order_items").insert(orderItems)
      if (itemsError) {
        console.error("[v0] ATH Movil order items insert error:", itemsError)
      }
    }

    console.log("[v0] ATH Movil order created:", orderNumber)
    return { success: true, orderId: order?.id }
  } catch (error: any) {
    console.error("[v0] ATH Movil order creation error:", error)
    return { success: false, error: error.message || "Error creating order" }
  }
}

export async function testATHMovilConnection(publicToken: string) {
  try {
    // Simple validation - check if the token looks valid
    if (!publicToken || publicToken.length < 10) {
      return {
        success: false,
        error: "Token público inválido",
      }
    }

    // ATH Móvil doesn't have a dedicated test endpoint, 
    // so we just validate the token format
    return {
      success: true,
      message: "Token configurado correctamente. La conexión se verificará al procesar un pago.",
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    }
  }
}
