"use server"

import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const restaurantId = searchParams.get("restaurant_id")
  const startDate = searchParams.get("start_date")
  const endDate = searchParams.get("end_date")
  const paymentMethod = searchParams.get("payment_method") // "all" | "CREDIT" | "ATHMOVIL" | "CASH"
  const deliveryType = searchParams.get("delivery_type") // "all" | "delivery" | "pickup"
  const paidFilter = searchParams.get("paid") // "all" | "paid" | "unpaid"

  if (!startDate || !endDate) {
    return NextResponse.json({ error: "start_date and end_date are required" }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Build orders query
  let query = supabase
    .from("orders")
    .select(
      `
      id,
      order_number,
      created_at,
      delivery_date,
      delivery_type,
      status,
      subtotal,
      restaurant_subtotal,
      tax,
      tip,
      delivery_fee,
      total,
      stripe_payment_intent_id,
      order_source,
      restaurant_id,
      restaurants!inner(
        id, name, slug, tax_rate,
        restaurant_discount_percent,
        delivery_discount_percent,
        pickup_discount_percent
      )
    `
    )
    .gte("created_at", `${startDate}T00:00:00`)
    .lte("created_at", `${endDate}T23:59:59`)
    .order("created_at", { ascending: true })

  if (restaurantId && restaurantId !== "all") {
    query = query.eq("restaurant_id", restaurantId)
  }

  if (deliveryType && deliveryType !== "all") {
    query = query.eq("delivery_type", deliveryType)
  }

  // Filter by paid status (stripe_payment_intent_id present = paid)
  if (paidFilter === "paid") {
    query = query.not("stripe_payment_intent_id", "is", null)
  } else if (paidFilter === "unpaid") {
    query = query.is("stripe_payment_intent_id", null)
  }

  // Filter by payment method using order_source as proxy (CREDIT = Stripe, ATHMOVIL = ATH)
  if (paymentMethod && paymentMethod !== "all") {
    if (paymentMethod === "CREDIT") {
      query = query.not("stripe_payment_intent_id", "is", null)
    } else if (paymentMethod === "ATHMOVIL") {
      query = query.ilike("order_source", "%athmovil%")
    } else if (paymentMethod === "CASH") {
      query = query.ilike("order_source", "%cash%")
    }
  }

  const { data: orders, error } = await query

  if (error) {
    console.error("[v0] Reports API error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Group by restaurant and compute per-restaurant totals
  const restaurantMap: Record<
    string,
    {
      restaurantId: string
      restaurantName: string
      restaurantSlug: string
      orders: any[]
      totals: {
        subtotal: number
        tax: number
        tip: number
        deliveryFee: number
        total: number
        commission: number
        totalEarned: number
      }
    }
  > = {}

  for (const order of orders ?? []) {
    const rId = order.restaurant_id
    const rest = order.restaurants as any

    if (!restaurantMap[rId]) {
      restaurantMap[rId] = {
        restaurantId: rId,
        restaurantName: rest?.name ?? "Unknown",
        restaurantSlug: rest?.slug ?? "",
        // Store all three rate fields on the restaurant entry so the UI can display them
        commissionGeneral: Number(rest?.restaurant_discount_percent || 0),
        commissionDelivery: Number(rest?.delivery_discount_percent || 0),
        commissionPickup: Number(rest?.pickup_discount_percent || 0),
        orders: [],
        totals: {
          subtotal: 0,
          tax: 0,
          tip: 0,
          deliveryFee: 0,
          total: 0,
          commission: 0,
          totalEarned: 0,
        },
      }
    }

    const subtotal = Number(order.restaurant_subtotal || order.subtotal || 0)
    const tax = Number(order.tax || 0)
    const tip = Number(order.tip || 0)
    const deliveryFee = Number(order.delivery_fee || 0)
    const total = Number(order.total || 0)

    // Resolve the effective commission rate for this specific order using the
    // same logic as the restaurant edit dialog: use the type-specific rate if
    // it is > 0, otherwise fall back to the General rate.
    const generalRate = Number(rest?.restaurant_discount_percent || 0)
    const deliveryRate = Number(rest?.delivery_discount_percent || 0)
    const pickupRate = Number(rest?.pickup_discount_percent || 0)
    const orderType = (order.delivery_type ?? "").toLowerCase()
    let effectiveRate = generalRate
    if (orderType === "delivery" && deliveryRate > 0) effectiveRate = deliveryRate
    if (orderType === "pickup" && pickupRate > 0) effectiveRate = pickupRate

    const commission = subtotal * (effectiveRate / 100)
    const totalEarned = subtotal + tax + tip - commission

    const paymentMethodDerived = order.stripe_payment_intent_id
      ? "CREDIT"
      : order.order_source?.toLowerCase().includes("athmovil")
      ? "ATHMOVIL"
      : "CASH"

    // Determine daypart from created_at hour
    const hour = new Date(order.created_at).getHours()
    const daypart = hour < 11 ? "Breakfast" : hour < 16 ? "Lunch" : "Dinner"

    restaurantMap[rId].orders.push({
      id: order.id,
      orderNumber: order.order_number,
      createdAt: order.created_at,
      deliveryType: order.delivery_type?.toUpperCase() ?? "DELIVERY",
      status: order.status,
      paymentMethod: paymentMethodDerived,
      isPaid: !!order.stripe_payment_intent_id,
      daypart,
      subtotal,
      tax,
      tip,
      deliveryFee,
      total,
      commission,
      totalEarned,
    })

    restaurantMap[rId].totals.subtotal += subtotal
    restaurantMap[rId].totals.tax += tax
    restaurantMap[rId].totals.tip += tip
    restaurantMap[rId].totals.deliveryFee += deliveryFee
    restaurantMap[rId].totals.total += total
    restaurantMap[rId].totals.commission += commission
    restaurantMap[rId].totals.totalEarned += totalEarned
  }

  return NextResponse.json({
    restaurants: Object.values(restaurantMap),
    meta: {
      startDate,
      endDate,
      totalOrders: orders?.length ?? 0,
    },
  })
}
