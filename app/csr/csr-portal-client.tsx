"use client"

import { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Phone, Search, Building2, X, ShoppingCart, Minus, Plus, Trash2, ChevronRight, ChevronLeft, LogOut, Menu, User, MapPin, Clock, CalendarIcon } from "lucide-react"
import Link from "next/link"
import { calculateDeliveryFee } from "@/app/actions/delivery-zones"

// Dynamic import for payment components
const StripeCheckout = dynamic(() => import("@/components/stripe-checkout"), { ssr: false })
const ATHMovilCheckout = dynamic(() => import("@/components/athmovil-checkout"), { ssr: false })

interface Restaurant {
  id: string
  name: string
  slug: string
  logo_url: string | null
  cuisine_type: string | null
  cuisine_types: string[] | null
  area: string | null
  tax_rate: number | null
  delivery_fee: number | null
  delivery_base_fee: number | null
  dispatch_fee_percent: number | null
  address: string | null
  city: string | null
  state: string | null
  athmovil_public_token: string | null
  athmovil_ecommerce_id: string | null
  athmovil_enabled: boolean | null
  stripe_account_id: string | null
}

interface ItemOption {
  id: string
  category: string
  prompt: string | null
  is_required: boolean
  min_selection: number | null
  max_selection: number | null
  display_type: string | null
  item_option_choices: {
    id: string
    name: string
    price_modifier: number | null
    description: string | null
  }[]
}

interface CartItem {
  id: string
  itemId: string
  name: string
  price: number
  quantity: number
  description?: string
  selectedOptions?: Record<string, string>
  customizations?: Record<string, string | string[]>
  notes?: string
}

interface CSRPortalClientProps {
  restaurants: Restaurant[]
}

// Calculate default time: today's date and current time + offset
function getDefaultDateTime(deliveryType: "delivery" | "pickup") {
  const now = new Date()
  const offsetMinutes = deliveryType === "delivery" ? 45 : 20
  now.setMinutes(now.getMinutes() + offsetMinutes)
  
  // Round to nearest 5 minutes
  const minutes = Math.ceil(now.getMinutes() / 5) * 5
  now.setMinutes(minutes)
  
  const date = now.toISOString().split("T")[0]
  const time = now.toTimeString().slice(0, 5)
  
  return { date, time }
}

