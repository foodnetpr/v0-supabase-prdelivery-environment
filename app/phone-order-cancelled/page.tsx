import { XCircle } from "lucide-react"

export default function PhoneOrderCancelledPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center space-y-4">
        <XCircle className="w-16 h-16 text-red-500 mx-auto" />
        <h1 className="text-2xl font-bold text-gray-900">Pago Cancelado</h1>
        <p className="text-gray-600">
          El pago no fue completado. Si necesitas ayuda o deseas intentar nuevamente, comunicate con nosotros.
        </p>
      </div>
    </div>
  )
}
