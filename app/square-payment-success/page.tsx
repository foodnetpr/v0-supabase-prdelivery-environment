import { Suspense } from "react"
import { CheckCircle } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

function SuccessContent() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Pago Completado
        </h1>
        
        <p className="text-gray-600 mb-6">
          Tu pago ha sido procesado exitosamente. Recibirás un correo de confirmación con los detalles de tu orden.
        </p>
        
        <div className="space-y-3">
          <Link href="/">
            <Button className="w-full">
              Volver al Inicio
            </Button>
          </Link>
        </div>
        
        <p className="text-sm text-gray-500 mt-6">
          Si tienes alguna pregunta, contáctanos.
        </p>
      </div>
    </div>
  )
}

export default function SquarePaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  )
}
