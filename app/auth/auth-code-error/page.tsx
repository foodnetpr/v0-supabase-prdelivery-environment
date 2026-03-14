import Link from "next/link"

export default function AuthCodeError() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center max-w-md space-y-4">
        <h1 className="text-2xl font-bold">Error de autenticacion</h1>
        <p className="text-muted-foreground">
          Hubo un problema al verificar tu cuenta. Por favor intenta de nuevo.
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  )
}
