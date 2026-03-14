"use client"

import { useCallback, useState, useEffect, useMemo } from "react"
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js"
import { loadStripe } from "@stripe/stripe-js"
import { createCheckoutSession } from "@/app/actions/stripe"

interface StripeCheckoutProps {
  orderData: {
    cart: any[]
    subtotal: number
    tax: number
    deliveryFee: number
    tip: number
    total: number
    orderType: string
    eventDetails: any
    includeUtensils: boolean
    customerEmail: string
    customerPhone?: string
    smsConsent: boolean
    servicePackage?: string | null
    stripeAccountId?: string | null // Stripe Connect account ID for the branch
  }
  onSuccess: () => void
  onCancel: () => void
}

export default function StripeCheckout({ orderData, onSuccess, onCancel }: StripeCheckoutProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)

  // Load Stripe with connected account if specified
  const stripePromise = useMemo(() => {
    const options = orderData.stripeAccountId 
      ? { stripeAccount: orderData.stripeAccountId }
      : undefined
    return loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!, options)
  }, [orderData.stripeAccountId])

const fetchClientSecret = useCallback(async () => {
  try {
    const { clientSecret, sessionId } = await createCheckoutSession(orderData)
      setClientSecret(clientSecret)
      setSessionId(sessionId)
      return clientSecret
    } catch (err: any) {
      setError(err.message)
      throw err
    }
  }, [orderData])

  // Poll for payment completion
  useEffect(() => {
    if (!sessionId) return

    const interval = setInterval(async () => {
      try {
        // Include stripe_account_id in the polling URL for connected accounts
        const accountParam = orderData.stripeAccountId 
          ? `&stripe_account_id=${orderData.stripeAccountId}` 
          : ""
        const response = await fetch(`/api/check-payment-status?session_id=${sessionId}${accountParam}`)
        const data = await response.json()

        if (data.status === "complete") {
          clearInterval(interval)
          onSuccess()
        }
      } catch (err) {
        console.error("Error checking payment status:", err)
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [sessionId, onSuccess, orderData.stripeAccountId])

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded p-4 mb-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
        <button onClick={onCancel} className="w-full bg-gray-900 text-white py-3 rounded font-bold hover:bg-gray-800">
          Volver
        </button>
      </div>
    )
  }

  return (
    <div id="checkout" className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-bold">Completar Pago</h3>
        <button onClick={onCancel} className="text-sm text-gray-600 hover:text-gray-900">
          Cancelar
        </button>
      </div>
      <EmbeddedCheckoutProvider stripe={stripePromise} options={{ fetchClientSecret }}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  )
}