export function CSRPortalClient({ restaurants }: CSRPortalClientProps) {
  const supabase = createClient()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null)
  const [menuItems, setMenuItems] = useState<any[]>([])
  const [branches, setBranches] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  
  // Left slideout - Restaurant selector (visible by default)
  const [isRestaurantPanelOpen, setIsRestaurantPanelOpen] = useState(true)
  
  // Right slideout - Cart
  const [isCartOpen, setIsCartOpen] = useState(false)
  
  // Cart state
  const [cart, setCart] = useState<CartItem[]>([])
  const [menuSearchTerm, setMenuSearchTerm] = useState("")
  
  // Item detail modal state
  const [selectedItem, setSelectedItem] = useState<any | null>(null)
  const [itemOptions, setItemOptions] = useState<ItemOption[]>([])
  const [itemCustomizations, setItemCustomizations] = useState<Record<string, string | string[]>>({})
  const [loadingOptions, setLoadingOptions] = useState(false)
  const [itemNotes, setItemNotes] = useState("")
  const [showItemNotes, setShowItemNotes] = useState(false)
  
  // Tip state
  const [tipPercentage, setTipPercentage] = useState<number>(15)
  const [customTip, setCustomTip] = useState<string>("")
  
  // IVU rate from selected restaurant
  const IVU_RATE = selectedRestaurant?.tax_rate ?? 0.115 // Default 11.5% IVU for Puerto Rico
  
  // Order processing state
  const [isProcessing, setIsProcessing] = useState(false)
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null)
  
  // Payment method state
  const [paymentMethod, setPaymentMethod] = useState<"stripe" | "ath_movil">("stripe")
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  
  // Delivery fee state (calculated from delivery zones)
  const [calculatedDeliveryFee, setCalculatedDeliveryFee] = useState<number>(0)
  const [deliveryDistance, setDeliveryDistance] = useState<number>(0)
  const [isCalculatingFee, setIsCalculatingFee] = useState(false)
  
  // Get default date/time based on delivery type
  const defaultDateTime = getDefaultDateTime("delivery")
  
  // Customer info state
  const [customerInfo, setCustomerInfo] = useState({
    phone: "",
    name: "",
    address: "",
    city: "",
    zip: "",
    deliveryType: "delivery" as "delivery" | "pickup",
    eventDate: defaultDateTime.date,
    eventTime: defaultDateTime.time,
    specialInstructions: "",
    selectedBranch: "",
  })
  
  // Update time when delivery type changes
  useEffect(() => {
    const { date, time } = getDefaultDateTime(customerInfo.deliveryType)
    setCustomerInfo(prev => ({ ...prev, eventDate: date, eventTime: time }))
  }, [customerInfo.deliveryType])

  // Filter restaurants by search
  const filteredRestaurants = restaurants.filter((r) =>
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.cuisine_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.area?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Load menu items and branches when restaurant is selected
  const selectRestaurant = async (restaurant: Restaurant) => {
    // If switching restaurants, clear the cart (can't mix items from different restaurants)
    if (selectedRestaurant && selectedRestaurant.id !== restaurant.id && cart.length > 0) {
      const confirmSwitch = window.confirm(
        `Cambiar a ${restaurant.name} vaciará el carrito actual. ¿Desea continuar?`
      )
      if (!confirmSwitch) return
      setCart([])
    }
    
    setLoading(true)
    setSelectedRestaurant(restaurant)
    // Keep restaurant panel visible by default - user can hide manually

    try {
      const { data: items } = await supabase
        .from("menu_items")
        .select("*, categories(name)")
        .eq("restaurant_id", restaurant.id)
        .eq("is_active", true)
        .order("display_order", { ascending: true })

      const { data: branchData } = await supabase
        .from("branches")
        .select("*")
        .eq("restaurant_id", restaurant.id)
        .eq("is_active", true)
        .order("display_order", { ascending: true })

      setMenuItems(items || [])
      setBranches(branchData || [])
      
      // Auto-select first branch
      if (branchData && branchData.length > 0) {
        setCustomerInfo(prev => ({ ...prev, selectedBranch: branchData[0].id }))
      }
    } catch (error) {
      console.error("Error loading restaurant data:", error)
    } finally {
      setLoading(false)
    }
  }

  const clearSelection = () => {
    setSelectedRestaurant(null)
    setMenuItems([])
    setBranches([])
    setCart([])
    setIsCartOpen(false)
    setSelectedItem(null)
    setIsRestaurantPanelOpen(true)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = "/login"
  }

  // Load item options when item is selected - FIXED: use menu_item_id
  const openItemDetail = async (item: any) => {
    setSelectedItem(item)
    setItemCustomizations({})
    setLoadingOptions(true)

    try {
      const { data: options, error } = await supabase
        .from("item_options")
        .select(`
          id,
          category,
          prompt,
          is_required,
          min_selection,
          max_selection,
          display_type,
          item_option_choices (
            id,
            name,
            price_modifier,
            description
          )
        `)
        .eq("menu_item_id", item.id)
        .order("display_order", { ascending: true })

      if (error) {
        console.error("[v0] Error fetching options:", error)
      }
      
      setItemOptions(options || [])
    } catch (error) {
      console.error("Error loading item options:", error)
      setItemOptions([])
    } finally {
      setLoadingOptions(false)
    }
  }

  // Handle option selection
  const handleOptionSelect = (optionId: string, choiceId: string, isMulti: boolean) => {
    setItemCustomizations((prev) => {
      if (isMulti) {
        const current = (prev[optionId] as string[]) || []
        if (current.includes(choiceId)) {
          return { ...prev, [optionId]: current.filter((id) => id !== choiceId) }
        }
        return { ...prev, [optionId]: [...current, choiceId] }
      }
      return { ...prev, [optionId]: choiceId }
    })
  }

  // Calculate item price with options
  const calculateItemPrice = (item: any) => {
    let price = Number(item.price) || 0
    
    Object.entries(itemCustomizations).forEach(([optionId, selection]) => {
      const option = itemOptions.find((o) => o.id === optionId)
      if (!option) return

      if (Array.isArray(selection)) {
        selection.forEach((choiceId) => {
          const choice = option.item_option_choices.find((c) => c.id === choiceId)
          if (choice?.price_modifier) {
            price += Number(choice.price_modifier)
          }
        })
      } else if (selection) {
        const choice = option.item_option_choices.find((c) => c.id === selection)
        if (choice?.price_modifier) {
          price += Number(choice.price_modifier)
        }
      }
    })

    return price
  }

  // Build selected options display string
  const buildSelectedOptionsDisplay = (): Record<string, string> => {
    const display: Record<string, string> = {}

    Object.entries(itemCustomizations).forEach(([optionId, selection]) => {
      const option = itemOptions.find((o) => o.id === optionId)
      if (!option) return

      if (Array.isArray(selection)) {
        const names = selection
          .map((choiceId) => option.item_option_choices.find((c) => c.id === choiceId)?.name)
          .filter(Boolean)
          .join(", ")
        if (names) display[option.category] = names
      } else if (selection) {
        const choice = option.item_option_choices.find((c) => c.id === selection)
        if (choice) display[option.category] = choice.name
      }
    })

    return display
  }

  // Add item to cart with options
  const addItemToCart = () => {
    if (!selectedItem) return

    // Check required options
    const missingRequired = itemOptions.filter((opt) => opt.is_required && !itemCustomizations[opt.id])
    if (missingRequired.length > 0) {
      alert(`Selecciona: ${missingRequired.map((o) => o.category || o.prompt).join(", ")}`)
      return
    }

    const itemPrice = calculateItemPrice(selectedItem)
    const selectedOptionsDisplay = buildSelectedOptionsDisplay()
    
    // Generate unique cart item ID based on item + selections + notes
    const optionsKey = JSON.stringify(itemCustomizations) + itemNotes
    const cartItemId = `${selectedItem.id}-${btoa(optionsKey)}`

    // If item has notes, always add as new item (don't combine with same item without notes)
    const existingIndex = itemNotes ? -1 : cart.findIndex((c) => c.id === cartItemId)
    
    if (existingIndex >= 0) {
      setCart(cart.map((c, i) => i === existingIndex ? { ...c, quantity: c.quantity + 1 } : c))
    } else {
      setCart([
        ...cart,
        {
          id: cartItemId,
          itemId: selectedItem.id,
          name: selectedItem.name,
          price: itemPrice,
          quantity: 1,
          description: selectedItem.description,
          selectedOptions: selectedOptionsDisplay,
          customizations: { ...itemCustomizations },
          notes: itemNotes || undefined,
        },
      ])
    }

    setSelectedItem(null)
    setItemNotes("")
    setShowItemNotes(false)
    setItemOptions([])
    setItemCustomizations({})
    setIsCartOpen(true)
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

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0)
  
  // Delivery fee comes from calculated delivery zones (or 0 if not calculated yet)
  const DELIVERY_FEE = calculatedDeliveryFee
  const DISPATCH_FEE_PERCENT = selectedRestaurant?.dispatch_fee_percent ?? 0
  const DISPATCH_FEE = subtotal * (DISPATCH_FEE_PERCENT / 100)
  
  // Calculate delivery fee when address changes
  useEffect(() => {
    const calculateFee = async () => {
      if (!selectedRestaurant || customerInfo.deliveryType !== "delivery") {
        setCalculatedDeliveryFee(0)
        setDeliveryDistance(0)
        return
      }
      
      // Need full address to calculate
      if (!customerInfo.address || !customerInfo.city) {
        setCalculatedDeliveryFee(0)
        setDeliveryDistance(0)
        return
      }
      
      setIsCalculatingFee(true)
      try {
        // Get restaurant address from the selected branch or restaurant
        const restaurantAddress = selectedRestaurant.address || 
          `${selectedRestaurant.city || ""}, ${selectedRestaurant.state || "PR"}`
        
        const deliveryAddress = `${customerInfo.address}, ${customerInfo.city}, PR ${customerInfo.zip || ""}`
        
        const result = await calculateDeliveryFee({
          restaurantId: selectedRestaurant.id,
          deliveryAddress,
          restaurantAddress,
          itemCount: totalItems,
        })
        
        if (result.success) {
          setCalculatedDeliveryFee(result.fee)
          setDeliveryDistance(result.distance)
        } else {
          // Default fee if calculation fails
          setCalculatedDeliveryFee(selectedRestaurant.delivery_fee ?? 5.89)
          setDeliveryDistance(0)
        }
      } catch (error) {
        console.error("Error calculating delivery fee:", error)
        setCalculatedDeliveryFee(selectedRestaurant.delivery_fee ?? 5.89)
      } finally {
        setIsCalculatingFee(false)
      }
    }
    
    // Debounce the calculation
    const timer = setTimeout(calculateFee, 500)
    return () => clearTimeout(timer)
  }, [selectedRestaurant, customerInfo.address, customerInfo.city, customerInfo.zip, customerInfo.deliveryType, totalItems])
  
  // Process Order
  const processOrder = async () => {
    if (!selectedRestaurant || cart.length === 0 || !customerInfo.name || !customerInfo.phone) return
    
    setIsProcessing(true)
    
    try {
      // Calculate totals
      const deliveryFee = customerInfo.deliveryType === "delivery" ? DELIVERY_FEE : 0
      const dispatchFee = customerInfo.deliveryType === "delivery" ? DISPATCH_FEE : 0
      const ivu = subtotal * IVU_RATE
      const tipAmount = customTip ? parseFloat(customTip) || 0 : (subtotal * tipPercentage / 100)
      const total = subtotal + deliveryFee + dispatchFee + ivu + tipAmount
      
      // Generate order number (CSR prefix + timestamp)
      const orderNumber = `CSR-${Date.now().toString(36).toUpperCase()}`
      
      // Create order
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          restaurant_id: selectedRestaurant.id,
          branch_id: customerInfo.selectedBranch || null,
          order_number: orderNumber,
          customer_name: customerInfo.name,
          customer_phone: customerInfo.phone,
          customer_email: "",
          delivery_type: customerInfo.deliveryType,
          delivery_address: customerInfo.deliveryType === "delivery" ? customerInfo.address : null,
          delivery_city: customerInfo.deliveryType === "delivery" ? customerInfo.city : null,
          delivery_zip: customerInfo.deliveryType === "delivery" ? customerInfo.zip : null,
          delivery_date: customerInfo.eventDate,
          special_instructions: customerInfo.specialInstructions ? `[Pago: ${paymentMethod === "stripe" ? "Tarjeta" : "ATH Movil"}] ${customerInfo.specialInstructions}` : `[Pago: ${paymentMethod === "stripe" ? "Tarjeta" : "ATH Movil"}]`,
          subtotal: subtotal,
          tax: ivu,
          delivery_fee: deliveryFee + dispatchFee,
          tip: tipAmount,
          total: total,
          status: "pending",
          order_source: "csr",
        })
        .select()
        .single()
      
      if (orderError) throw orderError
      
      // Create order items
      const orderItems = cart.map((item) => ({
        order_id: order.id,
        menu_item_id: item.itemId,
        item_name: item.name,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.price * item.quantity,
        selected_options: {
          options: item.selectedOptions || {},
          notes: item.notes || "",
        },
      }))
      
      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems)
      
      if (itemsError) throw itemsError
      
      // Success - reset form
      setOrderSuccess(orderNumber)
      setCart([])
      setCustomerInfo({
        phone: "",
        name: "",
        address: "",
        city: "",
        zip: "",
        deliveryType: "delivery",
        eventDate: getDefaultDateTime("delivery").date,
        eventTime: getDefaultDateTime("delivery").time,
        specialInstructions: "",
        selectedBranch: "",
      })
      setTipPercentage(15)
      setCustomTip("")
      
      // Clear success message after 5 seconds
      setTimeout(() => setOrderSuccess(null), 5000)
      
    } catch (error) {
      console.error("Error processing order:", error)
      alert("Error al procesar la orden. Por favor intente nuevamente.")
    } finally {
      setIsProcessing(false)
    }
  }

  // Filter menu items
  const filteredMenuItems = menuItems.filter((item) =>
    item.name.toLowerCase().includes(menuSearchTerm.toLowerCase()) ||
    item.description?.toLowerCase().includes(menuSearchTerm.toLowerCase())
  )

  // Group menu items by category
  const groupedItems = filteredMenuItems.reduce((acc, item) => {
    const cat = item.categories?.name || "Otros"
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(item)
    return acc
  }, {} as Record<string, any[]>)

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <header className="bg-slate-800 text-white sticky top-0 z-50">
        <div className="px-2 h-10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsRestaurantPanelOpen(!isRestaurantPanelOpen)}
              className="p-1 hover:bg-slate-700 rounded"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-rose-400" />
              <span className="text-xs font-bold">CSR Portal</span>
            </div>
            {selectedRestaurant && (
              <span className="text-xs text-slate-300 ml-2">
                | {selectedRestaurant.name}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {selectedRestaurant && (
              <button
                onClick={() => setIsCartOpen(true)}
                className="relative p-1.5 hover:bg-slate-700 rounded flex items-center gap-1"
              >
                <ShoppingCart className="w-4 h-4" />
                <span className="text-xs">${subtotal.toFixed(2)}</span>
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {totalItems}
                  </span>
                )}
              </button>
            )}
            <Link href="/super-admin" className="text-[10px] text-slate-400 hover:text-white">
              Admin
            </Link>
            <button onClick={handleLogout} className="text-[10px] text-slate-400 hover:text-white flex items-center gap-0.5">
              <LogOut className="w-3 h-3" />
              Salir
            </button>
          </div>
        </div>
      </header>

      {/* Main Layout - Everything visible at once */}
      <div className="flex h-[calc(100vh-40px)]">
        
        {/* LEFT SLIDEOUT: Restaurant Selector (visible by default with collapse arrow) */}
        <div className={`bg-white border-r border-slate-200 transition-all duration-300 overflow-hidden flex-shrink-0 relative ${
          isRestaurantPanelOpen ? "w-48" : "w-0"
        }`}>
          {/* Collapse arrow */}
          {isRestaurantPanelOpen && (
            <button
              onClick={() => setIsRestaurantPanelOpen(false)}
              className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-6 h-12 bg-white border border-slate-200 rounded-r-lg flex items-center justify-center hover:bg-slate-50 shadow-sm"
            >
              <ChevronLeft className="w-4 h-4 text-slate-500" />
            </button>
          )}
          <div className="w-48 h-full flex flex-col">
            <div className="p-2 border-b border-slate-200">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar..."
                  className="pl-6 h-7 text-xs"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {filteredRestaurants.map((restaurant) => (
                <button
                  key={restaurant.id}
                  className={`w-full text-left px-2 py-1.5 text-xs border-b border-slate-100 hover:bg-rose-50 transition-colors ${
                    selectedRestaurant?.id === restaurant.id ? "bg-rose-100 text-rose-700 font-medium" : "text-slate-700"
                  }`}
                  onClick={() => selectRestaurant(restaurant)}
                >
                  <div className="truncate font-medium">{restaurant.name}</div>
                  {restaurant.area && (
                    <div className="text-[10px] text-slate-400 truncate">{restaurant.area}</div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Expand arrow when restaurant panel is collapsed */}
        {!isRestaurantPanelOpen && (
          <button
            onClick={() => setIsRestaurantPanelOpen(true)}
            className="w-6 h-12 bg-white border border-slate-200 rounded-r-lg flex items-center justify-center hover:bg-slate-50 shadow-sm self-center flex-shrink-0"
          >
            <ChevronRight className="w-4 h-4 text-slate-500" />
          </button>
        )}

        {/* CENTER: Customer Info + Menu */}
        <div className="flex-1 flex min-w-0">
          
          {/* Customer Info Panel - Always Visible */}
          <div className="w-64 flex-shrink-0 bg-amber-50 border-r border-amber-200 overflow-y-auto">
            <div className="p-2 border-b border-amber-200 bg-amber-100">
              <h3 className="text-xs font-bold text-amber-800 flex items-center gap-1">
                <User className="w-3 h-3" />
                Info Cliente
              </h3>
            </div>
            <div className="p-2 space-y-2">
              <div>
                <Label className="text-[10px] text-amber-700 font-medium">Telefono *</Label>
                <Input
                  value={customerInfo.phone}
                  onChange={(e) => setCustomerInfo({...customerInfo, phone: e.target.value})}
                  placeholder="787-XXX-XXXX"
                  className="h-7 text-xs mt-0.5"
                />
              </div>
              <div>
                <Label className="text-[10px] text-amber-700 font-medium">Nombre *</Label>
                <Input
                  value={customerInfo.name}
                  onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
                  placeholder="Nombre completo"
                  className="h-7 text-xs mt-0.5"
                />
              </div>
              
              <div className="flex gap-1">
                <button
                  onClick={() => setCustomerInfo({...customerInfo, deliveryType: "delivery"})}
                  className={`flex-1 py-1 text-[10px] font-medium rounded ${
                    customerInfo.deliveryType === "delivery" 
                      ? "bg-amber-600 text-white" 
                      : "bg-white text-amber-700 border border-amber-300"
                  }`}
                >
                  Delivery
                </button>
                <button
                  onClick={() => setCustomerInfo({...customerInfo, deliveryType: "pickup"})}
                  className={`flex-1 py-1 text-[10px] font-medium rounded ${
                    customerInfo.deliveryType === "pickup" 
                      ? "bg-amber-600 text-white" 
                      : "bg-white text-amber-700 border border-amber-300"
                  }`}
                >
                  Pickup
                </button>
              </div>

              {customerInfo.deliveryType === "delivery" && (
                <>
                  <div>
                    <Label className="text-[10px] text-amber-700 font-medium">Direccion *</Label>
                    <Input
                      value={customerInfo.address}
                      onChange={(e) => setCustomerInfo({...customerInfo, address: e.target.value})}
                      placeholder="Calle, numero..."
                      className="h-7 text-xs mt-0.5"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    <div>
                      <Label className="text-[10px] text-amber-700 font-medium">Ciudad</Label>
                      <Input
                        value={customerInfo.city}
                        onChange={(e) => setCustomerInfo({...customerInfo, city: e.target.value})}
                        placeholder="Ciudad"
                        className="h-7 text-xs mt-0.5"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-amber-700 font-medium">ZIP</Label>
                      <Input
                        value={customerInfo.zip}
                        onChange={(e) => setCustomerInfo({...customerInfo, zip: e.target.value})}
                        placeholder="00XXX"
                        className="h-7 text-xs mt-0.5"
                      />
                    </div>
                  </div>
                </>
              )}

              {customerInfo.deliveryType === "pickup" && branches.length > 0 && (
                <div>
                  <Label className="text-[10px] text-amber-700 font-medium">Sucursal</Label>
                  <Select
                    value={customerInfo.selectedBranch}
                    onValueChange={(v) => setCustomerInfo({...customerInfo, selectedBranch: v})}
                  >
                    <SelectTrigger className="h-7 text-xs mt-0.5">
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((b) => (
                        <SelectItem key={b.id} value={b.id} className="text-xs">
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-1">
                <div>
                  <Label className="text-[10px] text-amber-700 font-medium">Fecha</Label>
                  <Input
                    type="date"
                    value={customerInfo.eventDate}
                    onChange={(e) => setCustomerInfo({...customerInfo, eventDate: e.target.value})}
                    className="h-7 text-xs mt-0.5"
                  />
                </div>
                <div>
                  <Label className="text-[10px] text-amber-700 font-medium">Hora</Label>
                  <Input
                    type="time"
                    value={customerInfo.eventTime}
                    onChange={(e) => setCustomerInfo({...customerInfo, eventTime: e.target.value})}
                    className="h-7 text-xs mt-0.5"
                  />
                </div>
              </div>

              <div>
                <Label className="text-[10px] text-amber-700 font-medium">Instrucciones</Label>
                <textarea
                  value={customerInfo.specialInstructions}
                  onChange={(e) => setCustomerInfo({...customerInfo, specialInstructions: e.target.value})}
                  placeholder="Notas especiales..."
                  className="w-full h-12 text-xs mt-0.5 p-1.5 border border-slate-200 rounded-md resize-none"
                />
              </div>
              
              {/* Payment Method Selection - Click to select AND open payment */}
              <div>
                <Label className="text-[10px] text-amber-700 font-medium">Metodo de Pago</Label>
                <div className="flex flex-col gap-1.5 mt-1">
                  {/* Stripe button - always available (platform default) */}
                  <button
                    onClick={() => {
                      setPaymentMethod("stripe")
                      if (cart.length > 0 && customerInfo.name && customerInfo.phone && selectedRestaurant) {
                        setShowPaymentModal(true)
                      }
                    }}
                    disabled={cart.length === 0 || !customerInfo.name || !customerInfo.phone || !selectedRestaurant}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      paymentMethod === "stripe"
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-white text-slate-700 border-slate-300 hover:border-indigo-400"
                    }`}
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"/>
                    </svg>
                    <span className="text-[10px] font-medium">Stripe (Tarjeta)</span>
                  </button>
                  
                  {/* ATH Movil button - always available but shows warning if not configured */}
                  <button
                    onClick={() => {
                      setPaymentMethod("ath_movil")
                      if (cart.length > 0 && customerInfo.name && customerInfo.phone && selectedRestaurant) {
                        setShowPaymentModal(true)
                      }
                    }}
                    disabled={cart.length === 0 || !customerInfo.name || !customerInfo.phone || !selectedRestaurant}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      paymentMethod === "ath_movil"
                        ? "bg-orange-500 text-white border-orange-500"
                        : "bg-white text-slate-700 border-slate-300 hover:border-orange-400"
                    }`}
                  >
                    <div className="w-4 h-4 bg-orange-500 rounded flex items-center justify-center text-white text-[8px] font-bold">
                      ATH
                    </div>
                    <span className="text-[10px] font-medium">
                      ATH Movil
                      {selectedRestaurant && !selectedRestaurant.athmovil_public_token && (
                        <span className="text-amber-500 ml-1">(!)</span>
                      )}
                    </span>
                  </button>
                </div>
                {(cart.length === 0 || !customerInfo.name || !customerInfo.phone) && (
                  <p className="text-[9px] text-amber-600 mt-1">
                    {cart.length === 0 ? "Agrega items al carrito" : "Completa nombre y telefono"}
                  </p>
                )}
                {!selectedRestaurant && (
                  <p className="text-[9px] text-amber-600 mt-1">
                    Selecciona un restaurante
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Menu Panel */}
          <div className="flex-1 min-w-0 flex flex-col bg-white">
            {!selectedRestaurant ? (
              <div className="flex-1 flex items-center justify-center text-slate-400">
                <div className="text-center">
                  <Building2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Selecciona un restaurante</p>
                </div>
              </div>
            ) : loading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-rose-200 border-t-rose-500 rounded-full animate-spin" />
              </div>
            ) : (
              <>
                {/* Menu Header with Search */}
                <div className="p-2 border-b border-slate-200 flex items-center gap-2">
                  <h3 className="text-xs font-bold text-slate-800">{selectedRestaurant.name}</h3>
                  <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                    <Input
                      value={menuSearchTerm}
                      onChange={(e) => setMenuSearchTerm(e.target.value)}
                      placeholder="Buscar item..."
                      className="pl-6 h-6 text-[10px]"
                    />
                  </div>
                  <button
                    onClick={clearSelection}
                    className="text-[10px] text-slate-500 hover:text-rose-600"
                  >
                    Cambiar
                  </button>
                </div>

                {/* Multi-column Menu Layout */}
                <div className="flex-1 overflow-y-auto p-2">
                  <div className="columns-2 lg:columns-3 xl:columns-4 gap-3">
                    {Object.entries(groupedItems).map(([category, items]) => (
                      <div key={category} className="break-inside-avoid mb-3">
                        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1 px-1 bg-slate-100 py-0.5 rounded">
                          {category}
                        </h4>
                        <div className="space-y-0">
                          {items.map((item) => {
                            const inCart = cart.filter((c) => c.itemId === item.id)
                            const totalQty = inCart.reduce((sum, c) => sum + c.quantity, 0)
                            return (
                              <button
                                key={item.id}
                                className="w-full text-left py-0.5 px-1 text-[11px] hover:bg-rose-50 rounded flex items-center justify-between group"
                                onClick={() => openItemDetail(item)}
                              >
                                <span className="truncate text-blue-600 hover:underline flex-1 mr-1">
                                  {item.name}
                                </span>
                                <span className="text-slate-600 flex-shrink-0 flex items-center gap-1">
                                  {totalQty > 0 && (
                                    <span className="w-4 h-4 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                                      {totalQty}
                                    </span>
                                  )}
                                  ${Number(item.price).toFixed(2)}
                                </span>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* RIGHT SLIDEOUT: Shopping Cart */}
        <div className={`bg-white border-l border-slate-200 transition-all duration-300 overflow-hidden flex-shrink-0 ${
          isCartOpen ? "w-72" : "w-0"
        }`}>
          <div className="w-72 h-full flex flex-col">
            <div className="p-2 border-b border-slate-200 flex items-center justify-between bg-rose-50">
              <div className="flex items-center gap-1.5">
                <ShoppingCart className="w-4 h-4 text-rose-500" />
                <span className="text-xs font-bold text-rose-700">Carrito ({totalItems})</span>
              </div>
              <button onClick={() => setIsCartOpen(false)} className="p-1 hover:bg-rose-100 rounded">
                <X className="w-4 h-4 text-rose-500" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {cart.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-xs">Carrito vacio</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.id} className="bg-slate-50 rounded p-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-900 truncate">{item.name}</p>
                        {item.selectedOptions && Object.keys(item.selectedOptions).length > 0 && (
                          <div className="mt-0.5">
                            {Object.entries(item.selectedOptions).map(([cat, val]) => (
                              <p key={cat} className="text-[10px] text-blue-600 italic truncate">
                                {val}
                              </p>
                            ))}
                          </div>
                        )}
                        {item.notes && (
                          <p className="text-[10px] text-amber-600 mt-0.5 truncate" title={item.notes}>
                            Nota: {item.notes}
                          </p>
                        )}
                        <p className="text-[10px] text-slate-500 mt-0.5">${item.price.toFixed(2)}</p>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="p-1 text-slate-400 hover:text-red-500"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between mt-1.5">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => updateQuantity(item.id, -1)}
                          className="w-5 h-5 rounded bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-100"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center text-xs font-medium">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, 1)}
                          className="w-5 h-5 rounded bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-100"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <span className="text-xs font-bold text-slate-900">
                        ${(item.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (() => {
              const deliveryFee = customerInfo.deliveryType === "delivery" ? DELIVERY_FEE : 0
              const dispatchFee = customerInfo.deliveryType === "delivery" ? DISPATCH_FEE : 0
              const ivu = subtotal * IVU_RATE
              const tipAmount = customTip ? parseFloat(customTip) || 0 : (subtotal * tipPercentage / 100)
              const total = subtotal + deliveryFee + dispatchFee + ivu + tipAmount
              
              return (
                <div className="p-3 border-t border-slate-200 bg-white">
                  {/* Header */}
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-2">DETALLES DE LA ORDEN</p>
                  
                  {/* Subtotal */}
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-900 font-medium">Subtotal</span>
                    <span className="text-slate-900">${subtotal.toFixed(2)}</span>
                  </div>
                  
                  {/* Delivery Fee */}
                  {customerInfo.deliveryType === "delivery" && (
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-rose-500">
                        Delivery{deliveryDistance > 0 ? ` (${deliveryDistance.toFixed(1)} mi)` : ""}
                        {isCalculatingFee && <span className="ml-1 text-slate-400">...</span>}
                      </span>
                      <span className="text-slate-900">${(deliveryFee + dispatchFee).toFixed(2)}</span>
                    </div>
                  )}
                  
                  {/* IVU */}
                  <div className="flex justify-between text-xs mb-2">
                    <span className="text-rose-500">IVU</span>
                    <span className="text-slate-900">${ivu.toFixed(2)}</span>
                  </div>
                  
                  {/* Tip Section */}
                  <div className="border-t border-slate-100 pt-2 mb-2">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-xs text-slate-900 font-medium">Propina</span>
                      <span className="text-xs text-slate-900">${tipAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex gap-1">
                      {[10, 15, 18, 20].map((pct) => (
                        <button
                          key={pct}
                          onClick={() => { setTipPercentage(pct); setCustomTip(""); }}
                          className={`flex-1 py-1.5 text-[11px] rounded-full transition-colors ${
                            tipPercentage === pct && !customTip
                              ? "bg-amber-400 text-slate-900 font-medium"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          {pct}%
                        </button>
                      ))}
                      <button
                        onClick={() => {
                          const amount = window.prompt("Ingrese monto de propina:")
                          if (amount) setCustomTip(amount)
                        }}
                        className={`flex-1 py-1.5 text-[11px] rounded-full transition-colors ${
                          customTip
                            ? "bg-amber-400 text-slate-900 font-medium"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        Otro
                      </button>
                    </div>
                  </div>
                  
                  {/* Total */}
                  <div className="flex justify-between pt-2 border-t border-slate-200">
                    <span className="text-sm font-bold text-slate-900">Total</span>
                    <span className="text-sm font-bold text-rose-600">${total.toFixed(2)}</span>
                  </div>
                  
                  <Button
                    onClick={() => setShowPaymentModal(true)}
                    className="w-full h-8 text-xs bg-rose-500 hover:bg-rose-600 mt-2"
                    disabled={!customerInfo.name || !customerInfo.phone || isProcessing}
                  >
                    Procesar Pago
                  </Button>
                  {(!customerInfo.name || !customerInfo.phone) && (
                    <p className="text-[10px] text-amber-600 text-center mt-1">
                      Completa info del cliente
                    </p>
                  )}
                  {orderSuccess && (
                    <div className="mt-2 p-2 bg-green-100 border border-green-300 rounded text-center">
                      <p className="text-xs font-medium text-green-700">Orden Creada</p>
                      <p className="text-[10px] text-green-600">{orderSuccess}</p>
                    </div>
                  )}
                </div>
              )
            })()}
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedRestaurant && cart.length > 0 && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-lg max-h-[90vh] overflow-hidden">
            {paymentMethod === "stripe" ? (
              <StripeCheckout
                orderData={{
                  restaurantId: selectedRestaurant.id,
                  branchId: customerInfo.selectedBranch || null,
                  cart: cart.map(item => ({
                    id: item.itemId,
                    name: item.name,
                    price: item.price * item.quantity,
                    quantity: item.quantity,
                    totalPrice: item.price * item.quantity,
                    selectedOptions: item.selectedOptions,
                    notes: item.notes,
                  })),
                  subtotal: subtotal,
                  tax: subtotal * IVU_RATE,
                  deliveryFee: customerInfo.deliveryType === "delivery" ? DELIVERY_FEE + DISPATCH_FEE : 0,
                  tip: customTip ? parseFloat(customTip) || 0 : (subtotal * tipPercentage / 100),
                  total: (() => {
                    const deliveryFee = customerInfo.deliveryType === "delivery" ? DELIVERY_FEE : 0
                    const dispatchFee = customerInfo.deliveryType === "delivery" ? DISPATCH_FEE : 0
                    const ivu = subtotal * IVU_RATE
                    const tipAmount = customTip ? parseFloat(customTip) || 0 : (subtotal * tipPercentage / 100)
                    return subtotal + deliveryFee + dispatchFee + ivu + tipAmount
                  })(),
                  orderType: customerInfo.deliveryType,
                  eventDetails: {
                    restaurantId: selectedRestaurant.id,
                    branchId: customerInfo.selectedBranch || null,
                    name: customerInfo.name,
                    phone: customerInfo.phone,
                    address: customerInfo.address,
                    city: customerInfo.city,
                    zip: customerInfo.zip,
                    eventDate: customerInfo.eventDate,
                    eventTime: customerInfo.eventTime,
                    specialInstructions: customerInfo.specialInstructions,
                  },
                  includeUtensils: false,
                  customerEmail: "",
                  customerPhone: customerInfo.phone,
                  smsConsent: true,
                  stripeAccountId: selectedRestaurant.stripe_account_id || null,
                  customerId: null,
                }}
                onSuccess={() => {
                  setShowPaymentModal(false)
                  setOrderSuccess("Pago completado exitosamente")
                  setCart([])
                  setCustomerInfo({
                    phone: "",
                    name: "",
                    address: "",
                    city: "",
                    zip: "",
                    deliveryType: "delivery",
                    eventDate: getDefaultDateTime("delivery").date,
                    eventTime: getDefaultDateTime("delivery").time,
                    specialInstructions: "",
                    selectedBranch: "",
                  })
                  setTimeout(() => setOrderSuccess(null), 5000)
                }}
                onCancel={() => setShowPaymentModal(false)}
              />
            ) : (
              <ATHMovilCheckout
                orderData={{
                  restaurantId: selectedRestaurant.id,
                  branchId: customerInfo.selectedBranch || null,
                  cart: cart.map(item => ({
                    id: item.itemId,
                    menu_item_id: item.itemId,
                    name: item.name,
                    price: item.price,
                    quantity: item.quantity,
                    total_price: item.price * item.quantity,
                    selectedOptions: item.selectedOptions,
                  })),
                  subtotal: subtotal,
                  tax: subtotal * IVU_RATE,
                  deliveryFee: customerInfo.deliveryType === "delivery" ? DELIVERY_FEE + DISPATCH_FEE : 0,
                  tip: customTip ? parseFloat(customTip) || 0 : (subtotal * tipPercentage / 100),
                  total: (() => {
                    const deliveryFee = customerInfo.deliveryType === "delivery" ? DELIVERY_FEE : 0
                    const dispatchFee = customerInfo.deliveryType === "delivery" ? DISPATCH_FEE : 0
                    const ivu = subtotal * IVU_RATE
                    const tipAmount = customTip ? parseFloat(customTip) || 0 : (subtotal * tipPercentage / 100)
                    return subtotal + deliveryFee + dispatchFee + ivu + tipAmount
                  })(),
                  orderType: customerInfo.deliveryType,
                  customerEmail: "",
                  customerPhone: customerInfo.phone,
                  eventDetails: {
                    name: customerInfo.name,
                    phone: customerInfo.phone,
                    address: customerInfo.address,
                    city: customerInfo.city,
                    zip: customerInfo.zip,
                    eventDate: customerInfo.eventDate,
                    eventTime: customerInfo.eventTime,
                    specialInstructions: customerInfo.specialInstructions,
                  },
                  restaurantName: selectedRestaurant.name,
                  branchName: "",
                  athmovilPublicToken: selectedRestaurant.athmovil_public_token,
                  athmovilEcommerceId: selectedRestaurant.athmovil_ecommerce_id,
                }}
                onSuccess={() => {
                  setShowPaymentModal(false)
                  setOrderSuccess("Pago ATH Movil completado")
                  setCart([])
                  setCustomerInfo({
                    phone: "",
                    name: "",
                    address: "",
                    city: "",
                    zip: "",
                    deliveryType: "delivery",
                    eventDate: getDefaultDateTime("delivery").date,
                    eventTime: getDefaultDateTime("delivery").time,
                    specialInstructions: "",
                    selectedBranch: "",
                  })
                  setTimeout(() => setOrderSuccess(null), 5000)
                }}
                onCancel={() => setShowPaymentModal(false)}
              />
            )}
          </div>
        </div>
      )}

      {/* Item Options Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-semibold text-slate-900 text-sm">{selectedItem.name}</h3>
                <p className="text-xs text-slate-500">${Number(selectedItem.price).toFixed(2)}</p>
              </div>
              <button
                onClick={() => { setSelectedItem(null); setItemOptions([]); setItemCustomizations({}) }}
                className="p-1 hover:bg-slate-200 rounded"
              >
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-4">
              {loadingOptions ? (
                <div className="text-center py-4">
                  <div className="w-5 h-5 border-2 border-rose-200 border-t-rose-500 rounded-full animate-spin mx-auto" />
                </div>
              ) : itemOptions.length === 0 ? (
                <p className="text-center text-slate-400 text-xs py-4">
                  Este item no tiene opciones adicionales
                </p>
              ) : (
                itemOptions.map((option) => {
                  const isMulti = (option.max_selection || 1) > 1
                  const isRequired = option.is_required

                  return (
                    <div key={option.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-semibold text-slate-700">
                          {option.prompt || option.category}
                        </h4>
                        {isRequired && (
                          <span className="text-[10px] bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded font-medium">
                            Requerido
                          </span>
                        )}
                      </div>

                      <div className="space-y-1">
                        {option.item_option_choices.map((choice) => {
                          const isSelected = isMulti
                            ? ((itemCustomizations[option.id] as string[]) || []).includes(choice.id)
                            : itemCustomizations[option.id] === choice.id

                          return (
                            <label
                              key={choice.id}
                              className={`flex items-center justify-between p-2 rounded border cursor-pointer transition-colors ${
                                isSelected
                                  ? "bg-rose-50 border-rose-300"
                                  : "bg-white border-slate-200 hover:border-slate-300"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                {isMulti ? (
                                  <Checkbox
                                    checked={isSelected}
                                    onCheckedChange={() => handleOptionSelect(option.id, choice.id, true)}
                                  />
                                ) : (
                                  <input
                                    type="radio"
                                    name={option.id}
                                    checked={isSelected}
                                    onChange={() => handleOptionSelect(option.id, choice.id, false)}
                                    className="w-3.5 h-3.5 text-rose-500"
                                  />
                                )}
                                <span className="text-xs text-slate-700">{choice.name}</span>
                              </div>
                              {choice.price_modifier && Number(choice.price_modifier) !== 0 && (
                                <span className="text-xs text-slate-500">
                                  +${Number(choice.price_modifier).toFixed(2)}
                                </span>
                              )}
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  )
                })
              )}
              
              {/* Special Instructions Section */}
              <div className="pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowItemNotes(!showItemNotes)}
                  className="flex items-center gap-1 text-xs text-rose-500 hover:text-rose-600"
                >
                  <span className={`transform transition-transform ${showItemNotes ? "rotate-90" : ""}`}>
                    <ChevronRight className="w-3 h-3" />
                  </span>
                  Instrucciones especiales
                </button>
                {showItemNotes && (
                  <textarea
                    value={itemNotes}
                    onChange={(e) => setItemNotes(e.target.value)}
                    placeholder="Informe al restaurante sobre alergias o instrucciones de preparacion."
                    className="mt-2 w-full h-16 text-xs border border-slate-200 rounded-md p-2 resize-none focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                )}
              </div>
            </div>

            <div className="p-3 border-t border-slate-200 bg-slate-50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-600">Total</span>
                <span className="text-sm font-bold text-slate-900">
                  ${calculateItemPrice(selectedItem).toFixed(2)}
                </span>
              </div>
              <Button
                onClick={addItemToCart}
                className="w-full h-9 bg-rose-500 hover:bg-rose-600 text-sm"
              >
                Agregar al Carrito ${calculateItemPrice(selectedItem).toFixed(2)}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
