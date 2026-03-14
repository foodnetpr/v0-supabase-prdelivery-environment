"use client"

import { useState } from "react"
import { createSquareCheckoutSession } from "@/app/actions/square"
import { Loader2, CreditCard, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

interface SquareCheckoutProps {
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
    squareAccessToken: string
    squareLocationId: string
    squareEnvironment?: "sandbox" | "production"
    restaurantId?: string
    branchId?: string
  }
  onSuccess: () => void
  onCancel: () => void
}

export default function SquareCheckout({ orderData, onSuccess, onCancel }: SquareCheckoutProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCheckout = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await createSquareCheckoutSession(orderData)

      if (result.success && result.checkoutUrl) {
        // Redirect to Square's hosted checkout page
        window.location.href = result.checkoutUrl
      } else {
        throw new Error("Failed to create checkout session")
      }
    } catch (err: any) {
      console.error("[Square Checkout] Error:", err)
      setError(err.message || "Error al procesar el pago. Por favor intenta de nuevo.")
      setIsLoading(false)
    }
  }

  // Auto-initiate checkout when component mounts
  useState(() => {
    handleCheckout()
  })

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">Error en el pago</p>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onCancel} className="flex-1">
            Volver
          </Button>
          <Button onClick={handleCheckout} disabled={isLoading} className="flex-1">
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Procesando...
              </>
            ) : (
              "Reintentar"
            )}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-bold">Completar Pago</h3>
        <button 
          onClick={onCancel} 
          className="text-sm text-gray-600 hover:text-gray-900"
          disabled={isLoading}
        >
          Cancelar
        </button>
      </div>

      <div className="flex flex-col items-center justify-center py-12">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          {isLoading ? (
            <Loader2 className="w-8 h-8 text-gray-600 animate-spin" />
          ) : (
            <CreditCard className="w-8 h-8 text-gray-600" />
          )}
        </div>
        
        <h4 className="text-lg font-semibold text-gray-900 mb-2">
          {isLoading ? "Preparando checkout seguro..." : "Procesando pago"}
        </h4>
        
        <p className="text-sm text-gray-600 text-center max-w-xs">
          {isLoading 
            ? "Serás redirigido a Square para completar tu pago de forma segura."
            : "Redirigiendo a la página de pago..."}
        </p>

        {/* Order summary */}
        <div className="mt-8 w-full max-w-sm bg-gray-50 rounded-lg p-4">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Subtotal</span>
            <span>${orderData.subtotal.toFixed(2)}</span>
          </div>
          {orderData.tax > 0 && (
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Impuestos</span>
              <span>${orderData.tax.toFixed(2)}</span>
            </div>
          )}
          {orderData.deliveryFee > 0 && (
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Delivery</span>
              <span>${orderData.deliveryFee.toFixed(2)}</span>
            </div>
          )}
          {orderData.tip > 0 && (
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Propina</span>
              <span>${orderData.tip.toFixed(2)}</span>
            </div>
          )}
          <div className="border-t pt-2 mt-2 flex justify-between font-semibold">
            <span>Total</span>
            <span>${orderData.total.toFixed(2)}</span>
          </div>
        </div>

        {!isLoading && (
          <Button onClick={handleCheckout} className="mt-6 w-full max-w-sm">
            Continuar al Pago
          </Button>
        )}
      </div>
    </div>
  )
}
