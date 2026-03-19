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

export default function CustomerSignupPage() {
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [socialLoading, setSocialLoading] = useState<string | null>(null)
  // Phone signup state
  const [signupMethod, setSignupMethod] = useState<"email" | "phone">("email")
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
      setError(err.message || `Error al registrarse con ${provider}`)
      setSocialLoading(null)
    }
  }

  const handleAppleSignIn = async () => {
    setSocialLoading("apple")
    setError("")

    try {
      const isNative =
        typeof window !== "undefined" &&
        (window as any).Capacitor?.isNativePlatform?.()

      if (isNative) {
        // eslint-disable-next-line no-new-func
        const { SignInWithApple } = await new Function('pkg', 'return import(pkg)')("@capacitor-community/apple-sign-in")
        const result = await SignInWithApple.authorize({
          clientId: "ca.salecalle.marketplace.app",
          redirectURI: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/callback`,
          scopes: "email name",
          state: Math.random().toString(36).substring(2),
          nonce: Math.random().toString(36).substring(2),
        })

        const { data, error: supaError } = await supabase.auth.signInWithIdToken({
          provider: "apple",
          token: result.response.identityToken,
        })

        if (supaError) throw supaError

        if (data.user) {
          const { data: existing } = await supabase
            .from("customers")
            .select("id")
            .eq("auth_user_id", data.user.id)
            .single()

          if (!existing) {
            const fullName = [result.response.givenName, result.response.familyName].filter(Boolean).join(" ")
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
        const { error: oauthError } = await supabase.auth.signInWithOAuth({
          provider: "apple",
          options: {
            redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
          },
        })
        if (oauthError) throw oauthError
      }
    } catch (err: any) {
      if (err?.code === "1001" || err?.message?.includes("cancel")) {
        setSocialLoading(null)
        return
      }
      setError(err.message || "Error al registrarse con Apple")
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

      // Create customer record
      if (data.user) {
        await supabase.from("customers").upsert({
          auth_user_id: data.user.id,
          email: data.user.email || "",
          phone: toE164(phoneNumber),
          first_name: firstName || "",
          last_name: lastName || "",
        }, {
          onConflict: "auth_user_id"
        })
      }

      router.push(redirectTo)
      router.refresh()
    } catch (err: any) {
      setError(err.message || "Codigo invalido")
    } finally {
      setPhoneLoading(false)
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setMessage("")

    if (password !== confirmPassword) {
      setError("Las contrasenas no coinciden")
      return
    }

    if (password.length < 6) {
      setError("La contrasena debe tener al menos 6 caracteres")
      return
    }

    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            role: "customer",
          },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
        },
      })

      if (error) throw error

      // Create customer record
      if (data.user) {
        await supabase.from("customers").upsert({
          auth_user_id: data.user.id,
          email: email,
          first_name: firstName,
          last_name: lastName,
          phone: phone || null,
        }, {
          onConflict: "auth_user_id"
        })
      }

      // If session exists, user was auto-confirmed
      if (data.session) {
        router.push(redirectTo)
        router.refresh()
      } else {
        setMessage("Cuenta creada. Por favor revisa tu correo para verificar tu cuenta.")
      }
    } catch (err: any) {
      setError(err.message || "Error al crear la cuenta")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-8">
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
            <CardTitle className="text-2xl">Crear Cuenta</CardTitle>
            <CardDescription>
              Unete a FoodNetDelivery para ordenar de los mejores restaurantes
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Social Signup Buttons */}
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

          {/* Signup Method Tabs */}
          <div className="flex rounded-lg border bg-muted p-1">
            <button
              type="button"
              onClick={() => { setSignupMethod("email"); setError(""); setOtpSent(false); }}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                signupMethod === "email"
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Email
            </button>
            <button
              type="button"
              onClick={() => { setSignupMethod("phone"); setError(""); }}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                signupMethod === "phone"
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Telefono
            </button>
          </div>

          {/* Email Signup Form */}
          {signupMethod === "email" && (
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Nombre</Label>
                  <Input
                    id="firstName"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    placeholder="Juan"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Apellido</Label>
                  <Input
                    id="lastName"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    placeholder="Perez"
                  />
                </div>
              </div>

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
                <Label htmlFor="phone">Telefono (opcional)</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="787-555-1234"
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
                  minLength={6}
                  placeholder="Minimo 6 caracteres"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Contrasena</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Repite tu contrasena"
                />
              </div>

              {message && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded text-sm">
                  {message}
                </div>
              )}

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
                {loading ? "Creando cuenta..." : "Crear Cuenta"}
              </Button>
            </form>
          )}

          {/* Phone Signup Form */}
          {signupMethod === "phone" && (
            <div className="space-y-4">
              {/* Name fields for phone signup */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phoneFirstName">Nombre</Label>
                  <Input
                    id="phoneFirstName"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Juan"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phoneLastName">Apellido</Label>
                  <Input
                    id="phoneLastName"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Perez"
                  />
                </div>
              </div>

              {!otpSent ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber">Numero de Telefono</Label>
                    <Input
                      id="phoneNumber"
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
                    <Label htmlFor="signupOtp">Codigo de Verificacion</Label>
                    <Input
                      id="signupOtp"
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
                    {phoneLoading ? "Verificando..." : "Verificar y Crear Cuenta"}
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

          <p className="text-center text-xs text-muted-foreground">
            Al registrarte, aceptas nuestros{" "}
            <Link href="/terms" className="underline hover:text-foreground">
              Terminos de Servicio
            </Link>{" "}
            y{" "}
            <Link href="/privacy" className="underline hover:text-foreground">
              Politica de Privacidad
            </Link>
          </p>

          <div className="text-center text-sm text-muted-foreground">
            Ya tienes cuenta?{" "}
            <Link
              href={`/auth/customer/login${redirectTo !== "/" ? `?redirect=${encodeURIComponent(redirectTo)}` : ""}`}
              className="font-medium text-teal-600 hover:underline"
            >
              Inicia sesion
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
