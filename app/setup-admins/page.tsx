"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function SetupAdminsPage() {
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const setupAdmins = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/setup-admins", {
        method: "POST",
      })
      const data = await response.json()
      setResults(data)
    } catch (error) {
      console.error("Error setting up admins:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Configurar Cuentas de Administrador</CardTitle>
          <CardDescription>
            Esto creará cuentas de administrador para todos los restaurantes con la contraseña genérica:{" "}
            <strong>admin123</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={setupAdmins} disabled={loading} className="w-full">
            {loading ? "Creando cuentas..." : "Crear Cuentas de Administrador"}
          </Button>

          {results && (
            <div className="mt-6 space-y-3">
              <h3 className="font-semibold text-lg">Resultados:</h3>
              {results.results?.map((result: any, index: number) => (
                <Card key={index} className={result.success ? "border-green-500" : "border-red-500"}>
                  <CardContent className="pt-4">
                    <p className="font-medium">{result.restaurant}</p>
                    {result.success ? (
                      <>
                        <p className="text-sm text-gray-600">Usuario: {result.username}</p>
                        <p className="text-sm text-gray-600">Contraseña: {result.password}</p>
                        <p className="text-sm text-green-600 mt-2">✓ Cuenta creada exitosamente</p>
                      </>
                    ) : (
                      <p className="text-sm text-red-600 mt-2">✗ Error: {result.error}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
