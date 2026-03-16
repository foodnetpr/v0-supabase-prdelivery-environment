"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { createBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function LinkAccountPage() {
  const [loading, setLoading] = useState<"link" | "skip" | null>(null)
  const [error, setError] = useState("")
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get("next") || "/"
  const legacyCustomerId = searchParams.get("legacy_customer_id")
  const supabase = createBrowserClient()

  // Link: migrate the legacy customer record to the current Apple auth user.
  const handleLink = async () => {
    if (!legacyCustomerId) return
    setLoading("link")
    setError("")

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) throw new Error("No se pudo verificar la sesion.")

      // Claim the legacy customer record by setting auth_user_id.
      const { error: updateError } = await supabase
        .from("customers")
        .update({ auth_user_id: user.id, updated_at: new Date().toISOString() })
        .eq("id", legacyCustomerId)
        .is("auth_user_id", null) // safety: only claim truly unlinked records

      if (updateError) throw updateError

      router.push(next)
      router.refresh()
    } catch (err: any) {
      setError(err.message || "Error al vincular las cuentas.")
      setLoading(null)
    }
  }

  // Skip: create a brand-new customer record for the Apple user.
  const handleSkip = async () => {
    setLoading("skip")
    setError("")

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) throw new Error("No se pudo verificar la sesion.")

      await supabase.from("customers").insert({
        auth_user_id: user.id,
        email: user.email || "",
        first_name: user.user_metadata?.full_name?.split(" ")[0] || "",
        last_name: user.user_metadata?.full_name?.split(" ").slice(1).join(" ") || "",
      })

      router.push(next)
      router.refresh()
    } catch (err: any) {
      setError(err.message || "Error al continuar.")
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <Link href="/" className="flex justify-center">
            <Image
              src="/foodnet-delivery-logo.jpg"
              alt="FoodNetDelivery"
              width={180}
              height={60}
              className="h-12 w-auto object-contain"
            />
          </Link>
          <div>
            <CardTitle className="text-xl">Ya tienes una cuenta</CardTitle>
            <CardDescription className="mt-2">
              Encontramos una cuenta existente con este correo electronico. Puedes vincular tu cuenta de Apple con tu cuenta anterior para conservar tu historial de pedidos y direcciones guardadas, o continuar como una cuenta nueva.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded text-sm">
              {error}
            </div>
          )}

          <Button
            className="w-full h-11"
            onClick={handleLink}
            disabled={loading !== null}
          >
            {loading === "link" ? (
              <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
            ) : null}
            Vincular con mi cuenta anterior
          </Button>

          <Button
            variant="outline"
            className="w-full h-11"
            onClick={handleSkip}
            disabled={loading !== null}
          >
            {loading === "skip" ? (
              <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2" />
            ) : null}
            Continuar como cuenta nueva
          </Button>

          <p className="text-xs text-center text-muted-foreground pt-2">
            Al vincular, tu historial de pedidos, direcciones guardadas y metodos de pago anteriores estaran disponibles con Apple Sign In.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
