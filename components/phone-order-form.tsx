"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { createPaymentLink } from "@/app/actions/stripe"
import { Phone, Copy, CheckCircle, Plus, Minus, Trash2, Link2, ArrowLeft } from "lucide-react"

interface PhoneOrderFormProps {
  restaurantId: string
  menuItems: any[]
  branches: any[]
  taxRate: number
  onClose: () => void
}

export default function PhoneOrderForm({
  restaurantId,
  menuItems,
  branches,
  taxRate,
  onClose,
}: PhoneOrderFormProps) {
  const { toast } = useToast()
  const [step, setStep] = useState<"info" | "menu" | "review">("info")
  const [generating, setGenerating] = useState(false)
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Customer info
  const [customerInfo, setCustomerInfo] = useState({
    name: "",
    phone: "",
    email: "",
    orderType: "delivery" as "delivery" | "pickup",
    branchId: branches.length === 1 ? branches[0].id : "",
    streetAddress: "",
    streetAddress2: "",
    city: "",
    state: "PR",
    zip: "",
    eventDate: "",
    eventTime: "",
    specialInstructions: "",
  })

  // Cart
  const [cart, setCart] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")

  // Filter menu items by search
  const filteredItems = menuItems.filter(
    (item) =>
      item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Add item to cart
  const addToCart = (item: any) => {
    const existing = cart.find((c) => c.id === item.id)
    if (existing) {
      setCart(cart.map((c) => (c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c)))
    } else {
      setCart([...cart, { id: item.id, name: item.name, price: Number(item.price) || 0, quantity: 1, description: item.description }])
    }
  }

  const updateQuantity = (id: string, delta: number) => {
    setCart(
      cart
        .map((c) => (c.id === id ? { ...c, quantity: c.quantity + delta } : c))
        .filter((c) => c.quantity > 0)
    )
  }

  const removeFromCart = (id: string) => {
    setCart(cart.filter((c) => c.id !== id))
  }

  // Calculations
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const tax = subtotal * (taxRate / 100)
  const total = subtotal + tax

  // Generate payment link
  const handleGenerateLink = async () => {
    if (cart.length === 0) {
      toast({ title: "Carrito vacio", description: "Agrega items al carrito antes de generar el link.", variant: "destructive" })
      return
    }
    setGenerating(true)
    try {
      const orderData = {
        cart,
        subtotal,
        tax,
        deliveryFee: 0,
        tip: 0,
        total,
        orderType: customerInfo.orderType,
        eventDetails: {
          name: customerInfo.name,
          phone: customerInfo.phone,
          email: customerInfo.email,
          eventDate: customerInfo.eventDate,
          eventTime: customerInfo.eventTime,
          address: customerInfo.streetAddress,
          address2: customerInfo.streetAddress2,
          city: customerInfo.city,
          state: customerInfo.state,
          zip: customerInfo.zip,
          specialInstructions: customerInfo.specialInstructions,
        },
        includeUtensils: false,
        restaurantId,
        branchId: customerInfo.branchId || undefined,
        // Get Stripe account ID from the selected branch for Stripe Connect
        stripeAccountId: customerInfo.branchId 
          ? branches.find((b: any) => b.id === customerInfo.branchId)?.stripe_account_id || null
          : branches.length === 1 ? branches[0]?.stripe_account_id || null : null,
      }

      const result = await createPaymentLink(orderData)
      if (result.paymentUrl) {
        setPaymentUrl(result.paymentUrl)
        toast({ title: "Link generado", description: "Puedes copiar el link y enviarlo al cliente." })
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "No se pudo generar el link de pago.", variant: "destructive" })
    } finally {
      setGenerating(false)
    }
  }

  const handleCopy = async () => {
    if (paymentUrl) {
      await navigator.clipboard.writeText(paymentUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast({ title: "Copiado", description: "Link de pago copiado al portapapeles." })
    }
  }

  // If payment link is generated, show the result
  if (paymentUrl) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Phone className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-bold">Link de Pago Generado</h2>
        </div>

        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle className="w-5 h-5" />
              <span className="font-semibold">Listo para enviar al cliente</span>
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-gray-600">Cliente</Label>
              <p className="font-medium">{customerInfo.name} - {customerInfo.phone}</p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-gray-600">Total</Label>
              <p className="text-2xl font-bold">${total.toFixed(2)}</p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-gray-600">Link de Pago</Label>
              <div className="flex gap-2">
                <Input value={paymentUrl} readOnly className="bg-white text-sm" />
                <Button onClick={handleCopy} variant="outline" size="sm">
                  {copied ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-gray-500">Este link expira en 24 horas.</p>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => { setPaymentUrl(null); setCart([]); setStep("info"); setCustomerInfo({ ...customerInfo, name: "", phone: "", email: "", streetAddress: "", streetAddress2: "", city: "", zip: "", eventDate: "", eventTime: "", specialInstructions: "" }) }}>
            Nueva Orden
          </Button>
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Phone className="w-6 h-6 text-blue-600" />
        <h2 className="text-xl font-bold">Orden por Telefono</h2>
      </div>

      {/* Step indicators */}
      <div className="flex gap-2">
        {(["info", "menu", "review"] as const).map((s, i) => (
          <button
            key={s}
            onClick={() => {
              if (s === "info") setStep("info")
              if (s === "menu" && customerInfo.name && customerInfo.phone) setStep("menu")
              if (s === "review" && cart.length > 0) setStep("review")
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              step === s ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">{i + 1}</span>
            {s === "info" ? "Info Cliente" : s === "menu" ? "Menu" : "Revisar"}
          </button>
        ))}
      </div>

      {/* STEP 1: Customer Info */}
      {step === "info" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Informacion del Cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nombre *</Label>
                <Input
                  value={customerInfo.name}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                  placeholder="Nombre del cliente"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Telefono *</Label>
                <Input
                  value={customerInfo.phone}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                  placeholder="787-555-1234"
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label>Email (para el link de pago)</Label>
              <Input
                value={customerInfo.email}
                onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                placeholder="cliente@email.com"
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo de Orden *</Label>
                <select
                  value={customerInfo.orderType}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, orderType: e.target.value as "delivery" | "pickup" })}
                  className="mt-1 w-full border rounded-md px-3 py-2 text-sm"
                >
                  <option value="delivery">Delivery</option>
                  <option value="pickup">Pick-Up</option>
                </select>
              </div>
              {branches.length > 1 && (
              <div>
                <Label>Sucursal *</Label>
                <select
                    value={customerInfo.branchId}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, branchId: e.target.value })}
                    className="mt-1 w-full border rounded-md px-3 py-2 text-sm"
                  >
                    <option value="">Seleccionar...</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {customerInfo.orderType === "delivery" && (
              <div className="space-y-3 pt-2 border-t">
                <Label className="text-sm font-semibold text-gray-700">Direccion de Entrega</Label>
                <div>
                  <Label className="text-xs text-gray-500">Direccion Linea 1 *</Label>
                  <Input
                    value={customerInfo.streetAddress}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, streetAddress: e.target.value })}
                    placeholder="Número de Casa o Edificio, Calle"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Direccion Linea 2</Label>
                  <Input
                    value={customerInfo.streetAddress2}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, streetAddress2: e.target.value })}
                    placeholder="Urbanizacion, Condominio, Apt., etc."
                    className="mt-1"
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs text-gray-500">Ciudad *</Label>
                    <Input value={customerInfo.city} onChange={(e) => setCustomerInfo({ ...customerInfo, city: e.target.value })} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Estado *</Label>
                    <Input required value={customerInfo.state} onChange={(e) => setCustomerInfo({ ...customerInfo, state: e.target.value })} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Zip *</Label>
                    <Input value={customerInfo.zip} onChange={(e) => setCustomerInfo({ ...customerInfo, zip: e.target.value })} className="mt-1" />
                  </div>
                </div>
              </div>
            )}

            {/* Detalles de la Entrega */}
            <div className="space-y-4 p-4 rounded-xl border-l-4 border-blue-600 bg-blue-50/50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-base text-blue-600">Detalles de la Entrega</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">
                    {customerInfo.orderType === "delivery" ? "Fecha del Delivery *" : "Fecha de Pick-Up *"}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {customerInfo.orderType === "delivery" ? "Entrega" : "Recogido"} requiere minimo 48 horas de anticipacion. Puedes programar hasta 21 dias de antelacion.
                  </p>
                  <Input
                    type="date"
                    required
                    value={customerInfo.eventDate}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, eventDate: e.target.value })}
                    className="w-full"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">
                    {customerInfo.orderType === "delivery" ? "Hora de Entrega Solicitada *" : "Hora de Pick-Up *"}
                  </Label>
                  <Input
                    type="time"
                    required
                    min="11:30"
                    max="21:00"
                    value={customerInfo.eventTime}
                    onChange={(e) => {
                      const val = e.target.value
                      if (val && (val < "11:30" || val > "21:00")) {
                        toast({ title: "Hora no disponible", description: "Selecciona una hora entre 11:30 AM y 9:00 PM.", variant: "destructive" })
                        setCustomerInfo({ ...customerInfo, eventTime: "" })
                        return
                      }
                      setCustomerInfo({ ...customerInfo, eventTime: val })
                    }}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">Horario: 11:30 AM - 9:00 PM</p>
                </div>
              </div>
            </div>

            <div>
              <Label>Instrucciones Especiales</Label>
              <textarea
                value={customerInfo.specialInstructions}
                onChange={(e) => setCustomerInfo({ ...customerInfo, specialInstructions: e.target.value })}
                placeholder="Notas adicionales..."
                className="mt-1 w-full border rounded-md px-3 py-2 text-sm min-h-[60px]"
              />
            </div>

            <Button
              onClick={() => {
                if (!customerInfo.name || !customerInfo.phone) {
                  toast({ title: "Campos requeridos", description: "Nombre y telefono son requeridos.", variant: "destructive" })
                  return
                }
                if (branches.length > 1 && !customerInfo.branchId) {
                  toast({ title: "Campos requeridos", description: "Selecciona una sucursal.", variant: "destructive" })
                  return
                }
                if (customerInfo.orderType === "delivery" && (!customerInfo.streetAddress || !customerInfo.city || !customerInfo.state || !customerInfo.zip)) {
                  toast({ title: "Campos requeridos", description: "Completa la direccion de entrega.", variant: "destructive" })
                  return
                }
                if (!customerInfo.eventDate || !customerInfo.eventTime) {
                  toast({ title: "Campos requeridos", description: "Fecha y hora son requeridos.", variant: "destructive" })
                  return
                }
                if (customerInfo.eventTime < "11:30" || customerInfo.eventTime > "21:00") {
                  toast({ title: "Hora no disponible", description: "Selecciona una hora entre 11:30 AM y 9:00 PM.", variant: "destructive" })
                  return
                }
                setStep("menu")
              }}
              className="w-full"
            >
              Continuar al Menu
            </Button>
          </CardContent>
        </Card>
      )}

      {/* STEP 2: Menu Selection */}
      {step === "menu" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <button onClick={() => setStep("info")} className="text-blue-600 hover:text-blue-800">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <span className="text-sm text-gray-500">Orden para: <strong>{customerInfo.name}</strong></span>
          </div>

          {/* Search */}
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar item del menu..."
            className="w-full"
          />

          {/* Cart summary bar */}
          {cart.length > 0 && (
            <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
              <span className="text-sm font-medium text-blue-800">
                {cart.reduce((s, c) => s + c.quantity, 0)} items - ${subtotal.toFixed(2)}
              </span>
              <Button size="sm" onClick={() => setStep("review")}>
                Revisar Orden
              </Button>
            </div>
          )}

          {/* Menu items grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-1">
            {filteredItems.map((item) => {
              const inCart = cart.find((c) => c.id === item.id)
              return (
                <Card key={item.id} className={`cursor-pointer transition-all hover:shadow-md ${inCart ? "border-blue-400 bg-blue-50/50" : ""}`}>
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">{item.name}</h4>
                        {item.description && <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{item.description}</p>}
                        <p className="text-sm font-semibold mt-1">${Number(item.price || 0).toFixed(2)}</p>
                      </div>
                      {inCart ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => updateQuantity(item.id, -1)} className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300">
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-6 text-center text-sm font-bold">{inCart.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, 1)} className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700">
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => addToCart(item)} className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 shrink-0">
                          <Plus className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* STEP 3: Review & Generate Link */}
      {step === "review" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <button onClick={() => setStep("menu")} className="text-blue-600 hover:text-blue-800">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <span className="text-sm text-gray-500">Revisar Orden</span>
          </div>

          {/* Customer summary */}
          <Card>
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold">{customerInfo.name}</p>
                  <p className="text-sm text-gray-600">{customerInfo.phone}</p>
                  {customerInfo.email && <p className="text-sm text-gray-600">{customerInfo.email}</p>}
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${customerInfo.orderType === "delivery" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>
                  {customerInfo.orderType === "delivery" ? "Delivery" : "Pick-Up"}
                </span>
              </div>
              {customerInfo.orderType === "delivery" && customerInfo.streetAddress && (
                <p className="text-sm text-gray-500 mt-2">
                  {customerInfo.streetAddress}{customerInfo.streetAddress2 ? `, ${customerInfo.streetAddress2}` : ""}, {customerInfo.city}, {customerInfo.state} {customerInfo.zip}
                </p>
              )}
              {customerInfo.eventDate && (
                <p className="text-sm text-gray-500 mt-1">Fecha: {customerInfo.eventDate} {customerInfo.eventTime}</p>
              )}
            </CardContent>
          </Card>

          {/* Cart items */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Items ({cart.reduce((s, c) => s + c.quantity, 0)})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {cart.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-gray-500">${item.price.toFixed(2)} x {item.quantity}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold">${(item.price * item.quantity).toFixed(2)}</span>
                    <button onClick={() => removeFromCart(item.id)} className="text-red-400 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Totals */}
          <Card>
            <CardContent className="p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Tax ({taxRate}%)</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Generate link button */}
          <Button onClick={handleGenerateLink} disabled={generating} className="w-full gap-2" size="lg">
            <Link2 className="w-5 h-5" />
            {generating ? "Generando..." : "Generar Link de Pago"}
          </Button>
          <p className="text-xs text-center text-gray-500">
            Se generara un link de Stripe que puedes enviar al cliente por texto o email. El link expira en 24 horas.
          </p>
        </div>
      )}
    </div>
  )
}
