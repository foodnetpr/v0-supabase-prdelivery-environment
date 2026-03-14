"use server"

import { Client, Environment } from "square"
import { randomUUID } from "crypto"

// Initialize Square client
function getSquareClient(accessToken: string, environment: "sandbox" | "production" = "production") {
  return new Client({
    accessToken,
    environment: environment === "sandbox" ? Environment.Sandbox : Environment.Production,
  })
}

// Helper to safely convert to cents (integer)
const toCents = (amount: any): number => {
  const num = Number(amount)
  if (isNaN(num)) return 0
  return Math.round(num * 100)
}

export async function createSquareCheckoutSession(orderData: {
  cart: any[]
  subtotal: number
  tax: number
  deliveryFee: number
  tip: number
  total: number
  orderType: string
  eventDetails: any
  includeUtensils: boolean
  servicePackage?: string | null
  squareAccessToken: string
  squareLocationId: string
  squareEnvironment?: "sandbox" | "production"
  restaurantId?: string
  branchId?: string
}) {
  try {
    if (!orderData.squareAccessToken || !orderData.squareLocationId) {
      throw new Error("Square is not configured for this branch. Missing access token or location ID.")
    }

    const squareClient = getSquareClient(
      orderData.squareAccessToken,
      orderData.squareEnvironment || "production"
    )

    // Build line items for Square
    const lineItems = orderData.cart.map((item) => {
      const itemPrice = item.totalPrice ?? item.finalPrice ?? item.price ?? 0
      const itemName = `${item.name || "Item"}${item.quantity > 1 ? ` (x${item.quantity})` : ""}`
      
      // Build note with options/size info
      let note: string | undefined = undefined
      if (item.selections && Object.keys(item.selections).length > 0) {
        note = `Options: ${Object.entries(item.selections)
          .map(([k, v]) => `${k}: ${(v as string[]).join(", ")}`)
          .join("; ")}`
      } else if (item.selectedSizeName) {
        note = `Size: ${item.selectedSizeName}${item.servesTotal ? ` (Serves ${item.servesTotal})` : ""}`
      }

      return {
        name: itemName,
        quantity: "1", // Already included in totalPrice
        note: note,
        basePriceMoney: {
          amount: BigInt(toCents(itemPrice)),
          currency: "USD",
        },
      }
    })

    // Add tax line item
    if (Number(orderData.tax) > 0) {
      lineItems.push({
        name: "Tax",
        quantity: "1",
        basePriceMoney: {
          amount: BigInt(toCents(orderData.tax)),
          currency: "USD",
        },
      })
    }

    // Add delivery fee if applicable
    if (Number(orderData.deliveryFee) > 0) {
      lineItems.push({
        name: "Delivery Fee",
        quantity: "1",
        note: `Delivery to ${orderData.eventDetails?.zip || "selected location"}`,
        basePriceMoney: {
          amount: BigInt(toCents(orderData.deliveryFee)),
          currency: "USD",
        },
      })
    }

    // Add tip if applicable
    if (Number(orderData.tip) > 0) {
      lineItems.push({
        name: "Tip",
        quantity: "1",
        note: "Gratuity for our team",
        basePriceMoney: {
          amount: BigInt(toCents(orderData.tip)),
          currency: "USD",
        },
      })
    }

    // Create the order first
    const orderResponse = await squareClient.ordersApi.createOrder({
      order: {
        locationId: orderData.squareLocationId,
        lineItems: lineItems,
        metadata: {
          restaurantId: orderData.restaurantId || "",
          branchId: orderData.branchId || "",
          orderType: orderData.orderType || "",
          customerEmail: orderData.eventDetails?.email || "",
          customerPhone: orderData.eventDetails?.phone || "",
          customerName: orderData.eventDetails?.name || "",
          eventDate: orderData.eventDetails?.eventDate || "",
          eventTime: orderData.eventDetails?.eventTime || "",
        },
      },
      idempotencyKey: randomUUID(),
    })

    if (!orderResponse.result.order?.id) {
      throw new Error("Failed to create Square order")
    }

    const orderId = orderResponse.result.order.id

    // Get the base URL for redirects
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : "http://localhost:3000"

    // Create payment link (Square Checkout)
    const checkoutResponse = await squareClient.checkoutApi.createPaymentLink({
      idempotencyKey: randomUUID(),
      order: {
        locationId: orderData.squareLocationId,
        lineItems: lineItems,
      },
      checkoutOptions: {
        redirectUrl: `${baseUrl}/square-payment-success?orderId=${orderId}`,
        askForShippingAddress: false,
        merchantSupportEmail: orderData.eventDetails?.email || undefined,
      },
      prePopulatedData: {
        buyerEmail: orderData.eventDetails?.email || undefined,
        buyerPhoneNumber: orderData.eventDetails?.phone || undefined,
      },
    })

    if (!checkoutResponse.result.paymentLink?.url) {
      throw new Error("Failed to create Square payment link")
    }

    return {
      success: true,
      checkoutUrl: checkoutResponse.result.paymentLink.url,
      paymentLinkId: checkoutResponse.result.paymentLink.id,
      orderId: orderId,
    }
  } catch (error: any) {
    console.error("[Square] Error creating checkout session:", error)
    
    // Parse Square API errors
    let errorMessage = error.message
    if (error.errors && Array.isArray(error.errors)) {
      errorMessage = error.errors.map((e: any) => e.detail || e.code).join(", ")
    }
    
    throw new Error(`Square checkout failed: ${errorMessage}`)
  }
}

