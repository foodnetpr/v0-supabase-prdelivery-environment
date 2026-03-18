"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { createPaymentLink } from "@/app/actions/stripe"
import { Phone, Copy, CheckCircle, Plus, Minus, Trash2, Link2, ArrowLeft, CreditCard, Smartphone, Search, User, MapPin, Clock, RotateCcw } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface CartItem {
  id: string
  itemId?: string
  name: string
  price: number
  quantity: number
  description?: string
  selectedOptions?: Record<string, string>
  customizations?: Record<string, string | string[]>
}

interface PhoneOrderFormProps {
  restaurantId: string
  menuItems: any[]
  branches: any[]
  taxRate: number
  onClose: () => void
  externalCart?: CartItem[]
  setExternalCart?: (cart: CartItem[]) => void
}

export default function PhoneOrderForm({
  restaurantId,
  menuItems,
  branches,
  taxRate,
  onClose,
  externalCart,
  setExternalCart,
}: PhoneOrderFormProps) {
  const { toast } = useToast()
  // If using external cart, start at info step (menu is shown separately in CSR Portal)
  const [step, setStep] = useState<"info" | "menu" | "review">(externalCart ? "info" : "info")
  const [generating, setGenerating] = useState(false)
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  
  // Payment method state
  const [paymentMethod, setPaymentMethod] = useState<"link" | "card" | "athmovil">("link")
  const [cardDetails, setCardDetails] = useState({
    number: "",
    expiry: "",
    cvc: "",
    name: "",
  })
  const [athMovilPhone, setAthMovilPhone] = useState("")
  const [paymentProcessed, setPaymentProcessed] = useState(false)
  
  // Customer lookup state
  const [lookingUpCustomer, setLookingUpCustomer] = useState(false)
  const [foundCustomer, setFoundCustomer] = useState<any>(null)
  const [savedAddresses, setSavedAddresses] = useState<any[]>([])
  const [savedPaymentMethods, setSavedPaymentMethods] = useState<any[]>([])
  const [recentOrders, setRecentOrders] = useState<any[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null)
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string | null>(null)
  const [saveCustomerData, setSaveCustomerData] = useState(true)

  // Calculate default date (today) and time (45 min from now) in Puerto Rico timezone
  const getDefaultDateTime = () => {
    const now = new Date()
    const prFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Puerto_Rico',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    const prParts = prFormatter.formatToParts(now)
    const year = prParts.find(p => p.type === 'year')?.value || ''
    const month = prParts.find(p => p.type === 'month')?.value || ''
    const day = prParts.find(p => p.type === 'day')?.value || ''
    const hour = parseInt(prParts.find(p => p.type === 'hour')?.value || '0')
    const minute = parseInt(prParts.find(p => p.type === 'minute')?.value || '0')
    
    // Add 45 minutes
    let newMinute = minute + 45
    let newHour = hour
    if (newMinute >= 60) {
      newMinute -= 60
      newHour += 1
    }
    if (newHour >= 24) {
      newHour -= 24
    }
    
    const defaultDate = `${year}-${month}-${day}`
    const defaultTime = `${newHour.toString().padStart(2, '0')}:${newMinute.toString().padStart(2, '0')}`
    
    return { defaultDate, defaultTime }
  }
  
  const { defaultDate, defaultTime } = getDefaultDateTime()

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
    eventDate: defaultDate,
    eventTime: defaultTime,
    specialInstructions: "",
  })

  // Cart - use external cart if provided, otherwise use internal state
  const [internalCart, setInternalCart] = useState<CartItem[]>([])
  const cart = externalCart ?? internalCart
  const setCart = setExternalCart ?? setInternalCart
  const [searchTerm, setSearchTerm] = useState("")

  // Customer lookup function
  const handleCustomerLookup = async () => {
    if (!customerInfo.phone && !customerInfo.email) {
      toast({ title: "Informacion requerida", description: "Ingresa telefono o email para buscar cliente.", variant: "destructive" })
      return
    }
    
    setLookingUpCustomer(true)
    try {
      const params = new URLSearchParams()
      if (customerInfo.phone) params.set("phone", customerInfo.phone)
      if (customerInfo.email) params.set("email", customerInfo.email)
      params.set("restaurantId", restaurantId)
      
      const response = await fetch(`/api/csr/customer-lookup?${params}`)
      const data = await response.json()
      
      if (data.customer) {
        setFoundCustomer(data.customer)
        setSavedAddresses(data.addresses || [])
        setSavedPaymentMethods(data.paymentMethods || [])
        setRecentOrders(data.recentOrders || [])
        
        // Auto-fill customer info
        setCustomerInfo(prev => ({
          ...prev,
          name: data.customer.name || prev.name,
          email: data.customer.email || prev.email,
          phone: data.customer.phone || prev.phone,
        }))
        
        // Auto-select default address if available
        if (data.addresses?.length > 0) {
          const defaultAddress = data.addresses.find((a: any) => a.is_default) || data.addresses[0]
          setSelectedAddressId(defaultAddress.id)
          setCustomerInfo(prev => ({
            ...prev,
            streetAddress: defaultAddress.street_address || "",
            streetAddress2: defaultAddress.street_address_2 || "",
            city: defaultAddress.city || "",
            state: defaultAddress.state || "PR",
            zip: defaultAddress.zip || "",
          }))
        }
        
        // Auto-select default payment method if available
        if (data.paymentMethods?.length > 0) {
          const defaultPM = data.paymentMethods.find((pm: any) => pm.is_default) || data.paymentMethods[0]
          setSelectedPaymentMethodId(defaultPM.id)
        }
        
        toast({ title: "Cliente encontrado", description: `${data.customer.name} - ${data.recentOrders?.length || 0} ordenes previas` })
      } else {
        setFoundCustomer(null)
        setSavedAddresses([])
        setSavedPaymentMethods([])
        setRecentOrders([])
        toast({ title: "Cliente nuevo", description: "No se encontro cliente con esa informacion. Se creara uno nuevo." })
      }
    } catch (error) {
      console.error("Customer lookup error:", error)
      toast({ title: "Error", description: "No se pudo buscar el cliente.", variant: "destructive" })
    } finally {
      setLookingUpCustomer(false)
    }
  }

  // Handle reorder from past order
  const handleReorder = (order: any) => {
    if (order.items && Array.isArray(order.items)) {
      const reorderCart = order.items.map((item: any) => ({
        id: item.id || item.menuItemId,
        name: item.name,
        price: Number(item.price) || 0,
        quantity: item.quantity || 1,
        description: item.description || "",
        selectedOptions: item.selectedOptions || [],
      }))
      setCart(reorderCart)
      setStep("review")
      toast({ title: "Orden cargada", description: `Se cargaron ${reorderCart.length} items de la orden anterior.` })
    }
  }

  // Handle address selection
  const handleAddressSelect = (addressId: string) => {
    setSelectedAddressId(addressId)
    const address = savedAddresses.find(a => a.id === addressId)
    if (address) {
      setCustomerInfo(prev => ({
        ...prev,
        streetAddress: address.street_address || "",
        streetAddress2: address.street_address_2 || "",
        city: address.city || "",
        state: address.state || "PR",
        zip: address.zip || "",
      }))
    }
  }

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

  // Process credit card payment directly
  const handleProcessCard = async () => {
    if (!cardDetails.number || !cardDetails.expiry || !cardDetails.cvc || !cardDetails.name) {
      toast({ title: "Datos incompletos", description: "Completa todos los campos de la tarjeta.", variant: "destructive" })
      return
    }
    
    setGenerating(true)
    try {
      const [expMonth, expYear] = cardDetails.expiry.split("/").map(s => s.trim())
      
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
        stripeAccountId: customerInfo.branchId 
          ? branches.find((b: any) => b.id === customerInfo.branchId)?.stripe_account_id || null
          : branches.length === 1 ? branches[0]?.stripe_account_id || null : null,
        paymentMethod: "card",
        cardDetails: {
          number: cardDetails.number.replace(/\s/g, ""),
          expMonth: parseInt(expMonth),
          expYear: parseInt(expYear.length === 2 ? `20${expYear}` : expYear),
          cvc: cardDetails.cvc,
          name: cardDetails.name,
        },
        // Customer management
        customerId: foundCustomer?.id || null,
        customerAddressId: selectedAddressId || null,
        saveCustomerData: !foundCustomer && saveCustomerData,
      }

      const response = await fetch("/api/csr/process-card-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      })

      const result = await response.json()
      
      if (result.success) {
        setPaymentProcessed(true)
        toast({ title: "Pago procesado", description: "El pago fue procesado exitosamente." })
      } else {
        toast({ title: "Error", description: result.error || "No se pudo procesar el pago.", variant: "destructive" })
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "No se pudo procesar el pago.", variant: "destructive" })
    } finally {
      setGenerating(false)
    }
  }

  // Process ATH Movil payment
  const handleAthMovil = async () => {
    if (!athMovilPhone) {
      toast({ title: "Telefono requerido", description: "Ingresa el telefono ATH Movil del cliente.", variant: "destructive" })
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
        paymentMethod: "athmovil",
        athMovilPhone,
        // Customer management
        customerId: foundCustomer?.id || null,
        customerAddressId: selectedAddressId || null,
        saveCustomerData: !foundCustomer && saveCustomerData,
      }

      const response = await fetch("/api/csr/process-card-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      })

      const result = await response.json()
      
      if (result.success) {
        setPaymentProcessed(true)
        toast({ title: "Orden creada", description: "Se envio la solicitud de pago ATH Movil al cliente." })
      } else {
        toast({ title: "Error", description: result.error || "No se pudo crear la orden.", variant: "destructive" })
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "No se pudo crear la orden.", variant: "destructive" })
    } finally {
      setGenerating(false)
    }
  }

  // Format card number with spaces
  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "")
    const matches = v.match(/\d{4,16}/g)
    const match = (matches && matches[0]) || ""
    const parts = []
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4))
    }
    return parts.length ? parts.join(" ") : value
  }

  // If payment was processed or link generated, show the result
  if (paymentUrl || paymentProcessed) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Phone className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-bold">
            {paymentProcessed ? "Orden Completada" : "Link de Pago Generado"}
          </h2>
        </div>

        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle className="w-5 h-5" />
              <span className="font-semibold">
                {paymentProcessed 
                  ? (paymentMethod === "card" ? "Pago procesado exitosamente" : "Solicitud ATH Movil enviada")
                  : "Listo para enviar al cliente"}
              </span>
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-gray-600">Cliente</Label>
              <p className="font-medium">{customerInfo.name} - {customerInfo.phone}</p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-gray-600">Total</Label>
              <p className="text-2xl font-bold">${total.toFixed(2)}</p>
            </div>

            {paymentUrl && (
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
            )}
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => { 
            setPaymentUrl(null)
            setPaymentProcessed(false)
            setCart([])
            setStep("info")
            setPaymentMethod("link")
            setCardDetails({ number: "", expiry: "", cvc: "", name: "" })
            setAthMovilPhone("")
            setCustomerInfo({ ...customerInfo, name: "", phone: "", email: "", streetAddress: "", streetAddress2: "", city: "", zip: "", eventDate: "", eventTime: "", specialInstructions: "" }) 
          }}>
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

      {/* Step indicators - hide menu step when using external cart */}
      <div className="flex gap-2">
        {(externalCart ? ["info", "review"] as const : ["info", "menu", "review"] as const).map((s, i) => (
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
        <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="w-4 h-4" />
              Informacion del Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Phone lookup row */}
            <div className="flex gap-2">
              <div className="flex-1">
                <Label>Telefono *</Label>
                <Input
                  value={customerInfo.phone}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                  placeholder="787-555-1234"
                  className="mt-1"
                />
              </div>
              <div className="flex items-end">
                <Button 
                  type="button"
                  variant="outline"
                  onClick={handleCustomerLookup}
                  disabled={lookingUpCustomer}
                  className="gap-2"
                >
                  <Search className="w-4 h-4" />
                  {lookingUpCustomer ? "Buscando..." : "Buscar"}
                </Button>
              </div>
            </div>

            {/* Found customer indicator */}
            {foundCustomer && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-800">Cliente encontrado: {foundCustomer.name}</p>
                  <p className="text-xs text-green-600">{savedAddresses.length} direcciones guardadas · {recentOrders.length} ordenes previas</p>
                </div>
              </div>
            )}

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
                <Label>Email (para el link de pago)</Label>
                <Input
                  value={customerInfo.email}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                  placeholder="cliente@email.com"
                  className="mt-1"
                />
              </div>
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
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Direccion de Entrega
                  </Label>
                  {savedAddresses.length > 0 && (
                    <Select value={selectedAddressId || ""} onValueChange={handleAddressSelect}>
                      <SelectTrigger className="w-48 h-8 text-xs">
                        <SelectValue placeholder="Direccion guardada..." />
                      </SelectTrigger>
                      <SelectContent>
                        {savedAddresses.map((addr) => (
                          <SelectItem key={addr.id} value={addr.id}>
                            {addr.label || addr.street_address.substring(0, 25)}...
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
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

            {/* Save customer data checkbox */}
            {!foundCustomer && (
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="saveCustomer"
                  checked={saveCustomerData}
                  onChange={(e) => setSaveCustomerData(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="saveCustomer" className="text-sm text-gray-600 cursor-pointer">
                  Guardar informacion del cliente para futuras ordenes
                </Label>
              </div>
            )}

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
                // Skip to review if using external cart (menu shown separately)
                setStep(externalCart ? "review" : "menu")
              }}
              className="w-full"
            >
              {externalCart ? "Revisar Orden" : "Continuar al Menu"}
            </Button>
          </CardContent>
        </Card>

        {/* Recent Orders Section */}
        {recentOrders.length > 0 && (
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Ordenes Recientes
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {recentOrders.slice(0, 5).map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-2 border rounded-lg hover:bg-gray-50">
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        #{order.order_number} - ${Number(order.total).toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(order.created_at).toLocaleDateString('es-PR')} · {order.items?.length || 0} items
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReorder(order)}
                      className="gap-1 text-xs"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Reordenar
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
        </div>
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
                <div key={item.id} className="flex items-start justify-between py-2 border-b last:border-0">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.name}</p>
                    {/* Show selected options/modifications */}
                    {item.selectedOptions && Object.keys(item.selectedOptions).length > 0 && (
                      <div className="mt-0.5">
                        {Object.entries(item.selectedOptions).map(([category, value]) => (
                          <p key={category} className="text-xs text-blue-600 italic">
                            {value}
                          </p>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-gray-500 mt-0.5">${item.price.toFixed(2)} x {item.quantity}</p>
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

          {/* Payment Method Selector */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Metodo de Pago</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Payment method options */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setPaymentMethod("link")}
                  className={`p-3 rounded-lg border-2 text-center transition-all ${
                    paymentMethod === "link" 
                      ? "border-blue-500 bg-blue-50 text-blue-700" 
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <Link2 className="w-5 h-5 mx-auto mb-1" />
                  <span className="text-xs font-medium">Enviar Link</span>
                </button>
                <button
                  onClick={() => setPaymentMethod("card")}
                  className={`p-3 rounded-lg border-2 text-center transition-all ${
                    paymentMethod === "card" 
                      ? "border-blue-500 bg-blue-50 text-blue-700" 
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <CreditCard className="w-5 h-5 mx-auto mb-1" />
                  <span className="text-xs font-medium">Tarjeta</span>
                </button>
                <button
                  onClick={() => setPaymentMethod("athmovil")}
                  className={`p-3 rounded-lg border-2 text-center transition-all ${
                    paymentMethod === "athmovil" 
                      ? "border-blue-500 bg-blue-50 text-blue-700" 
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <Smartphone className="w-5 h-5 mx-auto mb-1" />
                  <span className="text-xs font-medium">ATH Movil</span>
                </button>
              </div>

              {/* Payment Link Option */}
              {paymentMethod === "link" && (
                <div className="space-y-3 pt-2">
                  <p className="text-sm text-gray-600">
                    Se generara un link de Stripe que puedes enviar al cliente por texto o email. El link expira en 24 horas.
                  </p>
                  <Button onClick={handleGenerateLink} disabled={generating} className="w-full gap-2" size="lg">
                    <Link2 className="w-5 h-5" />
                    {generating ? "Generando..." : "Generar Link de Pago"}
                  </Button>
                </div>
              )}

              {/* Credit Card Option */}
              {paymentMethod === "card" && (
                <div className="space-y-3 pt-2">
                  <div>
                    <Label className="text-sm">Numero de Tarjeta</Label>
                    <Input
                      value={cardDetails.number}
                      onChange={(e) => setCardDetails({ ...cardDetails, number: formatCardNumber(e.target.value) })}
                      placeholder="4242 4242 4242 4242"
                      maxLength={19}
                      className="mt-1 font-mono"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-sm">Expiracion</Label>
                      <Input
                        value={cardDetails.expiry}
                        onChange={(e) => {
                          let v = e.target.value.replace(/[^0-9]/g, "")
                          if (v.length >= 2) v = v.slice(0, 2) + "/" + v.slice(2)
                          setCardDetails({ ...cardDetails, expiry: v.slice(0, 5) })
                        }}
                        placeholder="MM/YY"
                        maxLength={5}
                        className="mt-1 font-mono"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">CVC</Label>
                      <Input
                        value={cardDetails.cvc}
                        onChange={(e) => setCardDetails({ ...cardDetails, cvc: e.target.value.replace(/[^0-9]/g, "").slice(0, 4) })}
                        placeholder="123"
                        maxLength={4}
                        className="mt-1 font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm">Nombre en Tarjeta</Label>
                    <Input
                      value={cardDetails.name}
                      onChange={(e) => setCardDetails({ ...cardDetails, name: e.target.value })}
                      placeholder="John Doe"
                      className="mt-1"
                    />
                  </div>
                  <Button onClick={handleProcessCard} disabled={generating} className="w-full gap-2" size="lg">
                    <CreditCard className="w-5 h-5" />
                    {generating ? "Procesando..." : `Procesar Pago $${total.toFixed(2)}`}
                  </Button>
                  <p className="text-xs text-center text-gray-500">
                    El pago se procesara inmediatamente via Stripe.
                  </p>
                </div>
              )}

              {/* ATH Movil Option */}
              {paymentMethod === "athmovil" && (
                <div className="space-y-3 pt-2">
                  <div>
                    <Label className="text-sm">Telefono ATH Movil del Cliente</Label>
                    <Input
                      value={athMovilPhone}
                      onChange={(e) => setAthMovilPhone(e.target.value)}
                      placeholder="(787) 555-1234"
                      className="mt-1"
                    />
                  </div>
                  <Button onClick={handleAthMovil} disabled={generating} className="w-full gap-2 bg-orange-500 hover:bg-orange-600" size="lg">
                    <Smartphone className="w-5 h-5" />
                    {generating ? "Enviando..." : `Enviar Solicitud ATH Movil $${total.toFixed(2)}`}
                  </Button>
                  <p className="text-xs text-center text-gray-500">
                    Se enviara una solicitud de pago ATH Movil al numero indicado.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
