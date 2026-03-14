"use client"

import { useState } from "react"
import { Send, Loader2, CheckCircle2 } from "lucide-react"

export function PartnerContactForm() {
  const [form, setForm] = useState({
    name: "",
    restaurant_name: "",
    address: "",
    email: "",
    phone: "",
  })
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle")
  const [errorMsg, setErrorMsg] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus("submitting")
    setErrorMsg("")

    try {
      const res = await fetch("/api/partner-inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Error al enviar")
      }

      setStatus("success")
      setForm({ name: "", restaurant_name: "", address: "", email: "", phone: "" })
    } catch (err) {
      setStatus("error")
      setErrorMsg(err instanceof Error ? err.message : "Error inesperado")
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50/80 p-8 text-center">
        <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-green-600" />
        <h3 className="text-xl font-bold text-green-900">Recibimos tu informacion</h3>
        <p className="mt-2 text-sm text-green-700">
          Nos pondremos en contacto contigo pronto para coordinar una demo personalizada.
        </p>
        <button
          onClick={() => setStatus("idle")}
          className="mt-6 text-sm font-medium text-green-700 underline hover:text-green-900"
        >
          Enviar otra solicitud
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="partner-name" className="mb-1.5 block text-sm font-medium text-slate-300">
            Nombre Completo <span className="text-amber-400">*</span>
          </label>
          <input
            id="partner-name"
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Tu nombre"
            className="w-full rounded-lg border border-white/20 bg-white/10 px-4 py-2.5 text-sm text-white placeholder:text-slate-400 backdrop-blur-sm focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
          />
        </div>
        <div>
          <label htmlFor="partner-restaurant" className="mb-1.5 block text-sm font-medium text-slate-300">
            Nombre del Restaurante <span className="text-amber-400">*</span>
          </label>
          <input
            id="partner-restaurant"
            type="text"
            required
            value={form.restaurant_name}
            onChange={(e) => setForm({ ...form, restaurant_name: e.target.value })}
            placeholder="Nombre del restaurante"
            className="w-full rounded-lg border border-white/20 bg-white/10 px-4 py-2.5 text-sm text-white placeholder:text-slate-400 backdrop-blur-sm focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
          />
        </div>
      </div>

      <div>
        <label htmlFor="partner-address" className="mb-1.5 block text-sm font-medium text-slate-300">
          Direccion
        </label>
        <input
          id="partner-address"
          type="text"
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
          placeholder="Direccion del restaurante"
          className="w-full rounded-lg border border-white/20 bg-white/10 px-4 py-2.5 text-sm text-white placeholder:text-slate-400 backdrop-blur-sm focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="partner-email" className="mb-1.5 block text-sm font-medium text-slate-300">
            Email <span className="text-amber-400">*</span>
          </label>
          <input
            id="partner-email"
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="tu@email.com"
            className="w-full rounded-lg border border-white/20 bg-white/10 px-4 py-2.5 text-sm text-white placeholder:text-slate-400 backdrop-blur-sm focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
          />
        </div>
        <div>
          <label htmlFor="partner-phone" className="mb-1.5 block text-sm font-medium text-slate-300">
            Telefono <span className="text-amber-400">*</span>
          </label>
          <input
            id="partner-phone"
            type="tel"
            required
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="(787) 555-1234"
            className="w-full rounded-lg border border-white/20 bg-white/10 px-4 py-2.5 text-sm text-white placeholder:text-slate-400 backdrop-blur-sm focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
          />
        </div>
      </div>

      {status === "error" && (
        <p className="rounded-lg bg-red-500/20 px-4 py-2 text-sm text-red-200">{errorMsg}</p>
      )}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-400 px-6 py-3 text-sm font-bold text-slate-900 transition-all hover:bg-amber-300 disabled:opacity-60"
      >
        {status === "submitting" ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Enviando...
          </>
        ) : (
          <>
            <Send className="h-4 w-4" />
            Enviar Solicitud
          </>
        )}
      </button>

      <p className="text-center text-xs text-slate-400">
        Te contactaremos en menos de 24 horas.
      </p>
    </form>
  )
}
