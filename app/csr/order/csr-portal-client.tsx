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
import { Phone, Search, Building2, X, ShoppingCart, Minus, Plus, Trash2, ChevronRight, ChevronLeft, LogOut, Menu, User, MapPin, Clock, CalendarIcon, Store, Package } from "lucide-react"
import Link from "next/link"
import { calculateDeliveryFee } from "@/app/actions/delivery-zones"
import { AddressAutocomplete } from "@/components/address-autocomplete"

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
  isInternalShop?: boolean
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
  const [internalShopItems, setInternalShopItems] = useState<any[]>([])
  const [showInternalShop, setShowInternalShop] = useState(false)
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
  
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null)
  
  // Payment method state
  const [paymentMethod, setPaymentMethod] = useState<"stripe" | "ath_movil" | "cash" | "saved_card">("stripe")
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  
  // Delivery fee state (calculated from delivery zones)
  const [calculatedDeliveryFee, setCalculatedDeliveryFee] = useState<number>(0)
  const [deliveryDistance, setDeliveryDistance] = useState<number>(0)
  const [deliverySubsidy, setDeliverySubsidy] = useState<number>(0)
  const [isCalculatingFee, setIsCalculatingFee] = useState(false)
  
  // Get default date/time based on delivery type
  const defaultDateTime = getDefaultDateTime("delivery")
  
  // Customer info state
  const [customerInfo, setCustomerInfo] = useState({
    phone: "",
    name: "",
    email: "",
    streetAddress: "",
    streetAddress2: "", // Apt, Urb, Suite, etc.
    city: "",
    state: "PR", // Default to Puerto Rico
    zip: "",
    deliveryType: "delivery" as "delivery" | "pickup",
    eventDate: defaultDateTime.date,
    eventTime: defaultDateTime.time,
    specialInstructions: "",
    selectedBranch: "",
  })
  
  // Customer autocomplete state
  const [customerSearchResults, setCustomerSearchResults] = useState<any[]>([])
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)
  const [isSearchingCustomers, setIsSearchingCustomers] = useState(false)
  const [customerPaymentMethods, setCustomerPaymentMethods] = useState<any[]>([])
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string | null>(null)
  const [customerAddresses, setCustomerAddresses] = useState<any[]>([])
  const [isNewCustomer, setIsNewCustomer] = useState(false)
  
  // Read-back confirmation state
  const [showReadbackModal, setShowReadbackModal] = useState(false)
  
  // Manual address override - bypasses delivery zone validation
  const [manualAddressOverride, setManualAddressOverride] = useState(false)
  
  // Available restaurants filtered by delivery zone
  const [zoneFilteredRestaurants, setZoneFilteredRestaurants] = useState<Restaurant[]>(restaurants)
  
  // Update time when delivery type changes
  useEffect(() => {
    const { date, time } = getDefaultDateTime(customerInfo.deliveryType)
    setCustomerInfo(prev => ({ ...prev, eventDate: date, eventTime: time }))
  }, [customerInfo.deliveryType])

  // Filter restaurants by search AND delivery zone
  const filteredRestaurants = zoneFilteredRestaurants.filter((r) =>
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
    
    // Fetch internal shop items
    const { data: shopItems } = await supabase
      .from("internal_shop_items")
      .select("*")
      .eq("is_active", true)
      .order("category", { ascending: true })
      .order("name", { ascending: true })
    
    setInternalShopItems(shopItems || [])
      
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
    window.location.href = "/auth/login"
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
  
  // Delivery fee already has subsidy deducted (calculatedDeliveryFee = displayedFee from API)
  // So DELIVERY_FEE is what customer sees (e.g., $5.69 - $3 subsidy = $2.69)
  const DELIVERY_FEE = calculatedDeliveryFee
  
  // Dispatch fee = percentage of subtotal + subsidy recovery (platform recovers subsidy here)
  const DISPATCH_FEE_PERCENT = selectedRestaurant?.dispatch_fee_percent ?? 0
  const DISPATCH_FEE = (subtotal * (DISPATCH_FEE_PERCENT / 100)) + deliverySubsidy
  

  
  // Calculate delivery fee when address changes
  useEffect(() => {
    const calculateFee = async () => {
      if (!selectedRestaurant || customerInfo.deliveryType !== "delivery") {
        setCalculatedDeliveryFee(0)
        setDeliveryDistance(0)
        return
      }
      
      // Need full address to calculate
      if (!customerInfo.streetAddress || !customerInfo.city) {
        setCalculatedDeliveryFee(0)
        setDeliveryDistance(0)
        return
      }
      
      setIsCalculatingFee(true)
      try {
        // Get restaurant address from the selected branch or restaurant
        const restaurantAddress = selectedRestaurant.address || 
          `${selectedRestaurant.city || ""}, ${selectedRestaurant.state || "PR"}`
        
const line2 = customerInfo.streetAddress2 ? `, ${customerInfo.streetAddress2}` : ""
        const deliveryAddress = `${customerInfo.streetAddress}${line2}, ${customerInfo.city}, ${customerInfo.state} ${customerInfo.zip || ""}`
        
        const result = await calculateDeliveryFee({
          restaurantId: selectedRestaurant.id,
          deliveryAddress,
          restaurantAddress,
          itemCount: totalItems,
        })
        
        if (result.success) {
          // Use displayedFee (subsidy-reduced) for customer-facing display
          setCalculatedDeliveryFee(result.displayedFee)
          setDeliveryDistance(result.distance)
          setDeliverySubsidy(result.subsidy)
        } else {
          // Calculation failed - fetch minimum zone fee from delivery_zones table
          const [settingsResult, zonesResult] = await Promise.all([
            supabase.from("platform_settings").select("delivery_fee_subsidy").single(),
            supabase.from("delivery_zones").select("base_fee").eq("restaurant_id", selectedRestaurant.id).order("base_fee", { ascending: true }).limit(1)
          ])
          
          const subsidy = Number(settingsResult.data?.delivery_fee_subsidy ?? 3.0)
          // Use minimum zone fee, or fall back to 5.89 if no zones exist
          const baseFee = zonesResult.data?.[0]?.base_fee ? Number(zonesResult.data[0].base_fee) : 5.89
          const displayedFee = Math.max(0, baseFee - subsidy)
          setCalculatedDeliveryFee(displayedFee)
          setDeliveryDistance(0)
          setDeliverySubsidy(subsidy)
        }
      } catch (error) {
        console.error("Error calculating delivery fee:", error)
        // Fallback - fetch minimum zone fee from delivery_zones table
        const [settingsResult, zonesResult] = await Promise.all([
          supabase.from("platform_settings").select("delivery_fee_subsidy").single(),
          supabase.from("delivery_zones").select("base_fee").eq("restaurant_id", selectedRestaurant.id).order("base_fee", { ascending: true }).limit(1)
        ])
        
        const subsidy = Number(settingsResult.data?.delivery_fee_subsidy ?? 3.0)
        const baseFee = zonesResult.data?.[0]?.base_fee ? Number(zonesResult.data[0].base_fee) : 5.89
        setCalculatedDeliveryFee(Math.max(0, baseFee - subsidy))
        setDeliverySubsidy(subsidy)
      } finally {
        setIsCalculatingFee(false)
      }
    }
    
    // Debounce the calculation
    const timer = setTimeout(calculateFee, 500)
    return () => clearTimeout(timer)
  }, [selectedRestaurant, customerInfo.streetAddress, customerInfo.streetAddress2, customerInfo.city, customerInfo.state, customerInfo.zip, customerInfo.deliveryType, totalItems])

  // Search customers by phone or name for autocomplete
  const searchCustomers = async (searchTerm: string) => {
    if (searchTerm.length < 3) {
      setCustomerSearchResults([])
      setShowCustomerDropdown(false)
      return
    }
    
    setIsSearchingCustomers(true)
    try {
      // Search by phone, name, or email in customers table
      const { data: customersData, error: customersError } = await supabase
        .from("customers")
        .select(`
          id,
          first_name,
          last_name,
          phone,
          email,
          customer_addresses (
            id,
            address_line_1,
            address_line_2,
            city,
            state,
            postal_code,
            is_default,
            delivery_instructions
          ),
          customer_payment_methods (
            id,
            card_brand,
            card_last_four,
            card_exp_month,
            card_exp_year,
            provider,
            provider_customer_id,
            provider_payment_method_id,
            is_default
          )
        `)
        .or(`phone.ilike.%${searchTerm}%,first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
        .limit(5)
      
      if (customersError) throw customersError

      // Also search profiles table for imported contacts
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name, phone, email")
        .or(`phone.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
        .limit(5)

      // Convert profiles to customer-like format and merge
      const profilesAsCustomers = (profilesData || [])
        .filter(p => {
          // Exclude profiles that already exist in customers (by email or phone)
          return !(customersData || []).some(c => 
            (c.email && c.email === p.email) || (c.phone && c.phone === p.phone)
          )
        })
        .map(p => ({
          id: `profile_${p.id}`, // Prefix to distinguish from customer IDs
          first_name: p.full_name?.split(" ")[0] || "",
          last_name: p.full_name?.split(" ").slice(1).join(" ") || "",
          phone: p.phone,
          email: p.email,
          customer_addresses: [],
          customer_payment_methods: [],
          _isProfile: true, // Flag to indicate this came from profiles table
        }))

      const allResults = [...(customersData || []), ...profilesAsCustomers].slice(0, 8)
      
      setCustomerSearchResults(allResults)
      setShowCustomerDropdown(allResults.length > 0)
      setIsNewCustomer(allResults.length === 0)
    } catch (error) {
      console.error("Error searching customers:", error)
      setCustomerSearchResults([])
    } finally {
      setIsSearchingCustomers(false)
    }
  }
  
  // Select a customer from autocomplete and fill in their info
  const selectCustomer = (customer: any) => {
    // Find default address or first address
    const defaultAddress = customer.customer_addresses?.find((a: any) => a.is_default) || customer.customer_addresses?.[0]
    
    setCustomerInfo({
      ...customerInfo,
      phone: customer.phone || "",
      name: `${customer.first_name || ""} ${customer.last_name || ""}`.trim(),
      email: customer.email || "",
      streetAddress: defaultAddress?.address_line_1 || "",
      streetAddress2: defaultAddress?.address_line_2 || "",
      city: defaultAddress?.city || "",
      state: defaultAddress?.state || "PR",
      zip: defaultAddress?.postal_code || "",
      specialInstructions: defaultAddress?.delivery_instructions || customerInfo.specialInstructions,
    })
    setSelectedCustomerId(customer.id)
    setCustomerAddresses(customer.customer_addresses || [])
    setCustomerPaymentMethods(customer.customer_payment_methods || [])
    
    // Auto-select default payment method if available
    const defaultPayment = customer.customer_payment_methods?.find((pm: any) => pm.is_default)
    if (defaultPayment) {
      setSelectedPaymentMethodId(defaultPayment.id)
    }
    
    setShowCustomerDropdown(false)
    setCustomerSearchResults([])
    setIsNewCustomer(false)
  }
  
  // Save new customer to database
  const saveNewCustomer = async () => {
    if (!customerInfo.name || !customerInfo.phone) return null
    
    try {
      const nameParts = customerInfo.name.trim().split(" ")
      const firstName = nameParts[0] || ""
      const lastName = nameParts.slice(1).join(" ") || ""
      const normalizedPhone = customerInfo.phone.replace(/\D/g, "")
      
      // Check if customer already exists
      const { data: existing } = await supabase
        .from("customers")
        .select("id")
        .or(`phone.ilike.%${normalizedPhone}%`)
        .single()
      
      if (existing) {
        setSelectedCustomerId(existing.id)
        return existing.id
      }
      
      // Create new customer
      const { data: newCustomer, error } = await supabase
        .from("customers")
        .insert({
          first_name: firstName,
          last_name: lastName,
          phone: normalizedPhone,
          email: customerInfo.email || null,
        })
        .select("id")
        .single()
      
      if (error) throw error
      
      if (newCustomer) {
        setSelectedCustomerId(newCustomer.id)
        setIsNewCustomer(false)
        
        // If delivery address provided, save it
        if (customerInfo.deliveryType === "delivery" && customerInfo.streetAddress) {
          await supabase
            .from("customer_addresses")
            .insert({
              customer_id: newCustomer.id,
              address_line_1: customerInfo.streetAddress,
              address_line_2: customerInfo.streetAddress2 || null,
              city: customerInfo.city,
              state: customerInfo.state || "PR",
              postal_code: customerInfo.zip,
              delivery_instructions: customerInfo.specialInstructions || null,
              is_default: true,
            })
        }
        
        return newCustomer.id
      }
      return null
    } catch (error) {
      console.error("Error saving customer:", error)
      return null
    }
  }
  
  // Filter restaurants by delivery zone when customer address changes
  useEffect(() => {
    const filterByDeliveryZone = async () => {
      // If manual override is checked, show all restaurants
      if (manualAddressOverride) {
        setZoneFilteredRestaurants(restaurants)
        return
      }
      
      if (!customerInfo.streetAddress || !customerInfo.city || customerInfo.deliveryType !== "delivery") {
        setZoneFilteredRestaurants(restaurants)
        return
      }
      
      const line2 = customerInfo.streetAddress2 ? `, ${customerInfo.streetAddress2}` : ""
      const deliveryAddress = `${customerInfo.streetAddress}${line2}, ${customerInfo.city}, ${customerInfo.state} ${customerInfo.zip || ""}`
      
      // Check each restaurant's delivery zones
      const available: Restaurant[] = []
      for (const restaurant of restaurants) {
        if (!restaurant.address) {
          available.push(restaurant) // Include if no address configured
          continue
        }
        
        const result = await calculateDeliveryFee({
          restaurantId: restaurant.id,
          deliveryAddress,
          restaurantAddress: restaurant.address,
          itemCount: 1,
        })
        
        if (result.success) {
          available.push(restaurant)
        }
      }
      
      setZoneFilteredRestaurants(available.length > 0 ? available : restaurants) // Fallback to all if none match
    }
    
    const timer = setTimeout(filterByDeliveryZone, 800)
    return () => clearTimeout(timer)
  }, [customerInfo.streetAddress, customerInfo.streetAddress2, customerInfo.city, customerInfo.state, customerInfo.zip, customerInfo.deliveryType, restaurants, manualAddressOverride])
  
  // Debounced customer search when phone changes
  useEffect(() => {
    if (selectedCustomerId) return // Don't search if customer already selected
    
    const timer = setTimeout(() => {
      if (customerInfo.phone.length >= 3) {
        searchCustomers(customerInfo.phone)
      }
    }, 300)
    
    return () => clearTimeout(timer)
  }, [customerInfo.phone, selectedCustomerId])

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
            <Link href="/csr" className="text-[10px] text-slate-400 hover:text-white font-medium">
              Dispatch
            </Link>
            <Link href="/csr/menus" className="text-[10px] text-slate-400 hover:text-white">
              Editar Menús
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
              {/* Phone with autocomplete */}
              <div className="relative">
                <Label className="text-[10px] text-amber-700 font-medium">Telefono *</Label>
                <div className="relative">
                  <Input
                    value={customerInfo.phone}
                    onChange={(e) => {
                      setSelectedCustomerId(null) // Clear selected customer when typing
                      setCustomerInfo({...customerInfo, phone: e.target.value})
                    }}
                    onFocus={() => customerSearchResults.length > 0 && setShowCustomerDropdown(true)}
                    placeholder="787-XXX-XXXX"
                    className="h-7 text-xs mt-0.5"
                  />
                  {isSearchingCustomers && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                      <div className="w-3 h-3 border border-amber-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                
                {/* Customer autocomplete dropdown */}
                {showCustomerDropdown && customerSearchResults.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {customerSearchResults.map((customer) => (
                      <button
                        key={customer.id}
                        onClick={() => selectCustomer(customer)}
                        className="w-full px-2 py-1.5 text-left hover:bg-amber-50 border-b border-slate-100 last:border-b-0"
                      >
                        <div className="text-xs font-medium text-slate-900">
                          {customer.first_name} {customer.last_name}
                        </div>
                        <div className="text-[10px] text-slate-500 flex gap-2">
                          <span>{customer.phone}</span>
                          {customer.email && <span>| {customer.email}</span>}
                        </div>
                        {customer.customer_addresses?.[0] && (
                          <div className="text-[10px] text-slate-400 truncate">
                            {customer.customer_addresses[0].address_line_1}, {customer.customer_addresses[0].city}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Name */}
              <div>
                <Label className="text-[10px] text-amber-700 font-medium">Nombre *</Label>
                <Input
                  value={customerInfo.name}
                  onChange={(e) => {
                    setSelectedCustomerId(null) // Clear selected customer when typing
                    setCustomerInfo({...customerInfo, name: e.target.value})
                  }}
                  placeholder="Nombre completo"
                  className="h-7 text-xs mt-0.5"
                />
                {selectedCustomerId && (
                  <p className="text-[9px] text-green-600 mt-0.5">Cliente registrado</p>
                )}
                {isNewCustomer && !selectedCustomerId && customerInfo.phone.length >= 7 && (
                  <p className="text-[9px] text-amber-600 mt-0.5">Nuevo cliente</p>
                )}
              </div>
              
              {/* Email (optional) */}
              <div>
                <Label className="text-[10px] text-amber-700 font-medium">Email</Label>
                <Input
                  type="email"
                  value={customerInfo.email}
                  onChange={(e) => setCustomerInfo({...customerInfo, email: e.target.value})}
                  placeholder="email@ejemplo.com"
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
                  {/* Address Line 1 with Google Autocomplete */}
                  <div>
                    <Label className="text-[10px] text-amber-700 font-medium">Direccion *</Label>
                    <AddressAutocomplete
                      value={customerInfo.streetAddress}
                      onChange={(val) => setCustomerInfo(prev => ({...prev, streetAddress: val}))}
                      onAddressSelected={(components) => {
                        // ALWAYS override city/state/zip when selecting from autocomplete
                        setCustomerInfo(prev => ({
                          ...prev,
                          streetAddress: components.streetAddress,
                          city: components.city,
                          state: components.state || "PR",
                          zip: components.zip,
                        }))
                        // Uncheck manual override since user selected from Google
                        setManualAddressOverride(false)
                      }}
                      placeholder="Numero, Calle..."
                      className="h-7 text-xs mt-0.5"
                    />
                  </div>
                  
                  {/* Address Line 2 */}
                  <div>
                    <Label className="text-[10px] text-amber-700 font-medium">Apt, Urb, Suite</Label>
                    <Input
                      value={customerInfo.streetAddress2}
                      onChange={(e) => setCustomerInfo({...customerInfo, streetAddress2: e.target.value})}
                      placeholder="Apt 2B, Urb Villa Sol, etc."
                      className="h-7 text-xs mt-0.5"
                    />
                  </div>
                  
                  {/* City, State, and ZIP */}
                  <div className="grid grid-cols-3 gap-1">
                    <div>
                      <Label className="text-[10px] text-amber-700 font-medium">Ciudad</Label>
                      <Input
                        value={customerInfo.city}
                        onChange={(e) => setCustomerInfo({...customerInfo, city: e.target.value})}
                        placeholder="San Juan"
                        className="h-7 text-xs mt-0.5"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-amber-700 font-medium">Estado</Label>
                      <Input
                        value={customerInfo.state}
                        onChange={(e) => setCustomerInfo({...customerInfo, state: e.target.value.toUpperCase().slice(0, 2)})}
                        placeholder="PR"
                        className="h-7 text-xs mt-0.5"
                        maxLength={2}
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-amber-700 font-medium">ZIP</Label>
                      <Input
                        value={customerInfo.zip}
                        onChange={(e) => {
                          // Only allow numeric input, max 5 digits
                          const val = e.target.value.replace(/\D/g, "").slice(0, 5)
                          setCustomerInfo({...customerInfo, zip: val})
                        }}
                        placeholder="00XXX"
                        className="h-7 text-xs mt-0.5"
                      />
                    </div>
                  </div>
                  
                  {/* Manual address override for CSR */}
                  <div className="flex items-center gap-2 mt-1 p-2 bg-amber-50 rounded border border-amber-200">
                    <input
                      type="checkbox"
                      id="manualAddressOverride"
                      checked={manualAddressOverride}
                      onChange={(e) => setManualAddressOverride(e.target.checked)}
                      className="h-3 w-3 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                    />
                    <label htmlFor="manualAddressOverride" className="text-[10px] text-amber-700">
                      Direccion verificada manualmente (Google no la encuentra)
                    </label>
                  </div>
                </>
              )}

              {/* Branch selector removed - each restaurant is a unit */}

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
                        setShowReadbackModal(true) // Go through read-back first
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
                        setShowReadbackModal(true) // Go through read-back first
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
                  
                  {/* Cash on Delivery button */}
                  <button
                    onClick={() => {
                      setPaymentMethod("cash")
                      if (cart.length > 0 && customerInfo.name && customerInfo.phone && selectedRestaurant) {
                        // For cash, go directly to read-back confirmation
                        setShowReadbackModal(true)
                      }
                    }}
                    disabled={cart.length === 0 || !customerInfo.name || !customerInfo.phone || !selectedRestaurant || customerInfo.deliveryType !== "delivery"}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      paymentMethod === "cash"
                        ? "bg-green-600 text-white border-green-600"
                        : "bg-white text-slate-700 border-slate-300 hover:border-green-400"
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span className="text-[10px] font-medium">Efectivo</span>
                  </button>
                  
                  {/* Card-on-File (only if customer has saved cards) */}
                  {customerPaymentMethods.length > 0 && (
                    <div className="border-t border-slate-200 pt-1.5 mt-1">
                      <p className="text-[9px] text-slate-500 mb-1">Tarjetas guardadas:</p>
                      {customerPaymentMethods.map((pm) => (
                        <button
                          key={pm.id}
                          onClick={() => {
                            setSelectedPaymentMethodId(pm.id)
                            setPaymentMethod("saved_card")
                            if (cart.length > 0 && customerInfo.name && customerInfo.phone && selectedRestaurant) {
                              setShowReadbackModal(true)
                            }
                          }}
                          disabled={cart.length === 0 || !customerInfo.name || !customerInfo.phone || !selectedRestaurant}
                          className={`w-full flex items-center gap-2 px-2 py-1 rounded border transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-1 ${
                            selectedPaymentMethodId === pm.id && paymentMethod === "saved_card"
                              ? "bg-indigo-100 text-indigo-700 border-indigo-300"
                              : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"
                          }`}
                        >
                          <span className="text-[10px] font-medium uppercase">{pm.card_brand}</span>
                          <span className="text-[10px]">•••• {pm.card_last_four}</span>
                          <span className="text-[9px] text-slate-400 ml-auto">{pm.card_exp_month}/{pm.card_exp_year}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {customerInfo.deliveryType !== "delivery" && (
                  <p className="text-[9px] text-slate-400 mt-1">
                    Efectivo solo disponible para delivery
                  </p>
                )}
                {(cart.length === 0 || !customerInfo.name || !customerInfo.phone) && (
                  <p className="text-[9px] text-amber-600 mt-1">
                    {cart.length === 0 
                      ? "Agrega items al carrito" 
                      : "Completa nombre y telefono"}
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
                {/* Menu Header with Fast Type-ahead Search */}
                <div className="p-2 border-b border-slate-200 flex items-center gap-2">
                  <h3 className="text-xs font-bold text-slate-800">{selectedRestaurant.name}</h3>
                  <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                    <Input
                      value={menuSearchTerm}
                      onChange={(e) => setMenuSearchTerm(e.target.value)}
                      placeholder="Buscar item rapido..."
                      className="pl-6 h-6 text-[10px]"
                      autoFocus
                    />
                    {/* Type-ahead dropdown for quick item selection */}
                    {menuSearchTerm.length >= 2 && filteredMenuItems.length > 0 && filteredMenuItems.length <= 10 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                        {filteredMenuItems.slice(0, 8).map((item) => (
                          <button
                            key={item.id}
                            onClick={() => {
                              openItemDetail(item)
                              setMenuSearchTerm("")
                            }}
                            className="w-full text-left px-2 py-1.5 hover:bg-rose-50 border-b border-slate-100 last:border-0 flex items-center justify-between"
                          >
                            <div>
                              <span className="text-xs font-medium text-slate-800">{item.name}</span>
                              {item.categories?.name && (
                                <span className="text-[9px] text-slate-400 ml-1">({item.categories.name})</span>
                              )}
                            </div>
                            <span className="text-xs font-semibold text-amber-600">${Number(item.price).toFixed(2)}</span>
                          </button>
                        ))}
                        {filteredMenuItems.length > 8 && (
                          <div className="px-2 py-1 text-[9px] text-slate-400 text-center bg-slate-50">
                            +{filteredMenuItems.length - 8} mas resultados
                          </div>
                        )}
                      </div>
                    )}
                  </div>
<button
                onClick={clearSelection}
                className="text-[10px] text-slate-500 hover:text-rose-600"
              >
                Cambiar
              </button>
              
              {/* Internal Shop Button */}
              {internalShopItems.length > 0 && (
                <div className="relative ml-2">
                  <button
                    onClick={() => setShowInternalShop(!showInternalShop)}
                    className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                      showInternalShop 
                        ? 'bg-purple-600 text-white' 
                        : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                    }`}
                  >
                    <Package className="w-3 h-3" />
                    Tienda Interna
                    {cart.filter(c => c.isInternalShop).length > 0 && (
                      <span className="ml-1 w-4 h-4 bg-purple-800 text-white text-[9px] rounded-full flex items-center justify-center">
                        {cart.filter(c => c.isInternalShop).reduce((sum, c) => sum + c.quantity, 0)}
                      </span>
                    )}
                  </button>
                  
                  {/* Dropdown */}
                  {showInternalShop && (
                    <div className="absolute top-full right-0 mt-1 w-64 bg-white border border-purple-200 rounded-lg shadow-xl z-50 max-h-80 overflow-y-auto">
<div className="p-2 bg-purple-50 border-b border-purple-200 flex items-center justify-between">
  <span className="text-[10px] font-bold text-purple-700">Productos Disponibles</span>
  <button onClick={() => setShowInternalShop(false)} className="text-purple-400 hover:text-purple-600">
  <X className="w-3 h-3" />
  </button>
  </div>
                      <div className="p-2 space-y-1">
                        {internalShopItems.map((item) => {
                          const inCart = cart.filter((c) => c.itemId === `shop-${item.id}`)
                          const totalQty = inCart.reduce((sum, c) => sum + c.quantity, 0)
                          return (
                            <button
                              key={item.id}
                              className="w-full flex items-center justify-between p-2 rounded hover:bg-purple-50 text-left"
                              onClick={() => {
                                const cartItem: CartItem = {
                                  id: `shop-${item.id}-${Date.now()}`,
                                  itemId: `shop-${item.id}`,
                                  name: `[Tienda] ${item.name}`,
                                  price: Number(item.price),
                                  quantity: 1,
                                  description: item.description,
                                  selectedOptions: {},
                                  notes: "",
                                  isInternalShop: true
                                }
                                setCart(prev => [...prev, cartItem])
                                setIsCartOpen(true)
                              }}
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-medium text-purple-800 truncate">{item.name}</p>
                                <p className="text-[10px] text-slate-500">${Number(item.price).toFixed(2)}</p>
                              </div>
                              {totalQty > 0 && (
                                <span className="ml-2 w-5 h-5 bg-purple-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                                  {totalQty}
                                </span>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
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
                  <div key={item.id} className={`rounded p-2 ${item.isInternalShop ? 'bg-purple-50 border border-purple-200' : 'bg-slate-50'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        {item.isInternalShop && (
                          <span className="text-[8px] bg-purple-200 text-purple-700 px-1 py-0.5 rounded mb-0.5 inline-block">
                            TIENDA INTERNA
                          </span>
                        )}
                        <p className={`text-xs font-medium truncate ${item.isInternalShop ? 'text-purple-900' : 'text-slate-900'}`}>{item.name.replace('[Tienda] ', '')}</p>
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
                    <>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-rose-500">
                          Delivery{deliveryDistance > 0 ? ` (${deliveryDistance.toFixed(1)} mi)` : ""}
                          {isCalculatingFee && <span className="ml-1 text-slate-400">...</span>}
                        </span>
                        <span className="text-slate-900">${deliveryFee.toFixed(2)}</span>
                      </div>
                      {dispatchFee > 0 && (
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-rose-500">Dispatch Fee</span>
                          <span className="text-slate-900">${dispatchFee.toFixed(2)}</span>
                        </div>
                      )}
                    </>
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
          <div className="bg-white rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {paymentMethod === "stripe" ? (
              <StripeCheckout
                orderData={{
                  restaurantId: selectedRestaurant.id,
                  restaurantName: selectedRestaurant.name,
                  restaurantAddress: selectedRestaurant.address || "",
                  branchId: null, // Not using branches - each restaurant is a unit
                  branchName: null,
                  customerId: selectedCustomerId, // Link to existing customer if selected
                  paymentProvider: "stripe_athmovil",
                  stripeAccountId: selectedRestaurant.stripe_account_id || null,
                  athmovilPublicToken: selectedRestaurant.athmovil_public_token || null,
                  athmovilEcommerceId: selectedRestaurant.athmovil_ecommerce_id || null,
                  cart: cart.map(item => ({
                    id: item.itemId,
                    name: item.name,
                    price: item.price,
                    quantity: item.quantity,
                    totalPrice: item.price * item.quantity,
                    selectedOptions: item.selectedOptions || {},
                    selectedAddons: [],
                    notes: item.notes,
                    is_internal_shop: false,
                  })),
                  subtotal: subtotal,
                  tax: subtotal * IVU_RATE,
                  deliveryFee: customerInfo.deliveryType === "delivery" ? DELIVERY_FEE : 0,
                  dispatchFee: customerInfo.deliveryType === "delivery" ? DISPATCH_FEE : 0,
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
                    name: customerInfo.name,
                    email: customerInfo.email,
                    phone: customerInfo.phone,
                    company: "",
                    eventDate: customerInfo.eventDate,
                    eventTime: customerInfo.eventTime,
                    address: customerInfo.streetAddress,
                    address2: customerInfo.streetAddress2,
                    city: customerInfo.city,
                    state: customerInfo.state,
                    zip: customerInfo.zip,
                    specialInstructions: customerInfo.specialInstructions,
                  },
                  customerEmail: customerInfo.email,
                  customerPhone: customerInfo.phone,
                  smsConsent: true,
                  includeUtensils: false,
                  deliveryZone: deliveryDistance > 0 ? `Tier (${deliveryDistance.toFixed(1)} mi)` : undefined,
                  deliveryDistance: deliveryDistance > 0 ? deliveryDistance : undefined,
                  order_source: "csr",
                }}
                onSuccess={() => {
                  setShowPaymentModal(false)
                  setOrderSuccess("Pago completado exitosamente")
                  setCart([])
                  setCustomerInfo({
                    phone: "",
                    name: "",
                    email: "",
                    streetAddress: "",
                    streetAddress2: "",
                    city: "",
                    state: "PR",
                    zip: "",
                    deliveryType: "delivery",
                    eventDate: getDefaultDateTime("delivery").date,
                    eventTime: getDefaultDateTime("delivery").time,
                    specialInstructions: "",
                    selectedBranch: "",
                  })
                  setSelectedCustomerId(null)
                  setTimeout(() => setOrderSuccess(null), 5000)
                }}
                onCancel={() => setShowPaymentModal(false)}
              />
            ) : (
              <ATHMovilCheckout
                orderData={{
                  restaurantId: selectedRestaurant.id,
                  restaurantName: selectedRestaurant.name,
                  restaurantAddress: selectedRestaurant.address || "",
                  branchId: null, // Not using branches - each restaurant is a unit
                  branchName: null,
                  customerId: selectedCustomerId,
                  paymentProvider: "stripe_athmovil",
                  athmovilPublicToken: selectedRestaurant.athmovil_public_token,
                  athmovilEcommerceId: selectedRestaurant.athmovil_ecommerce_id,
                  cart: cart.map(item => ({
                    id: item.itemId,
                    menu_item_id: item.itemId,
                    name: item.name,
                    price: item.price,
                    quantity: item.quantity,
                    totalPrice: item.price * item.quantity,
                    selectedOptions: item.selectedOptions || {},
                    selectedAddons: [],
                    is_internal_shop: false,
                  })),
                  subtotal: subtotal,
                  tax: subtotal * IVU_RATE,
                  deliveryFee: customerInfo.deliveryType === "delivery" ? DELIVERY_FEE : 0,
                  dispatchFee: customerInfo.deliveryType === "delivery" ? DISPATCH_FEE : 0,
                  tip: customTip ? parseFloat(customTip) || 0 : (subtotal * tipPercentage / 100),
                  total: (() => {
                    const deliveryFee = customerInfo.deliveryType === "delivery" ? DELIVERY_FEE : 0
                    const dispatchFee = customerInfo.deliveryType === "delivery" ? DISPATCH_FEE : 0
                    const ivu = subtotal * IVU_RATE
                    const tipAmount = customTip ? parseFloat(customTip) || 0 : (subtotal * tipPercentage / 100)
                    return subtotal + deliveryFee + dispatchFee + ivu + tipAmount
                  })(),
                  orderType: customerInfo.deliveryType,
                  customerEmail: customerInfo.email,
                  customerPhone: customerInfo.phone,
                  smsConsent: true,
                  eventDetails: {
                    name: customerInfo.name,
                    email: customerInfo.email,
                    phone: customerInfo.phone,
                    company: "",
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
                  deliveryZone: deliveryDistance > 0 ? `Tier (${deliveryDistance.toFixed(1)} mi)` : undefined,
                  deliveryDistance: deliveryDistance > 0 ? deliveryDistance : undefined,
                  order_source: "csr",
                }}
                onSuccess={() => {
                  setShowPaymentModal(false)
                  setOrderSuccess("Pago ATH Movil completado")
                  setCart([])
                  setCustomerInfo({
                    phone: "",
                    name: "",
                    email: "",
                    streetAddress: "",
                    streetAddress2: "",
                    city: "",
                    state: "PR",
                    zip: "",
                    deliveryType: "delivery",
                    eventDate: getDefaultDateTime("delivery").date,
                    eventTime: getDefaultDateTime("delivery").time,
                    specialInstructions: "",
                    selectedBranch: "",
                  })
                  setSelectedCustomerId(null)
                  setTimeout(() => setOrderSuccess(null), 5000)
                }}
                onCancel={() => setShowPaymentModal(false)}
              />
            )}
          </div>
        </div>
      )}

      {/* Read-back Confirmation Modal */}
      {showReadbackModal && selectedRestaurant && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-200 bg-amber-50 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-amber-800">Confirmar Orden</h3>
                <p className="text-xs text-amber-600">Lea al cliente para confirmar</p>
              </div>
              <button
                onClick={() => setShowReadbackModal(false)}
                className="p-1 hover:bg-amber-200 rounded"
              >
                <X className="w-4 h-4 text-amber-600" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Customer Info */}
              <div className="bg-slate-50 rounded-lg p-3">
                <h4 className="text-xs font-semibold text-slate-700 mb-2">Cliente</h4>
                <div className="text-sm space-y-1">
                  <p><span className="text-slate-500">Nombre:</span> <strong>{customerInfo.name}</strong></p>
                  <p><span className="text-slate-500">Telefono:</span> <strong>{customerInfo.phone}</strong></p>
                  {customerInfo.email && <p><span className="text-slate-500">Email:</span> {customerInfo.email}</p>}
                </div>
              </div>

              {/* Delivery Info */}
              <div className="bg-slate-50 rounded-lg p-3">
                <h4 className="text-xs font-semibold text-slate-700 mb-2">
                  {customerInfo.deliveryType === "delivery" ? "Delivery" : "Pickup"}
                </h4>
                <div className="text-sm space-y-1">
                  <p><span className="text-slate-500">Restaurante:</span> <strong>{selectedRestaurant.name}</strong></p>
                  {customerInfo.deliveryType === "delivery" && (
                    <>
                      <p><span className="text-slate-500">Direccion:</span> <strong>{customerInfo.streetAddress}{customerInfo.streetAddress2 ? `, ${customerInfo.streetAddress2}` : ""}, {customerInfo.city}, {customerInfo.state} {customerInfo.zip}</strong></p>
                      {manualAddressOverride && (
                        <p className="text-xs text-amber-600 flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          Direccion verificada manualmente
                        </p>
                      )}
                    </>
                  )}
                  <p><span className="text-slate-500">Fecha:</span> <strong>{customerInfo.eventDate}</strong> a las <strong>{customerInfo.eventTime}</strong></p>
                  {customerInfo.specialInstructions && (
                    <p><span className="text-slate-500">Notas:</span> {customerInfo.specialInstructions}</p>
                  )}
                </div>
              </div>

              {/* Order Items */}
              <div className="bg-slate-50 rounded-lg p-3">
                <h4 className="text-xs font-semibold text-slate-700 mb-2">Items ({totalItems})</h4>
                <div className="space-y-2">
                  {cart.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span>
                        <strong>{item.quantity}x</strong> {item.name}
                        {item.selectedOptions && Object.keys(item.selectedOptions).length > 0 && (
                          <span className="text-slate-400 text-xs ml-1">
                            ({Object.values(item.selectedOptions).filter(v => v).join(", ")})
                          </span>
                        )}
                      </span>
                      <span className="font-medium">${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>IVU (11.5%):</span>
                    <span>${(subtotal * IVU_RATE).toFixed(2)}</span>
                  </div>
                  {customerInfo.deliveryType === "delivery" && (
                    <>
                      <div className="flex justify-between">
                        <span>Delivery:</span>
                        <span>${DELIVERY_FEE.toFixed(2)}</span>
                      </div>
                      {DISPATCH_FEE > 0 && (
                        <div className="flex justify-between">
                          <span>Dispatch Fee:</span>
                          <span>${DISPATCH_FEE.toFixed(2)}</span>
                        </div>
                      )}
                    </>
                  )}
                  {(customTip || tipPercentage > 0) && (
                    <div className="flex justify-between">
                      <span>Propina:</span>
                      <span>${(customTip ? parseFloat(customTip) || 0 : (subtotal * tipPercentage / 100)).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-lg pt-1 border-t border-amber-300">
                    <span>Total:</span>
                    <span>${(() => {
                      const deliveryFee = customerInfo.deliveryType === "delivery" ? DELIVERY_FEE : 0
                      const dispatchFee = customerInfo.deliveryType === "delivery" ? DISPATCH_FEE : 0
                      const ivu = subtotal * IVU_RATE
                      const tipAmount = customTip ? parseFloat(customTip) || 0 : (subtotal * tipPercentage / 100)
                      return (subtotal + deliveryFee + dispatchFee + ivu + tipAmount).toFixed(2)
                    })()}</span>
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div className="bg-slate-50 rounded-lg p-3">
                <h4 className="text-xs font-semibold text-slate-700 mb-1">Metodo de Pago</h4>
                <p className="text-sm font-medium">
                  {paymentMethod === "cash" && "Efectivo (Pago al recibir)"}
                  {paymentMethod === "saved_card" && customerPaymentMethods.find(pm => pm.id === selectedPaymentMethodId) && (
                    <>Tarjeta guardada: {customerPaymentMethods.find(pm => pm.id === selectedPaymentMethodId)?.card_brand?.toUpperCase()} ••���• {customerPaymentMethods.find(pm => pm.id === selectedPaymentMethodId)?.card_last_four}</>
                  )}
                  {paymentMethod === "stripe" && "Tarjeta de credito"}
                  {paymentMethod === "ath_movil" && "ATH Movil"}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex gap-2">
              <button
                onClick={() => setShowReadbackModal(false)}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors text-sm"
              >
                Editar Orden
              </button>
              <button
                onClick={async () => {
                  // Save new customer if needed
                  let customerId = selectedCustomerId
                  if (!customerId && customerInfo.name && customerInfo.phone) {
                    customerId = await saveNewCustomer()
                  }
                  
                  if (paymentMethod === "cash") {
                    // Process cash order directly
                    try {
                      const deliveryFee = customerInfo.deliveryType === "delivery" ? DELIVERY_FEE : 0
                      const dispatchFee = customerInfo.deliveryType === "delivery" ? DISPATCH_FEE : 0
                      const ivu = subtotal * IVU_RATE
                      const tipAmount = customTip ? parseFloat(customTip) || 0 : (subtotal * tipPercentage / 100)
                      const total = subtotal + deliveryFee + dispatchFee + ivu + tipAmount
                      
                      const response = await fetch("/api/csr/process-cash-order", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          restaurantId: selectedRestaurant.id,
                          customerId,
                          cart: cart.map(item => ({
                            id: item.itemId,
                            name: item.name,
                            price: item.price,
                            quantity: item.quantity,
                            selectedOptions: item.selectedOptions,
                          })),
                          subtotal,
                          tax: ivu,
                          deliveryFee,
                          dispatchFee,
                          tip: tipAmount,
                          total,
                          orderType: customerInfo.deliveryType,
                          eventDetails: {
                            name: customerInfo.name,
                            email: customerInfo.email,
                            phone: customerInfo.phone,
                            eventDate: customerInfo.eventDate,
                            eventTime: customerInfo.eventTime,
                            address: customerInfo.streetAddress,
                            city: customerInfo.city,
                            state: "PR",
                            zip: customerInfo.zip,
                            specialInstructions: customerInfo.specialInstructions,
                          },
                        }),
                      })
                      
                      const result = await response.json()
                      if (result.success) {
                        setShowReadbackModal(false)
                        setOrderSuccess(`Orden #${result.orderNumber} creada - Pago en efectivo`)
                        setCart([])
                        setCustomerInfo({
                          phone: "",
                          name: "",
                          email: "",
                          streetAddress: "",
                          streetAddress2: "",
                          city: "",
                          state: "PR",
                          zip: "",
                          deliveryType: "delivery",
                          eventDate: getDefaultDateTime("delivery").date,
                          eventTime: getDefaultDateTime("delivery").time,
                          specialInstructions: "",
                          selectedBranch: "",
                        })
                        setSelectedCustomerId(null)
                        setCustomerPaymentMethods([])
                        setTimeout(() => setOrderSuccess(null), 5000)
                      } else {
                        alert("Error: " + result.error)
                      }
                    } catch (error) {
                      console.error("Cash order error:", error)
                      alert("Error procesando orden")
                    }
                  } else if (paymentMethod === "saved_card" && selectedPaymentMethodId) {
                    // Process saved card payment
                    try {
                      const pm = customerPaymentMethods.find(p => p.id === selectedPaymentMethodId)
                      if (!pm) {
                        alert("No se encontro el metodo de pago")
                        return
                      }
                      
                      const deliveryFee = customerInfo.deliveryType === "delivery" ? DELIVERY_FEE + DISPATCH_FEE : 0
                      const ivu = subtotal * IVU_RATE
                      const tipAmount = customTip ? parseFloat(customTip) || 0 : (subtotal * tipPercentage / 100)
                      const total = subtotal + deliveryFee + ivu + tipAmount
                      
                      const response = await fetch("/api/csr/process-saved-card", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          restaurantId: selectedRestaurant.id,
                          customerId,
                          stripeCustomerId: pm.provider_customer_id,
                          paymentMethodId: pm.provider_payment_method_id,
                          stripeAccountId: selectedRestaurant.stripe_account_id,
                          cart: cart.map(item => ({
                            id: item.itemId,
                            name: item.name,
                            price: item.price,
                            quantity: item.quantity,
                            selectedOptions: item.selectedOptions,
                          })),
                          subtotal,
                          tax: ivu,
                          deliveryFee,
                          tip: tipAmount,
                          total,
                          orderType: customerInfo.deliveryType,
                          eventDetails: {
                            name: customerInfo.name,
                            email: customerInfo.email,
                            phone: customerInfo.phone,
                            eventDate: customerInfo.eventDate,
                            eventTime: customerInfo.eventTime,
                            address: customerInfo.streetAddress,
                            city: customerInfo.city,
                            state: "PR",
                            zip: customerInfo.zip,
                            specialInstructions: customerInfo.specialInstructions,
                          },
                        }),
                      })
                      
                      const result = await response.json()
                      if (result.success) {
                        setShowReadbackModal(false)
                        setOrderSuccess(`Orden #${result.orderNumber} completada`)
                        setCart([])
                        setCustomerInfo({
                          phone: "",
                          name: "",
                          email: "",
                          streetAddress: "",
                          streetAddress2: "",
                          city: "",
                          state: "PR",
                          zip: "",
                          deliveryType: "delivery",
                          eventDate: getDefaultDateTime("delivery").date,
                          eventTime: getDefaultDateTime("delivery").time,
                          specialInstructions: "",
                          selectedBranch: "",
                        })
                        setSelectedCustomerId(null)
                        setCustomerPaymentMethods([])
                        setTimeout(() => setOrderSuccess(null), 5000)
                      } else {
                        alert("Error: " + result.error)
                      }
                    } catch (error) {
                      console.error("Saved card error:", error)
                      alert("Error procesando pago")
                    }
                  } else {
                    // For Stripe/ATH, close read-back and open payment modal
                    setShowReadbackModal(false)
                    setShowPaymentModal(true)
                  }
                }}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
              >
                {paymentMethod === "cash" ? "Confirmar Orden (Efectivo)" : 
                 paymentMethod === "saved_card" ? "Cobrar Tarjeta Guardada" :
                 "Proceder al Pago"}
              </button>
            </div>
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