export async function getSquarePaymentStatus(paymentId: string, accessToken: string, environment: "sandbox" | "production" = "production") {
  try {
    const squareClient = getSquareClient(accessToken, environment)
    
    const response = await squareClient.paymentsApi.getPayment(paymentId)
    
    if (!response.result.payment) {
      return { status: "not_found" }
    }

    const payment = response.result.payment
    
    return {
      status: payment.status?.toLowerCase() || "unknown",
      amount: payment.amountMoney?.amount ? Number(payment.amountMoney.amount) / 100 : 0,
      currency: payment.amountMoney?.currency || "USD",
      receiptUrl: payment.receiptUrl,
      cardBrand: payment.cardDetails?.card?.cardBrand,
      last4: payment.cardDetails?.card?.last4,
    }
  } catch (error: any) {
    console.error("[Square] Error getting payment status:", error)
    return { status: "error", error: error.message }
  }
}

export async function testSquareConnection(accessToken: string, locationId: string, environment: "sandbox" | "production" = "production") {
  try {
    const squareClient = getSquareClient(accessToken, environment)
    
    // Test by fetching location details
    const response = await squareClient.locationsApi.retrieveLocation(locationId)
    
    if (!response.result.location) {
      return {
        success: false,
        error: "Location not found",
      }
    }

    const location = response.result.location
    
    return {
      success: true,
      locationName: location.name,
      locationId: location.id,
      status: location.status,
      currency: location.currency,
      country: location.country,
      environment,
    }
  } catch (error: any) {
    console.error("[Square] Connection test failed:", error)
    
    let errorMessage = error.message
    if (error.errors && Array.isArray(error.errors)) {
      errorMessage = error.errors.map((e: any) => e.detail || e.code).join(", ")
    }
    
  return {
    success: false,
    error: errorMessage,
  }
  }
  }

/**
 * Create a Square Order for KDS (Kitchen Display System)
 * 
 * This creates an order in Square that will automatically appear on the 
 * Square KDS if the merchant has it configured. This is separate from
 * payment processing - it's purely for order management.
 */
