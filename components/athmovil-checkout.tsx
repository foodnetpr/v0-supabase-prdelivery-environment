"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, X, CheckCircle, AlertCircle, Smartphone } from "lucide-react"
import { createATHMovilPayment, checkATHMovilPaymentStatus, createATHMovilOrder } from "@/app/actions/athmovil"

interface ATHMovilCheckoutProps {
  orderData: any
  onSuccess: () => void
  onCancel: () => void
}

export default function ATHMovilCheckout({ orderData, onSuccess, onCancel }: ATHMovilCheckoutProps) {
  const [status, setStatus] = useState<"loading" | "waiting" | "checking" | "success" | "error">("loading")
  const [error, setError] = useState<string | null>(null)
  const [paymentData, setPaymentData] = useState<any>(null)
  const [timeRemaining, setTimeRemaining] = useState(600) // 10 minutes

  // Initialize ATH Móvil payment
  useEffect(() => {
    const initPayment = async () => {
      try {
        setStatus("loading")
        const result = await createATHMovilPayment({
          restaurantId: orderData.restaurantId,
          branchId: orderData.branchId,
          cart: orderData.cart,
          total: orderData.total,
          tax: orderData.tax,
          tip: orderData.tip || 0,
          subtotal: orderData.subtotal,
          deliveryFee: orderData.deliveryFee || 0,
          customerEmail: orderData.customerEmail,
          customerPhone: orderData.customerPhone,
          eventDetails: orderData.eventDetails,
          orderType: orderData.orderType,
          restaurantName: orderData.restaurantName,
          branchName: orderData.branchName,
          athmovil_public_token: orderData.athmovilPublicToken,
          athmovil_ecommerce_id: orderData.athmovilEcommerceId,
        })

        if (result.success) {
          setPaymentData(result)
          setStatus("waiting")
        } else {
          setError(result.error || "Error al iniciar el pago")
          setStatus("error")
        }
      } catch (err: any) {
        setError(err.message || "Error inesperado")
        setStatus("error")
      }
    }

    initPayment()
  }, [orderData])

  // Countdown timer
  useEffect(() => {
    if (status !== "waiting") return

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          setStatus("error")
          setError("El tiempo para completar el pago ha expirado")
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [status])

  // Poll for payment status
  const checkPaymentStatus = useCallback(async () => {
    if (!paymentData?.ecommerceId || !paymentData?.publicToken) return

    setStatus("checking")
    try {
      const result = await checkATHMovilPaymentStatus(
        paymentData.ecommerceId,
        paymentData.publicToken
      )

      console.log("[v0] ATH Móvil status check result:", result)

      if (result.success) {
        // Status values: "OPEN" (pending), "CONFIRM" (user confirmed), "COMPLETED", "CANCEL"
        if (result.status === "COMPLETED" || result.status === "CONFIRM") {
          // Create the order in the database
          const orderResult = await createATHMovilOrder({
            ...orderData,
            athMovilTransactionId: result.transactionId || paymentData.ecommerceId,
          })
          
          if (orderResult.success) {
            setStatus("success")
            setTimeout(() => {
              onSuccess()
            }, 2000)
          } else {
            console.error("[v0] Failed to create order:", orderResult.error)
            setStatus("error")
            setError("Pago confirmado pero hubo un error creando la orden. Contacte al restaurante.")
          }
        } else if (result.status === "CANCEL") {
          setStatus("error")
          setError("El pago fue cancelado o expiró")
        } else {
          // OPEN status - still pending, go back to waiting
          setStatus("waiting")
        }
      } else {
        // API error, keep waiting
        setStatus("waiting")
      }
    } catch (err) {
      console.error("[v0] ATH Móvil status check error:", err)
      setStatus("waiting") // Keep waiting, don't show error for status check failures
    }
  }, [paymentData, onSuccess])

  // Auto-poll every 5 seconds while waiting
  useEffect(() => {
    if (status !== "waiting") return

    const pollInterval = setInterval(() => {
      checkPaymentStatus()
    }, 5000)

    return () => clearInterval(pollInterval)
  }, [status, checkPaymentStatus])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">ATH</span>
          </div>
          <div>
            <h2 className="text-lg font-bold">ATH Móvil</h2>
            <p className="text-sm text-gray-500">Pago seguro con ATH Móvil</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Order Summary */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Total a pagar:</span>
          <span className="text-2xl font-bold text-orange-600">${orderData.total?.toFixed(2)}</span>
        </div>
      </div>

      {/* Status Content */}
      <div className="text-center py-8">
        {status === "loading" && (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-orange-500 mx-auto mb-4" />
            <p className="text-gray-600">Preparando tu pago de ATH Móvil...</p>
          </>
        )}

        {status === "waiting" && (
          <>
            <div className="mb-6">
              <Smartphone className="h-16 w-16 text-orange-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Completa el pago en tu app</h3>
              <p className="text-gray-600 mb-4">
                Abre la aplicación de ATH Móvil en tu teléfono y aprueba el pago.
              </p>
            </div>

            {/* Transaction ID */}
            {paymentData?.ecommerceId && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-600 mb-1">ID de transacción:</p>
                <p className="font-mono font-bold text-orange-600 text-sm break-all">{paymentData.ecommerceId}</p>
              </div>
            )}

            {/* Timer */}
            <div className="mb-6">
              <p className="text-sm text-gray-500">Tiempo restante:</p>
              <p className="text-2xl font-mono font-bold text-gray-700">{formatTime(timeRemaining)}</p>
            </div>

            {/* Instructions */}
            <div className="text-left bg-gray-50 rounded-lg p-4 mb-6">
              <h4 className="font-semibold mb-2">Instrucciones:</h4>
              <ol className="text-sm text-gray-600 space-y-2">
                <li>1. Abre la app de ATH Móvil en tu teléfono</li>
                <li>2. Ve a "Pagos pendientes" o "Notificaciones"</li>
                <li>3. Selecciona este pago y confírmalo</li>
                <li>4. Una vez aprobado, esta página se actualizará automáticamente</li>
              </ol>
            </div>

            {/* Manual Check Button */}
            <Button 
              onClick={checkPaymentStatus} 
              variant="outline" 
              className="w-full"
            >
              Ya completé el pago
            </Button>
          </>
        )}

        {status === "checking" && (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-orange-500 mx-auto mb-4" />
            <p className="text-gray-600">Verificando estado del pago...</p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-green-600 mb-2">¡Pago completado!</h3>
            <p className="text-gray-600">Tu pago con ATH Móvil fue procesado exitosamente.</p>
          </>
        )}

        {status === "error" && (
          <>
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-red-600 mb-2">Error en el pago</h3>
            <p className="text-gray-600 mb-4">{error || "Hubo un problema con tu pago de ATH Móvil."}</p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={onCancel}>
                Volver
              </Button>
              <Button 
                onClick={() => {
                  setStatus("loading")
                  setError(null)
                  setTimeRemaining(600)
                }}
                className="bg-orange-500 hover:bg-orange-600"
              >
                Reintentar
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Cancel Button (while waiting) */}
      {(status === "waiting" || status === "loading") && (
        <div className="mt-4 text-center">
          <button
            onClick={onCancel}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Cancelar y usar otro método de pago
          </button>
        </div>
      )}
    </div>
  )
}
