import { stripe } from "@/lib/stripe"
import { createClient } from "@/lib/supabase/server"
import { CheckCircle } from "lucide-react"

export default async function PhoneOrderSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>
}) {
  const { session_id } = await searchParams
  let orderCreated = false

  if (session_id) {
    try {
      const session = await stripe.checkout.sessions.retrieve(session_id)

      if (session.payment_status === "paid" && session.metadata?.orderData) {
        // Trigger the same order creation flow
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `https://${process.env.VERCEL_URL}` || "http://localhost:3000"
        const res = await fetch(`${baseUrl}/api/check-payment-status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: session_id }),
        })
        orderCreated = res.ok
      }
    } catch (e) {
      console.error("Error processing phone order payment:", e)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center space-y-4">
        <CheckCircle className="w-16 h-16 text-green-600 mx-auto" />
        <h1 className="text-2xl font-bold text-gray-900">Pago Recibido</h1>
        <p className="text-gray-600">
          Tu pago ha sido procesado exitosamente. Tu orden esta siendo preparada.
        </p>
        <p className="text-sm text-gray-500">
          Si tienes alguna pregunta, comunicate con nosotros.
        </p>
      </div>
    </div>
  )
}
