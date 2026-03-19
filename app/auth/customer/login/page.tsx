"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { createBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

// Format phone number as (787) 555-1234
function formatPhoneNumber(value: string): string {
  const digits = value.replace(/\D/g, "")
  if (digits.length === 0) return ""
  if (digits.length <= 3) return `(${digits}`
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`
}

// Convert formatted phone to E.164 format for Supabase
function toE164(phone: string): string {
  const digits = phone.replace(/\D/g, "")
  if (digits.length === 10) return `+1${digits}`
  return `+${digits}`
}

export default function CustomerLoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [socialLoading, setSocialLoading] = useState<string | null>(null)
  // Phone login state
  const [loginMethod, setLoginMethod] = useState<"email" | "phone">("email")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [otpCode, setOtpCode] = useState("")
  const [otpSent, setOtpSent] = useState(false)
  const [phoneLoading, setPhoneLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get("redirect") || "/"
  const supabase = createBrowserClient()

  const handleSocialLogin = async (provider: "google" | "facebook") => {
    setSocialLoading(provider)
    setError("")

    try {
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

  const handleAppleSignIn = async () => {
    setSocialLoading("apple")
    setError("")

    try {
      // Detect native Capacitor environment (iOS app)
      const isNative =
        typeof window !== "undefined" &&
        (window as any).Capacitor?.isNativePlatform?.()

      if (isNative) {
        // Native iOS flow: use the @capacitor-community/apple-sign-in plugin.
        // The package is NOT in package.json (would break the web lockfile) — it must be
        // installed separately in the ios/ project. We use Function() to prevent
        // webpack from statically analysing or bundling this import.
        // eslint-disable-next-line no-new-func
        const { SignInWithApple } = await new Function('pkg', 'return import(pkg)')("@capacitor-community/apple-sign-in")
        const result = await SignInWithApple.authorize({
          clientId: "ca.salecalle.marketplace.app",
          redirectURI: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/callback`,
          scopes: "email name",
          state: Math.random().toString(36).substring(2),
          nonce: Math.random().toString(36).substring(2),
        })

        // Exchange the Apple identity token with Supabase
        const { data, error: supaError } = await supabase.auth.signInWithIdToken({
          provider: "apple",
          token: result.response.identityToken,
        })

        if (supaError) throw supaError

        // Ensure customer record exists after native Apple sign-in
        if (data.user) {
          const { data: existing } = await supabase
            .from("customers")
            .select("id")
            .eq("auth_user_id", data.user.id)
            .single()

          if (!existing) {
            const fullName = [
              result.response.givenName,
              result.response.familyName,
            ]
              .filter(Boolean)
              .join(" ")

            await supabase.from("customers").insert({
              auth_user_id: data.user.id,
              email: data.user.email || result.response.email || "",
              first_name: result.response.givenName || fullName.split(" ")[0] || "",
              last_name: result.response.familyName || fullName.split(" ").slice(1).join(" ") || "",
            })
          }
        }

        router.push(redirectTo)
        router.refresh()
      } else {
        // Web flow: redirect-based OAuth (same as Google/Facebook)
        const { error: oauthError } = await supabase.auth.signInWithOAuth({
          provider: "apple",
          options: {
            redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
          },
        })
        if (oauthError) throw oauthError
      }
    } catch (err: any) {
      // User cancelled Apple Sign In — don't show an error
      if (err?.code === "1001" || err?.message?.includes("cancel")) {
        setSocialLoading(null)
        return
      }
      setError(err.message || "Error al iniciar sesion con Apple")
      setSocialLoading(null)
    }
  }

  const handleSendOtp = async () => {
    const digits = phoneNumber.replace(/\D/g, "")
    if (digits.length !== 10) {
      setError("Por favor ingresa un numero de 10 digitos")
      return
    }

    setPhoneLoading(true)
    setError("")

    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: toE164(phoneNumber),
      })

      if (error) throw error
      setOtpSent(true)
    } catch (err: any) {
      setError(err.message || "Error al enviar el codigo SMS")
    } finally {
      setPhoneLoading(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (otpCode.length !== 6) {
      setError("El codigo debe tener 6 digitos")
      return
    }

    setPhoneLoading(true)
    setError("")

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone: toE164(phoneNumber),
        token: otpCode,
        type: "sms",
      })

      if (error) throw error

      // Ensure customer record exists
      if (data.user) {
        const { data: customer } = await supabase
          .from("customers")
          .select("id")
          .eq("auth_user_id", data.user.id)
          .single()

        if (!customer) {
          await supabase.from("customers").insert({
            auth_user_id: data.user.id,
            email: data.user.email || "",
            phone: toE164(phoneNumber),
            first_name: "",
            last_name: "",
          })
        }
      }

      router.push(redirectTo)
      router.refresh()
    } catch (err: any) {
      setError(err.message || "Codigo invalido")
    } finally {
      setPhoneLoading(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      // Ensure customer record exists
      if (data.user) {
        const { data: customer } = await supabase
          .from("customers")
          .select("id")
          .eq("auth_user_id", data.user.id)
          .single()

        if (!customer) {
          await supabase.from("customers").insert({
            auth_user_id: data.user.id,
            email: data.user.email!,
            first_name: data.user.user_metadata?.first_name || "",
            last_name: data.user.user_metadata?.last_name || "",
          })
        }
      }

      router.push(redirectTo)
      router.refresh()
    } catch (err: any) {
      setError(err.message || "Error al iniciar sesion")
    } finally {
      setLoading(false)
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
            <CardTitle className="text-2xl">Bienvenido</CardTitle>
            <CardDescription>
              Inicia sesion para ordenar de tus restaurantes favoritos
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Social Login Buttons */}
          <div className="space-y-3">
            {/* Apple Sign In */}
            <Button
              type="button"
              className="w-full flex items-center justify-center gap-3 h-11 bg-black text-white hover:bg-neutral-800"
              disabled={socialLoading !== null || loading}
              onClick={handleAppleSignIn}
            >
              {socialLoading === "apple" ? (
                <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.7 9.05 7.42c1.39.07 2.36.74 3.18.8.96-.2 1.88-.89 3.16-.95 2.02.08 3.54 1.07 4.15 2.72-3.65 2.1-2.72 6.84.51 8.29zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                </svg>
              )}
              Continuar con Apple
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full flex items-center justify-center gap-3 h-11"
              disabled={socialLoading !== null || loading}
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
              disabled={socialLoading !== null || loading}
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

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">o continua con</span>
            </div>
          </div>

          {/* Login Method Tabs */}
          <div className="flex rounded-lg border bg-muted p-1">
            <button
              type="button"
              onClick={() => { setLoginMethod("email"); setError(""); setOtpSent(false); }}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                loginMethod === "email"
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Email
            </button>
            <button
              type="button"
              onClick={() => { setLoginMethod("phone"); setError(""); }}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                loginMethod === "phone"
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Telefono
            </button>
          </div>

          {/* Email Login Form */}
          {loginMethod === "email" && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Correo Electronico</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="tu@email.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Contrasena</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Tu contrasena"
                />
              </div>

              {error && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded text-sm">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={loading || socialLoading !== null}
                className="w-full bg-teal-600 hover:bg-teal-700"
              >
                {loading ? "Iniciando sesion..." : "Iniciar Sesion"}
              </Button>
            </form>
          )}

          {/* Phone Login Form */}
          {loginMethod === "phone" && (
            <div className="space-y-4">
              {!otpSent ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Numero de Telefono</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(formatPhoneNumber(e.target.value))}
                      placeholder="(787) 555-1234"
                      maxLength={14}
                    />
                    <p className="text-xs text-muted-foreground">
                      Te enviaremos un codigo de 6 digitos por SMS
                    </p>
                  </div>

                  {error && (
                    <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded text-sm">
                      {error}
                    </div>
                  )}

                  <Button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={phoneLoading || phoneNumber.replace(/\D/g, "").length !== 10}
                    className="w-full bg-teal-600 hover:bg-teal-700"
                  >
                    {phoneLoading ? "Enviando..." : "Enviar Codigo"}
                  </Button>
                </>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="otp">Codigo de Verificacion</Label>
                    <Input
                      id="otp"
                      type="text"
                      inputMode="numeric"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="123456"
                      maxLength={6}
                      className="text-center text-lg tracking-widest"
                    />
                    <p className="text-xs text-muted-foreground">
                      Ingresa el codigo enviado a {phoneNumber}
                    </p>
                  </div>

                  {error && (
                    <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded text-sm">
                      {error}
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={phoneLoading || otpCode.length !== 6}
                    className="w-full bg-teal-600 hover:bg-teal-700"
                  >
                    {phoneLoading ? "Verificando..." : "Verificar Codigo"}
                  </Button>

                  <button
                    type="button"
                    onClick={() => { setOtpSent(false); setOtpCode(""); setError(""); }}
                    className="w-full text-sm text-muted-foreground hover:text-foreground"
                  >
                    Cambiar numero o reenviar codigo
                  </button>
                </form>
              )}
            </div>
          )}

          <div className="text-center text-sm text-muted-foreground">
            No tienes cuenta?{" "}
            <Link
              href={`/auth/customer/signup${redirectTo !== "/" ? `?redirect=${encodeURIComponent(redirectTo)}` : ""}`}
              className="font-medium text-teal-600 hover:underline"
            >
              Registrate
            </Link>
          </div>

          <Separator />

          <div className="text-center text-xs text-muted-foreground">
            Eres restaurante?{" "}
            <Link href="/auth/login" className="font-medium hover:underline">
              Acceso para administradores
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
