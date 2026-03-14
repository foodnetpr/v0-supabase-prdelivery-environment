import { NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"

export async function GET() {
  try {
    // Check if Stripe is configured
    if (!stripe) {
      return NextResponse.json({
        status: "error",
        message: "Stripe is not configured - STRIPE_SECRET_KEY is missing"
      }, { status: 500 })
    }

    // Check if the key format is correct
    const keyPrefix = process.env.STRIPE_SECRET_KEY?.substring(0, 8) || "unknown"
    const isTestKey = process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_")
    const isLiveKey = process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_")

    // Try to make a simple API call to verify the key works
    const balance = await stripe.balance.retrieve()

    return NextResponse.json({
      status: "success",
      message: "Stripe connection successful",
      keyType: isTestKey ? "test" : isLiveKey ? "live" : "unknown",
      keyPrefix: keyPrefix + "...",
      balanceAvailable: balance.available.length > 0
    })
  } catch (error: any) {
    return NextResponse.json({
      status: "error",
      message: error?.message || "Unknown error",
      type: error?.type,
      code: error?.code,
      keyPrefix: process.env.STRIPE_SECRET_KEY?.substring(0, 8) || "not set"
    }, { status: 500 })
  }
}
