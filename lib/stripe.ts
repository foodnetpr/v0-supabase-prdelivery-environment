import "server-only"

import Stripe from "stripe"

const stripeSecretKey = process.env.STRIPE_SECRET_KEY

if (!stripeSecretKey) {
  console.error("[v0] STRIPE_SECRET_KEY is not set")
}

export const stripe = stripeSecretKey 
  ? new Stripe(stripeSecretKey)
  : null as unknown as Stripe