export async function createSquareKDSOrder(orderData: {
  order_number: string
  customer_name: string
  customer_phone?: string
  customer_email?: string
  delivery_type: string
  delivery_address?: string
  delivery_city?: string
  delivery_state?: string
  delivery_zip?: string
  delivery_date: string
  special_instructions?: string
  order_items: Array<{
    item_name: string
    quantity: number
    unit_price: number
    total_price: number
    selected_options?: Record<string, any>
  }>
  subtotal: number
  tax: number
  tip?: number
  delivery_fee?: number
  total: number
  squareAccessToken: string
  squareLocationId: string
  squareEnvironment?: "sandbox" | "production"
  restaurantId?: string
  branchId?: string
}) {
  try {
    if (!orderData.squareAccessToken || !orderData.squareLocationId) {
      throw new Error("Square credentials not configured")
    }

    const squareClient = getSquareClient(
      orderData.squareAccessToken,
      orderData.squareEnvironment || "production"
    )

    // Build line items
    const lineItems = orderData.order_items.map((item) => {
      let note: string | undefined = undefined
      
      if (item.selected_options && Object.keys(item.selected_options).length > 0) {
        note = Object.entries(item.selected_options)
          .map(([, v]) => {
            if (Array.isArray(v)) return v.join(", ")
            return String(v)
          })
          .join("; ")
      }

      return {
        name: item.item_name,
        quantity: String(item.quantity),
        note: note,
        basePriceMoney: {
          amount: BigInt(toCents(item.unit_price)),
          currency: "USD",
        },
      }
    })

    // Add tax line item
    if (orderData.tax > 0) {
      lineItems.push({
        name: "Tax",
        quantity: "1",
        basePriceMoney: {
          amount: BigInt(toCents(orderData.tax)),
          currency: "USD",
        },
      })
    }

    // Add delivery fee if applicable
    if (orderData.delivery_fee && orderData.delivery_fee > 0) {
      lineItems.push({
        name: "Delivery Fee",
        quantity: "1",
        basePriceMoney: {
          amount: BigInt(toCents(orderData.delivery_fee)),
          currency: "USD",
        },
      })
    }

    // Add tip if applicable
    if (orderData.tip && orderData.tip > 0) {
      lineItems.push({
        name: "Tip",
        quantity: "1",
        basePriceMoney: {
          amount: BigInt(toCents(orderData.tip)),
          currency: "USD",
        },
      })
    }

    // Build fulfillment info
    const fulfillmentType = orderData.delivery_type === "delivery" ? "DELIVERY" : "PICKUP"
    
    // Create order with fulfillment for KDS
    const orderResponse = await squareClient.ordersApi.createOrder({
      order: {
        locationId: orderData.squareLocationId,
        referenceId: orderData.order_number,
        lineItems: lineItems,
        fulfillments: [
          {
            type: fulfillmentType,
            state: "PROPOSED",
            ...(fulfillmentType === "PICKUP" ? {
              pickupDetails: {
                recipient: {
                  displayName: orderData.customer_name,
                  phoneNumber: orderData.customer_phone,
                  emailAddress: orderData.customer_email,
                },
                scheduleType: "SCHEDULED",
                pickupAt: new Date(orderData.delivery_date).toISOString(),
                note: orderData.special_instructions,
              },
            } : {
              deliveryDetails: {
                recipient: {
                  displayName: orderData.customer_name,
                  phoneNumber: orderData.customer_phone,
                  emailAddress: orderData.customer_email,
                  address: orderData.delivery_address ? {
                    addressLine1: orderData.delivery_address,
                    locality: orderData.delivery_city,
                    administrativeDistrictLevel1: orderData.delivery_state,
                    postalCode: orderData.delivery_zip,
                    country: "US",
                  } : undefined,
                },
                scheduleType: "SCHEDULED",
                deliverAt: new Date(orderData.delivery_date).toISOString(),
                note: orderData.special_instructions,
              },
            }),
          },
        ],
        metadata: {
          source: "junteready",
          restaurantId: orderData.restaurantId || "",
          branchId: orderData.branchId || "",
        },
      },
      idempotencyKey: randomUUID(),
    })

    if (!orderResponse.result.order?.id) {
      throw new Error("Failed to create Square order")
    }

    console.log("[Square KDS] Order created:", orderResponse.result.order.id)

    return {
      success: true,
      squareOrderId: orderResponse.result.order.id,
      orderNumber: orderData.order_number,
    }
  } catch (error: any) {
    console.error("[Square KDS] Error creating order:", error)
    
    let errorMessage = error.message
    if (error.errors && Array.isArray(error.errors)) {
      errorMessage = error.errors.map((e: any) => e.detail || e.code).join(", ")
    }
    
    return {
      success: false,
      error: `Square KDS order failed: ${errorMessage}`,
    }
  }
}

/**
 * Update Square order status (for syncing back from our system)
 */
export async function updateSquareOrderFulfillment(
  squareOrderId: string,
  fulfillmentUid: string,
  state: "PROPOSED" | "RESERVED" | "PREPARED" | "COMPLETED" | "CANCELED",
  accessToken: string,
  environment: "sandbox" | "production" = "production"
) {
  try {
    const squareClient = getSquareClient(accessToken, environment)
    
    const response = await squareClient.ordersApi.updateOrder(squareOrderId, {
      order: {
        locationId: "", // Will be inferred from order
        version: 1,
        fulfillments: [
          {
            uid: fulfillmentUid,
            state: state,
          },
        ],
      },
      idempotencyKey: randomUUID(),
    })

    return {
      success: true,
      order: response.result.order,
    }
  } catch (error: any) {
    console.error("[Square] Update fulfillment error:", error)
    return {
      success: false,
      error: error.message,
    }
  }
}
