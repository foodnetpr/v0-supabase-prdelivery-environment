"use server"

import { createClient } from "@/lib/supabase/server"

/**
 * Chowly POS Integration
 * 
 * Chowly acts as middleware between online ordering platforms and POS systems.
 * This integration sends orders to Chowly's API, which then routes them to the
 * restaurant's configured POS system (Toast, Square, Clover, Aloha, etc.)
 * 
 * API Documentation: https://developer.chowly.com/
 */

const CHOWLY_API_URL = "https://api.chowly.com/v2"

interface ChowlyOrderItem {
  name: string
  quantity: number
  price: number
  modifiers?: Array<{
    name: string
    price: number
  }>
  notes?: string
}

interface ChowlyOrder {
  external_id: string
  location_id: string
  customer: {
    first_name: string
    last_name: string
    phone: string
    email?: string
  }
  fulfillment: {
    type: "pickup" | "delivery"
    scheduled_for?: string
    address?: {
      street: string
      city: string
      state: string
      zip: string
    }
  }
  items: ChowlyOrderItem[]
  subtotal: number
  tax: number
  tip?: number
  delivery_fee?: number
  total: number
  notes?: string
  payment: {
    type: "prepaid"
    amount: number
  }
}

interface OrderData {
  id: string
  order_number: string
  customer_name: string
  customer_email?: string
  customer_phone: string
  delivery_type: string
  delivery_address?: string
  delivery_city?: string
  delivery_state?: string
  delivery_zip?: string
  delivery_date: string
  special_instructions?: string
  subtotal: number
  tax: number
  tip?: number
  delivery_fee?: number
  total: number
  order_items: Array<{
    id: string
    item_name: string
    quantity: number
    unit_price: number
    total_price: number
    selected_options?: Record<string, any>
  }>
}

/**
 * Submit an order to Chowly
 */
export async function submitOrderToChowly(
  order: OrderData,
  chowlyApiKey: string,
  chowlyLocationId: string
): Promise<{ success: boolean; chowlyOrderId?: string; error?: string }> {
  try {
    // Parse customer name into first/last
    const nameParts = order.customer_name.trim().split(" ")
    const firstName = nameParts[0] || "Customer"
    const lastName = nameParts.slice(1).join(" ") || ""

    // Build Chowly order items
    const chowlyItems: ChowlyOrderItem[] = order.order_items.map((item) => {
      const modifiers: Array<{ name: string; price: number }> = []
      
      // Convert selected options to modifiers
      if (item.selected_options) {
        for (const [category, options] of Object.entries(item.selected_options)) {
          if (Array.isArray(options)) {
            for (const option of options) {
              const optName = typeof option === "string" ? option : option?.name || String(option)
              const optPrice = typeof option === "object" && option?.price ? Number(option.price) : 0
              modifiers.push({ name: optName, price: optPrice })
            }
          } else if (typeof options === "string") {
            modifiers.push({ name: options, price: 0 })
          }
        }
      }

      return {
        name: item.item_name,
        quantity: item.quantity,
        price: item.unit_price,
        modifiers: modifiers.length > 0 ? modifiers : undefined,
      }
    })

    // Build Chowly order payload
    const chowlyOrder: ChowlyOrder = {
      external_id: order.id,
      location_id: chowlyLocationId,
      customer: {
        first_name: firstName,
        last_name: lastName,
        phone: order.customer_phone,
        email: order.customer_email,
      },
      fulfillment: {
        type: order.delivery_type === "delivery" ? "delivery" : "pickup",
        scheduled_for: order.delivery_date,
        ...(order.delivery_type === "delivery" && order.delivery_address ? {
          address: {
            street: order.delivery_address,
            city: order.delivery_city || "",
            state: order.delivery_state || "",
            zip: order.delivery_zip || "",
          },
        } : {}),
      },
      items: chowlyItems,
      subtotal: order.subtotal,
      tax: order.tax,
      tip: order.tip,
      delivery_fee: order.delivery_fee,
      total: order.total,
      notes: order.special_instructions,
      payment: {
        type: "prepaid",
        amount: order.total,
      },
    }

    console.log("[Chowly] Submitting order:", JSON.stringify(chowlyOrder, null, 2))

    // Send to Chowly API
    const response = await fetch(`${CHOWLY_API_URL}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${chowlyApiKey}`,
        "Accept": "application/json",
      },
      body: JSON.stringify(chowlyOrder),
    })

    const responseText = await response.text()
    console.log("[Chowly] API Response:", response.status, responseText)

    if (!response.ok) {
      console.error("[Chowly] API Error:", responseText)
      return {
        success: false,
        error: `Chowly API error: ${response.status} - ${responseText}`,
      }
    }

    let result
    try {
      result = JSON.parse(responseText)
    } catch {
      return { success: false, error: "Invalid response from Chowly" }
    }

    // Update order with Chowly order ID
    const supabase = await createClient()
    await supabase
      .from("orders")
      .update({ 
        chowly_order_id: result.id || result.order_id,
        notification_sent_at: new Date().toISOString(),
      })
      .eq("id", order.id)

    return {
      success: true,
      chowlyOrderId: result.id || result.order_id,
    }
  } catch (error: any) {
    console.error("[Chowly] Submit error:", error)
    return {
      success: false,
      error: error.message || "Error submitting order to Chowly",
    }
  }
}

/**
 * Test Chowly API connection
 */
export async function testChowlyConnection(
  apiKey: string,
  locationId: string
): Promise<{ success: boolean; locationName?: string; error?: string }> {
  try {
    // Test by fetching location details
    const response = await fetch(`${CHOWLY_API_URL}/locations/${locationId}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Accept": "application/json",
      },
    })

    if (!response.ok) {
      if (response.status === 401) {
        return { success: false, error: "API Key inválido" }
      }
      if (response.status === 404) {
        return { success: false, error: "Location ID no encontrado" }
      }
      return { success: false, error: `Error de conexión: ${response.status}` }
    }

    const data = await response.json()

    return {
      success: true,
      locationName: data.name || data.location_name || locationId,
    }
  } catch (error: any) {
    console.error("[Chowly] Connection test error:", error)
    return {
      success: false,
      error: error.message || "Error al conectar con Chowly",
    }
  }
}

/**
 * Get Chowly order status
 */
export async function getChowlyOrderStatus(
  chowlyOrderId: string,
  apiKey: string
): Promise<{ success: boolean; status?: string; error?: string }> {
  try {
    const response = await fetch(`${CHOWLY_API_URL}/orders/${chowlyOrderId}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Accept": "application/json",
      },
    })

    if (!response.ok) {
      return { success: false, error: `Error: ${response.status}` }
    }

    const data = await response.json()

    return {
      success: true,
      status: data.status || "unknown",
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Error checking order status",
    }
  }
}
