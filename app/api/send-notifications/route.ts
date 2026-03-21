import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { Resend } from "resend"
import { submitOrderToChowly } from "@/app/actions/chowly"
import { createSquareKDSOrder } from "@/app/actions/square"

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type NotificationMethod = "email" | "kds" | "chowly" | "square_kds" | "multiple"

interface NotificationSettings {
  order_notification_method: NotificationMethod
  chowly_api_key?: string
  chowly_location_id?: string
  chowly_enabled?: boolean
  square_kds_enabled?: boolean
  square_access_token?: string
  square_location_id?: string
  square_environment?: "sandbox" | "production"
}

export async function POST(request: NextRequest) {
  try {
    const { orderData, sessionId, orderId } = await request.json()

    const restaurantId = orderData.restaurantId
    const branchId = orderData.branchId
    const orderEmails: string[] = []
    let notificationSettings: NotificationSettings = { order_notification_method: "email" }

    // Fetch restaurant data including notification settings
    if (restaurantId) {
      const { data: restaurant } = await supabase
        .from("restaurants")
        .select(`
          email, name,
          order_notification_method,
          chowly_api_key, chowly_location_id, chowly_enabled,
          square_kds_enabled, square_access_token, square_location_id, square_environment
        `)
        .eq("id", restaurantId)
        .single()

      if (restaurant) {
        if (restaurant.email) {
          restaurant.email.split(",").map((e: string) => e.trim()).filter(Boolean).forEach((email: string) => {
            if (!orderEmails.includes(email)) orderEmails.push(email)
          })
        }
        
        notificationSettings = {
          order_notification_method: restaurant.order_notification_method || "email",
          chowly_api_key: restaurant.chowly_api_key,
          chowly_location_id: restaurant.chowly_location_id,
          chowly_enabled: restaurant.chowly_enabled,
          square_kds_enabled: restaurant.square_kds_enabled,
          square_access_token: restaurant.square_access_token,
          square_location_id: restaurant.square_location_id,
          square_environment: restaurant.square_environment,
        }
      }
    }

    // Check if branch has overrides
    if (branchId) {
      const { data: branch } = await supabase
        .from("branches")
        .select(`
          email,
          order_notification_method,
          chowly_api_key, chowly_location_id, chowly_enabled,
          square_kds_enabled, square_access_token, square_location_id, square_environment
        `)
        .eq("id", branchId)
        .single()

      if (branch) {
        if (branch.email) {
          branch.email.split(",").map((e: string) => e.trim()).filter(Boolean).forEach((email: string) => {
            if (!orderEmails.includes(email)) orderEmails.push(email)
          })
        }
        
        // Branch overrides restaurant settings if specified
        if (branch.order_notification_method) {
          notificationSettings.order_notification_method = branch.order_notification_method
        }
        if (branch.chowly_api_key) {
          notificationSettings.chowly_api_key = branch.chowly_api_key
          notificationSettings.chowly_location_id = branch.chowly_location_id
          notificationSettings.chowly_enabled = branch.chowly_enabled
        }
        if (branch.square_access_token) {
          notificationSettings.square_access_token = branch.square_access_token
          notificationSettings.square_location_id = branch.square_location_id
          notificationSettings.square_environment = branch.square_environment
          notificationSettings.square_kds_enabled = branch.square_kds_enabled
        }
      }
    }

    // Fetch email templates for this restaurant
    const { data: emailTemplates } = await supabase
      .from("email_templates")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .eq("is_active", true)

    // Format order details for notifications
    const restaurantSummary = formatRestaurantOrderSummary(orderData)
    const customerSummary = formatCustomerOrderSummaryFromTemplate(orderData, emailTemplates)

    const notifications = []
    const results: { email?: boolean; chowly?: any; squareKds?: any } = {}
    const method = notificationSettings.order_notification_method

    // Route based on notification method
    const shouldSendEmail = method === "email" || method === "multiple" || method === "kds"
    const shouldSendChowly = (method === "chowly" || (method === "multiple" && notificationSettings.chowly_enabled)) 
                              && notificationSettings.chowly_api_key 
                              && notificationSettings.chowly_location_id
    const shouldSendSquareKDS = (method === "square_kds" || (method === "multiple" && notificationSettings.square_kds_enabled))
                                 && notificationSettings.square_access_token 
                                 && notificationSettings.square_location_id

    // Send email notifications
    if (shouldSendEmail && orderEmails.length > 0) {
      orderEmails.forEach((email) => {
        notifications.push(sendEmail(email, "Nuevo Pedido de Catering Recibido", restaurantSummary, "restaurant"))
      })
      results.email = true
    }

    // Customer email notification (always send)
    if (orderData.customerEmail) {
      const confirmationTemplate = emailTemplates?.find((t: any) => t.template_type === "order_confirmation")
      const subject = confirmationTemplate?.subject || "Confirmacion de Pedido - {{restaurant_name}}"
      const processedSubject = replaceTemplateVariables(subject, orderData)
      notifications.push(sendEmail(orderData.customerEmail, processedSubject, customerSummary, "customer", orderData.restaurantName))
    }

    // Customer SMS notification (only if they consented)
    if (orderData.customerPhone && orderData.smsConsent) {
      notifications.push(sendSMS(orderData.customerPhone, formatCustomerSMS(orderData), "customer"))
    }

    // Send to Chowly POS
    if (shouldSendChowly) {
      try {
        const chowlyOrder = buildChowlyOrderData(orderData, orderId)
        const chowlyResult = await submitOrderToChowly(
          chowlyOrder,
          notificationSettings.chowly_api_key!,
          notificationSettings.chowly_location_id!
        )
        results.chowly = chowlyResult
        console.log("[Notifications] Chowly result:", chowlyResult)
      } catch (error) {
        console.error("[Notifications] Chowly error:", error)
        results.chowly = { success: false, error: String(error) }
      }
    }

    // Send to Square KDS
    if (shouldSendSquareKDS) {
      try {
        const squareOrder = buildSquareKDSOrderData(orderData, notificationSettings, restaurantId, branchId)
        const squareResult = await createSquareKDSOrder(squareOrder)
        results.squareKds = squareResult
        console.log("[Notifications] Square KDS result:", squareResult)
      } catch (error) {
        console.error("[Notifications] Square KDS error:", error)
        results.squareKds = { success: false, error: String(error) }
      }
    }

    // KDS: No special action needed - real-time via Supabase subscription
    // The KDS page subscribes to order changes and will see new orders automatically

    await Promise.all(notifications)

    return NextResponse.json({ 
      success: true, 
      emailsSentTo: orderEmails,
      notificationMethod: method,
      results
    })
  } catch (error: any) {
    console.error("Error sending notifications:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Build order data for Chowly
function buildChowlyOrderData(orderData: any, orderId: string) {
  return {
    id: orderId || `order_${Date.now()}`,
    order_number: orderData.orderNumber || String(Date.now()).slice(-6),
    customer_name: orderData.customerName || orderData.eventDetails?.companyName || "Customer",
    customer_email: orderData.customerEmail,
    customer_phone: orderData.customerPhone,
    delivery_type: orderData.orderType?.toLowerCase() === "delivery" ? "delivery" : "pickup",
    delivery_address: orderData.eventDetails?.address || orderData.deliveryAddress,
    delivery_city: orderData.eventDetails?.city,
    delivery_state: orderData.eventDetails?.state,
    delivery_zip: orderData.eventDetails?.zip,
    delivery_date: orderData.eventDetails?.date || new Date().toISOString(),
    special_instructions: orderData.eventDetails?.notes || orderData.specialInstructions,
    subtotal: orderData.subtotal || 0,
    tax: orderData.tax || 0,
    tip: orderData.tip || 0,
    delivery_fee: orderData.deliveryFee || 0,
    total: orderData.total || 0,
    order_items: (orderData.cart || []).map((item: any) => ({
      id: item.id || crypto.randomUUID(),
      item_name: item.name,
      quantity: item.quantity,
      unit_price: item.price,
      total_price: item.price * item.quantity,
      selected_options: item.selectedOptions,
    })),
  }
}

// Build order data for Square KDS
function buildSquareKDSOrderData(orderData: any, settings: NotificationSettings, restaurantId: string, branchId?: string) {
  return {
    order_number: orderData.orderNumber || String(Date.now()).slice(-6),
    customer_name: orderData.customerName || orderData.eventDetails?.companyName || "Customer",
    customer_phone: orderData.customerPhone,
    customer_email: orderData.customerEmail,
    delivery_type: orderData.orderType?.toLowerCase() === "delivery" ? "delivery" : "pickup",
    delivery_address: orderData.eventDetails?.address || orderData.deliveryAddress,
    delivery_city: orderData.eventDetails?.city,
    delivery_state: orderData.eventDetails?.state,
    delivery_zip: orderData.eventDetails?.zip,
    delivery_date: orderData.eventDetails?.date || new Date().toISOString(),
    special_instructions: orderData.eventDetails?.notes || orderData.specialInstructions,
    order_items: (orderData.cart || []).map((item: any) => ({
      item_name: item.name,
      quantity: item.quantity,
      unit_price: item.price,
      total_price: item.price * item.quantity,
      selected_options: item.selectedOptions,
    })),
    subtotal: orderData.subtotal || 0,
    tax: orderData.tax || 0,
    tip: orderData.tip || 0,
    delivery_fee: orderData.deliveryFee || 0,
    total: orderData.total || 0,
    squareAccessToken: settings.square_access_token!,
    squareLocationId: settings.square_location_id!,
    squareEnvironment: settings.square_environment || "production",
    restaurantId,
    branchId,
  }
}

function formatRestaurantOrderSummary(orderData: any) {
  const items = orderData.cart
    .map((item: any) => {
      let itemStr = `${item.quantity}x ${item.name} - $${(item.price * item.quantity).toFixed(2)}`
      if (item.selectedOptions) {
        const options = Object.entries(item.selectedOptions)
          .map(([key, value]: [string, any]) => `  • ${key}: ${Array.isArray(value) ? value.join(", ") : value}`)
          .join("\n")
        itemStr += `\n${options}`
      }
      return itemStr
    })
    .join("\n\n")

  let servicePackageInfo = ""
  if (orderData.servicePackageName) {
    servicePackageInfo = `\n\nSERVICE PACKAGE:\n${orderData.servicePackageName} - $${(orderData.servicePackageTotal || 0).toFixed(2)}`
  }

  return `
NEW CATERING ORDER RECEIVED
Order ID: ${Date.now()}
Date: ${new Date().toLocaleString()}

CUSTOMER CONTACT:
Email: ${orderData.customerEmail}
Phone: ${orderData.customerPhone || "Not provided"}

EVENT DETAILS:
Date: ${orderData.eventDetails.date || "Not specified"}
Time: ${orderData.eventDetails.time || "Not specified"}
Type: ${orderData.orderType}
${orderData.orderType === "Delivery" ? `Location: ${orderData.eventDetails.zip || "Not specified"}` : ""}
Company: ${orderData.eventDetails.companyName || "Not specified"}

ORDER ITEMS:
${items}
${servicePackageInfo}

Subtotal: $${orderData.subtotal.toFixed(2)}
Tax: $${orderData.tax.toFixed(2)}
${orderData.deliveryFee > 0 ? `Delivery: $${orderData.deliveryFee.toFixed(2)}` : ""}
Tip: $${orderData.tip.toFixed(2)}
TOTAL: $${orderData.total.toFixed(2)}

Utensils: ${orderData.includeUtensils ? "Yes" : "No"}
`
}

// Replace template variables with actual order data
function replaceTemplateVariables(template: string, orderData: any): string {
  const items = orderData.cart
    .map((item: any) => `${item.quantity}x ${item.name} - $${(item.price * item.quantity).toFixed(2)}`)
    .join("\n")

  const variables: Record<string, string> = {
    "{{order_number}}": orderData.orderNumber || String(Date.now()).slice(-8),
    "{{customer_name}}": orderData.customerName || orderData.eventDetails?.companyName || "Cliente",
    "{{restaurant_name}}": orderData.restaurantName || "Restaurante",
    "{{order_total}}": `$${(orderData.total || 0).toFixed(2)}`,
    "{{order_date}}": orderData.eventDetails?.date || new Date().toLocaleDateString("es-PR"),
    "{{order_time}}": orderData.eventDetails?.time || "",
    "{{delivery_address}}": orderData.eventDetails?.address || orderData.deliveryAddress || "N/A",
    "{{order_items}}": items,
    "{{order_type}}": orderData.orderType === "Delivery" ? "Delivery" : "Recogido",
    "{{subtotal}}": `$${(orderData.subtotal || 0).toFixed(2)}`,
    "{{tax}}": `$${(orderData.tax || 0).toFixed(2)}`,
    "{{delivery_fee}}": `$${(orderData.deliveryFee || 0).toFixed(2)}`,
    "{{tip}}": `$${(orderData.tip || 0).toFixed(2)}`,
  }

  let result = template
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(key.replace(/[{}]/g, "\\$&"), "g"), value)
  }
  return result
}

// Format customer order summary using database template if available
function formatCustomerOrderSummaryFromTemplate(orderData: any, templates: any[] | null): string {
  const confirmationTemplate = templates?.find((t: any) => t.template_type === "order_confirmation")
  
  if (confirmationTemplate?.body) {
    return replaceTemplateVariables(confirmationTemplate.body, orderData)
  }
  
  // Fall back to default format if no template
  return formatCustomerOrderSummaryDefault(orderData)
}

function formatCustomerOrderSummaryDefault(orderData: any) {
  const items = orderData.cart
    .map((item: any) => {
      let itemStr = `${item.quantity}x ${item.name} - $${(item.price * item.quantity).toFixed(2)}`
      if (item.selectedOptions) {
        const options = Object.entries(item.selectedOptions)
          .map(([key, value]: [string, any]) => `  • ${key}: ${Array.isArray(value) ? value.join(", ") : value}`)
          .join("\n")
        itemStr += `\n${options}`
      }
      return itemStr
    })
    .join("\n\n")

  let servicePackageInfo = ""
  if (orderData.servicePackageName) {
    servicePackageInfo = `\n${orderData.servicePackageName} - $${(orderData.servicePackageTotal || 0).toFixed(2)}`
  }

  return `
Thank you for your catering order!

Order Confirmation #${Date.now()}
Order Date: ${new Date().toLocaleString()}

EVENT DETAILS:
Service Date: ${orderData.eventDetails.date}
Service Time: ${orderData.eventDetails.time}
Type: ${orderData.orderType}
${orderData.orderType === "Delivery" ? `Delivery to: ${orderData.eventDetails.zip}` : "Pickup Location: [Restaurant Address]"}
${orderData.eventDetails.companyName ? `Company: ${orderData.eventDetails.companyName}` : ""}

YOUR ORDER:
${items}
${servicePackageInfo}

Subtotal: $${orderData.subtotal.toFixed(2)}
Tax: $${orderData.tax.toFixed(2)}
${orderData.deliveryFee > 0 ? `Delivery Fee: $${orderData.deliveryFee.toFixed(2)}` : ""}
Tip: $${orderData.tip.toFixed(2)}
TOTAL PAID: $${orderData.total.toFixed(2)}

${orderData.includeUtensils ? "Utensils and napkins will be included with your order." : ""}

We'll be in touch if we have any questions about your order.
Thank you for choosing ${orderData.restaurantName || "us"}!
`
}

function formatRestaurantSMS(orderData: any) {
  return `New catering order: ${orderData.cart.length} items, $${orderData.total.toFixed(2)}. Event: ${orderData.eventDetails.date} ${orderData.eventDetails.time}. ${orderData.orderType}. Check email for details.`
}

function formatCustomerSMS(orderData: any) {
  return `Order confirmed! Your ${orderData.restaurantName || "catering"} order for ${orderData.eventDetails.date} has been received. Total: $${orderData.total.toFixed(2)}. Check email for full details.`
}

async function sendEmail(to: string, subject: string, body: string, recipient: "restaurant" | "customer", restaurantName?: string) {
  console.log(`[Notifications] Sending ${recipient} email to: ${to}`)
  
  if (resend) {
    try {
      const fromName = restaurantName || "FoodNet PR"
      await resend.emails.send({
        from: `${fromName} <foodnetpr.mail@gmail.com>`,
        to,
        subject,
        text: body,
      })
      console.log(`[Notifications] Email sent successfully to ${to}`)
      return true
    } catch (error) {
      console.error(`[Notifications] Error sending email to ${to}:`, error)
      return false
    }
  } else {
    console.log(`[Notifications] Resend not configured, email not sent`)
    console.log(`Subject: ${subject}`)
    console.log(body)
    return false
  }
}

async function sendSMS(to: string, message: string, recipient: "restaurant" | "customer") {
  console.log(`[v0] SMS notification sent to ${recipient}: ${to}`)
  console.log(message)

  // TODO: Integrate with Twilio or other SMS service
  // Example: await twilio.messages.create({ body: message, to, from: '...' })

  return true
}
