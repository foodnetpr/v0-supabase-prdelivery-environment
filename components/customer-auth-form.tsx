"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Image from "next/image"

interface CustomerAuthFormProps {
  restaurant: {
    name: string
    logo_url: string | null
    primary_color: string
  }
  slug: string
  initialMode?: string
  redirectPath?: string
}

export function CustomerAuthForm({ restaurant, slug, initialMode, redirectPath }: CustomerAuthFormProps) {
  const [mode, setMode] = useState(initialMode === "signup" ? "signup" : "login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [socialLoading, setSocialLoading] = useState<string | null>(null)
  const [message, setMessage] = useState("")
  const router = useRouter()
  const supabase = createBrowserClient()

  const handleSocialLogin = async (provider: "google" | "facebook") => {
    setSocialLoading(provider)
    setError("")

    try {
      const redirectTo = redirectPath === "checkout"
        ? `/${slug}?redirect=checkout`
        : `/${slug}`

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
        },
      })

      if (error) throw error
    } catch (err: any) {
      setError(err.message || `Error al iniciar sesion con ${provider}`)
      setSocialLoading(null)
    }
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setMessage("")
    setLoading(true)

    try {
      if (mode === "signup") {
        const confirmRedirect = redirectPath === "checkout" 
          ? `${window.location.origin}/${slug}?redirect=checkout`
          : `${window.location.origin}/${slug}/${redirectPath || ""}`

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name },
            emailRedirectTo: confirmRedirect,
          },
        })

        if (error) throw error

        // If user is auto-confirmed (no email verification required), redirect immediately
        if (data.session) {
          window.location.href = redirectPath === "checkout" ? `/${slug}?redirect=checkout` : `/${slug}/${redirectPath || ""}`
          return
        }

        setMessage("Cuenta creada. Por favor revisa tu correo para verificar tu cuenta.")
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) throw error

        // If redirectPath is "checkout", go back to the restaurant page to restore cart from sessionStorage
        if (redirectPath === "checkout") {
          window.location.href = `/${slug}?redirect=checkout`
        } else {
          router.push(`/${slug}/${redirectPath || ""}`)
          router.refresh()
        }
      }
    } catch (err: any) {
      setError(err.message || "Error de autenticacion")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          {restaurant.logo_url && (
            <div className="flex justify-center">
              <Image
                src={restaurant.logo_url || "/placeholder.svg"}
                alt={restaurant.name}
                width={200}
                height={80}
                className="h-14 w-auto object-contain"
              />
            </div>
          )}
          <div>
            <CardTitle className="text-2xl">{mode === "login" ? "Bienvenido" : "Crear Cuenta"}</CardTitle>
            <CardDescription>
              {mode === "login"
                ? `Inicia sesion en tu cuenta de ${restaurant.name}`
                : `Unete a ${restaurant.name} para rastrear pedidos y guardar favoritos`}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 mb-4">
            <Button
              type="button"
              variant="outline"
              className="w-full flex items-center justify-center gap-3 h-11"
              disabled={socialLoading !== null}
              onClick={() => handleSocialLogin("google")}
            >
              {socialLoading === "google" ? (
                <span className="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full" />
              ) : (
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
              )}
              Continuar con Google
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full flex items-center justify-center gap-3 h-11"
              disabled={socialLoading !== null}
              onClick={() => handleSocialLogin("facebook")}
            >
              {socialLoading === "facebook" ? (
                <span className="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full" />
              ) : (
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="#1877F2">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              )}
              Continuar con Facebook
            </Button>
          </div>

          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">o con email</span>
            </div>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {mode === "signup" && (
              <div>
                <Label htmlFor="name">Nombre Completo</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="mt-1"
                />
              </div>
            )}

            <div>
              <Label htmlFor="email">Correo Electronico</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="password">Contrasena</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="mt-1"
              />
              {mode === "signup" && <p className="text-xs text-muted-foreground mt-1">Minimo 6 caracteres</p>}
            </div>

            {message && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded text-sm">
                {message}
              </div>
            )}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">{error}</div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full"
              style={{ backgroundColor: restaurant.primary_color }}
            >
              {loading ? "Por favor espera..." : mode === "login" ? "Iniciar Sesion" : "Crear Cuenta"}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm">
            {mode === "login" ? (
              <p>
                No tienes cuenta?{" "}
                <button
                  onClick={() => setMode("signup")}
                  className="font-medium hover:underline"
                  style={{ color: restaurant.primary_color }}
                >
                  Registrate
                </button>
              </p>
            ) : (
              <p>
                Ya tienes cuenta?{" "}
                <button
                  onClick={() => setMode("login")}
                  className="font-medium hover:underline"
                  style={{ color: restaurant.primary_color }}
                >
                  Inicia sesion
                </button>
              </p>
            )}
          </div>

        </CardContent>
      </Card>
    </div>
  )
}
