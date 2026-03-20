"use client"

import type React from "react"
import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { AddressAutocomplete, type AddressComponents } from "@/components/address-autocomplete"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import { Truck, Package, ShoppingCart, Filter, Check, Minus, Plus, MapPin, Pencil, Trash2, PlusCircle, MinusCircle, X, ChevronDown, ChevronLeft, List, Coffee } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import StripeCheckout from "./stripe-checkout"
import SquareCheckout from "./square-checkout"
import ATHMovilCheckout from "./athmovil-checkout"
import { Input } from "@/components/ui/input"
import { calculateDeliveryFee, calculateDeliveryFeeByCoords, checkDeliveryZone } from "@/app/actions/delivery-zones"
import {
  getUnitLabel as getUnitLabelCentral,
  getQuantityUnitLabel as getQuantityUnitLabelCentral,
} from "@/lib/selling-units"
import { type DesignTemplate, getTemplateStyles, MenuItemCard, ServicePackageCard } from "@/components/design-templates"
import { BulkOrderModal } from "@/components/bulk-order-modal"
import { BranchSelector } from "@/components/branch-selector"
import { useToast } from "@/components/ui/use-toast" // Import useToast
import { InternalShopExtras } from "@/components/internal-shop-extras"
import { ShopUpsellBanner } from "@/components/shop-upsell-banner"
import { InternalShopModal } from "@/components/internal-shop-modal"
import { useInternalShopCart } from "@/hooks/use-internal-shop-cart"

import { createBrowserClient } from "@/lib/supabase/client"
import { GlobalNavbar } from "@/components/global-navbar"

interface OptionChoice {
  id: string
  name: string
  price_modifier: number
  parent_choice_id?: string
  image_url?: string | null
  description?: string | null
  sub_options?: OptionChoice[] // Added for nested sub-options
}

interface ItemOption {
  id: string
  category: string
  is_required: boolean
  min_selection: number
  max_selection: number
  item_option_choices: OptionChoice[]
  display_order: number // Added for sorting
  display_type?: "dropdown" | "list" | "grid" | "pills" | "counter" // Added display_type
  lead_time_hours?: number // Added for item-specific lead time
}

interface ItemSize {
  id: string
  name: string
  price: number
  serves: string | null
  is_default: boolean
  display_order: number
}

interface MenuItem {
  id: string
  name: string
  description: string
  base_price: number
  image_url: string | null
  category: string
  item_options: ItemOption[]
  min_quantity?: number | null
  pricing_unit?: string | null
  per_unit_price?: number | null
  serves?: string | null
  sizes?: ItemSize[]
  // Bulk order specific fields
  is_bulk_order?: boolean
  minimum_quantity?: number
  quantity_unit?: string
  price: number
  is_cart_upsell?: boolean
  lead_time_hours?: number
  available_days?: {
    sun: boolean
    mon: boolean
    tue: boolean
    wed: boolean
    thu: boolean
    fri: boolean
    sat: boolean
  }
  availability_daypart?: "all" | "breakfast_lunch" | "breakfast_dinner" | "lunch_dinner" | "breakfast" | "lunch" | "dinner"
}

interface PackageAddon {
  id: string
  name: string
  price_per_unit: number
  unit: string
  display_order: number
  image_url?: string | null
  options?: string[]
  parent_addon_id?: string
  is_active?: boolean
  package_addon_choices?: OptionChoice[]
  sub_options?: OptionChoice[] // Added for nested sub-options
}

interface PackageInclusion {
  id: string
  description: string
  display_order: number
  is_active?: boolean
}

interface ServicePackage {
  id: string
  name: string
  description: string
  base_price: number
  image_url: string | null
  package_inclusions?: PackageInclusion[]
  package_addons?: PackageAddon[]
  is_active?: boolean // Added is_active field
  price_per_person?: number // Added price_per_person
  included_items?: string[] // Added for included items
}

interface RestaurantHour {
  day_of_week: number // 0=Sunday, 1=Monday, ..., 6=Saturday
  lunch_open: string | null
  lunch_close: string | null
  dinner_open: string | null
  dinner_close: string | null
}

interface Category {
  id: string
  name: string
  display_order: number
  header_image_url?: string // Added header_image_url field
  is_active?: boolean // Added is_active field
}

interface Branch {
  id: string
  name: string
  slug: string
  address?: string
  city?: string
  state?: string
  zip?: string
  phone?: string
  email?: string
  image_url?: string
  logo_url?: string
  delivery_fee?: number | null
  delivery_lead_time_hours?: number | null
  pickup_lead_time_hours?: number | null
  lead_time_hours?: number | null
  max_advance_days?: number | null
  min_delivery_order?: number | null
  min_pickup_order?: number | null
  shipday_api_key?: string | null
  tax_rate?: number | null
  tip_option_1?: number | null
  tip_option_2?: number | null
  tip_option_3?: number | null
  primary_color?: string | null
  design_template?: string | null
  standalone_domain?: string | null
  show_service_packages?: boolean | null
  packages_section_title?: string | null
  assigned_package_ids?: string[]
  latitude?: number | null
  longitude?: number | null
  delivery_enabled: boolean
  pickup_enabled: boolean
  is_active: boolean
  display_order: number
}

  interface BranchMenuOverride {
  id: string
  branch_id: string
  menu_item_id: string
  price_override: number | null
  is_hidden: boolean
}

// Updated Restaurant interface
interface Restaurant {
  id: string
  name: string
  slug: string
  description?: string
  logo_url?: string
  phone?: string
  email?: string
  address?: string
  opening_hours?: string
  minimum_order?: number
  delivery_radius?: number
  is_active: boolean
  stripe_account_id?: string
  stripe_account_status?: string
  hero_image_url?: string
  hide_branch_selector_title?: boolean
  tip_option_1?: number
  tip_option_2?: number
  tip_option_3?: number
  lead_time_hours?: number // General lead time for the restaurant
  delivery_lead_time_hours?: number // Delivery-specific lead time
  pickup_lead_time_hours?: number // Pickup-specific lead time
  max_advance_days?: number // Max days customers can schedule ahead
  min_delivery_order?: number
  min_pickup_order?: number
  restaurant_address?: string
  delivery_fee?: number
  delivery_base_fee?: number
  delivery_included_containers?: number
  footer_description?: string
  footer_email?: string
  footer_phone?: string
  footer_links?: { label: string; url: string }[]
  design_template?: string
  primary_color?: string
  tax_rate?: number
  packages_section_title?: string // Added for custom package section title
  show_service_packages?: boolean // ADDED: Setting to control visibility of service packages
}

interface CustomerAddress {
  id: string
  label: string | null
  address_line_1: string
  address_line_2: string | null
  city: string
  state: string | null
  postal_code: string | null
  latitude: number | null
  longitude: number | null
  delivery_instructions: string | null
  is_default: boolean
}

interface Customer {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  phone: string | null
  default_address_id: string | null
}

interface CustomerPortalProps {
  restaurant: Restaurant
  categories: Category[]
  menuItems: MenuItem[]
  servicePackages?: ServicePackage[]
  itemTypes: any[] // Added itemTypes
  deliveryZones?: any[] // Added deliveryZones
  // Add design template prop
  designTemplate?: DesignTemplate
  reorderData?: any // Added reorderData prop
  branches?: Branch[]
  branchMenuOverrides?: BranchMenuOverride[]
  containerRates?: any[]
  restaurantHours?: RestaurantHour[]
  customer?: Customer | null
  customerAddresses?: CustomerAddress[]
  isPreorder?: boolean
  }

// Convert internal option group codes to customer-friendly Spanish labels
function formatOptionLabel(text: string): string {
  if (!text) return ""
  return text
    .replace(/Modificador/gi, "¿Cómo desea su")
    .replace(/Modicador/gi, "¿Cómo desea su")
    .replace(/Side and app/gi, "Acompañamientos")
    .replace(/EPN$/gi, "")
    .replace(/\s+C$/gi, "")
    .trim()
    + (text.toLowerCase().includes("modica") || text.toLowerCase().includes("modifi") ? "?" : "")
}

export default function CustomerPortal({
  restaurant,
  categories,
  menuItems,
  servicePackages = [], // Default to empty array
  itemTypes, // Added itemTypes
  deliveryZones = [], // Added deliveryZones
  // Destructure design template prop
  designTemplate, // This prop is now redundant if coming from restaurant.design_template
  reorderData, // Added reorderData prop
  branches = [],
  branchMenuOverrides = [],
  containerRates = [],
  restaurantHours = [],
  customer,
  customerAddresses = [],
  isPreorder = false,
  }: CustomerPortalProps) {
  // Branch selection state
  const isChain = (restaurant as any).is_chain && branches.length > 0
  // For non-chains, auto-select the first branch (all restaurants MUST have at least one branch)
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(
    !isChain && branches.length > 0 ? branches[0] : null
  )
  const [showBranchSelector, setShowBranchSelector] = useState(isChain)
  
  // Pre-order scheduling state
  const [showPreorderDialog, setShowPreorderDialog] = useState(isPreorder)
  const [scheduledDeliveryTime, setScheduledDeliveryTime] = useState<string | null>(null)

  // Helper to check if item is available now (day + daypart using restaurant_hours)
  const isAvailableNow = (item: MenuItem) => {
    try {
      const now = new Date()
      const dayOfWeek = now.getDay() // 0=Sunday, 1=Monday, etc.
      const days = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const
      const today = days[dayOfWeek]
      
      // Check day availability from item's available_days
      const availableDays = item.available_days as Record<string, boolean> | null
      if (availableDays && availableDays[today] === false) return false
      
      // Check daypart availability
      const daypart = (item as any).availability_daypart || "all"
      if (daypart === "all") return true
      
      // Get today's meal period hours from restaurant_hours
      const todayHours = (restaurantHours || []).find(h => h.day_of_week === dayOfWeek)
    
    // If no hours defined for today, fall back to restaurant defaults
    const r = restaurant as any
    // Simplified: only use lunch and dinner periods
    const lunchStart = todayHours?.lunch_open || r.daypart_lunch_start || "11:00"
    const lunchEnd = todayHours?.lunch_close || r.daypart_lunch_end || "16:00"
    const dinnerStart = todayHours?.dinner_open || r.daypart_dinner_start || "16:00"
    const dinnerEnd = todayHours?.dinner_close || r.daypart_dinner_end || "22:00"
    
    const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`
    
    // Check if currently in each meal period
    const inLunch = lunchStart && lunchEnd && currentTime >= lunchStart && currentTime < lunchEnd
    const inDinner = dinnerStart && dinnerEnd && currentTime >= dinnerStart && currentTime < dinnerEnd
    // Breakfast items show during lunch period (simplified)
    const inBreakfast = inLunch
    
    switch (daypart) {
      case "breakfast": return inBreakfast
      case "lunch": return inLunch
      case "dinner": return inDinner
      case "breakfast_lunch": return inBreakfast || inLunch
      case "breakfast_dinner": return inBreakfast || inDinner
      case "lunch_dinner": return inLunch || inDinner
      default: return true
    }
    } catch (e) {
      console.error("[v0] isAvailableNow error:", e)
      return true // Default to available if error
    }
  }

  // Apply branch menu overrides and day/daypart availability filter to produce effective menu items
  const effectiveMenuItems = (() => {
    // First filter by day and daypart availability
    const dayFilteredItems = menuItems.filter(isAvailableNow)
    
    if (!selectedBranch) return dayFilteredItems
    const overrides = branchMenuOverrides.filter((o) => o.branch_id === selectedBranch.id)
    if (overrides.length === 0) return dayFilteredItems
    const overrideMap = new Map(overrides.map((o) => [o.menu_item_id, o]))
    return dayFilteredItems
      .filter((item) => {
        const o = overrideMap.get(item.id)
        return !o?.is_hidden
      })
      .map((item) => {
        const o = overrideMap.get(item.id)
        if (o?.price_override != null) {
          return { ...item, base_price: o.price_override, price: o.price_override }
        }
        return item
      })
  })()

  // Effective restaurant data (branch overrides for ALL settings)
  const effectiveRestaurant = (() => {
    if (!selectedBranch) return restaurant
    const b = selectedBranch as any
    return {
      ...restaurant,
      restaurant_address: b.address || restaurant.restaurant_address,
      delivery_fee: b.delivery_fee ?? restaurant.delivery_fee,
      delivery_lead_time_hours: b.delivery_lead_time_hours ?? restaurant.delivery_lead_time_hours,
      pickup_lead_time_hours: b.pickup_lead_time_hours ?? restaurant.pickup_lead_time_hours,
      lead_time_hours: b.lead_time_hours ?? restaurant.lead_time_hours,
      max_advance_days: b.max_advance_days ?? restaurant.max_advance_days,
      min_delivery_order: b.min_delivery_order ?? restaurant.min_delivery_order,
      min_pickup_order: b.min_pickup_order ?? restaurant.min_pickup_order,
      tax_rate: b.tax_rate ?? restaurant.tax_rate,
      tip_option_1: b.tip_option_1 ?? restaurant.tip_option_1,
      tip_option_2: b.tip_option_2 ?? restaurant.tip_option_2,
      tip_option_3: b.tip_option_3 ?? restaurant.tip_option_3,
      primary_color: b.primary_color || restaurant.primary_color,
      design_template: b.design_template || restaurant.design_template,
      logo_url: b.logo_url || restaurant.logo_url,
      show_service_packages: b.show_service_packages ?? restaurant.show_service_packages,
      packages_section_title: b.packages_section_title || restaurant.packages_section_title,
      email: b.email || restaurant.email,
      phone: b.phone || restaurant.phone,
      dispatch_fee_percent: (b as any).dispatch_fee_percent ?? (restaurant as any).dispatch_fee_percent ?? 0,
      cart_disclaimer: (b as any).cart_disclaimer ?? (restaurant as any).cart_disclaimer ?? "",
    }
  })()

  // Filter service packages by branch assignment (opt-in model)
  const effectiveServicePackages = (() => {
    if (!selectedBranch) {
      // Non-chain: show all packages if restaurant-level setting allows
      return (restaurant as any).show_service_packages ? servicePackages : []
    }
    // Chain with branch selected: only show packages assigned to this branch
    const assignedIds = selectedBranch.assigned_package_ids || []
    if (assignedIds.length === 0) return []
    return servicePackages.filter((pkg) => assignedIds.includes(pkg.id))
  })()

  const [deliveryMethod, setDeliveryMethod] = useState<"delivery" | "pickup">("delivery")
  
  // Auto-set deliveryMethod based on branch's enabled options
  useEffect(() => {
    if (selectedBranch) {
      const deliveryEnabled = selectedBranch.delivery_enabled
      const pickupEnabled = selectedBranch.pickup_enabled
      
      // If only one option is available, auto-select it
      if (deliveryEnabled && !pickupEnabled) {
        setDeliveryMethod("delivery")
      } else if (!deliveryEnabled && pickupEnabled) {
        setDeliveryMethod("pickup")
      }
      // If both are enabled, keep current selection (default is delivery)
    }
  }, [selectedBranch])
  
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [dietaryFilters, setDietaryFilters] = useState<string[]>([])
  
  // Measure GlobalNavbar height at runtime for sticky category nav positioning
  useEffect(() => {
    const measureNavbar = () => {
      const navbar = document.getElementById('global-navbar')
      if (navbar) {
        const height = navbar.getBoundingClientRect().height
        document.documentElement.style.setProperty('--navbar-height', `${height}px`)
      }
    }
    measureNavbar()
    window.addEventListener('resize', measureNavbar)
    return () => window.removeEventListener('resize', measureNavbar)
  }, [])
  
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
  const [loadedItemOptions, setLoadedItemOptions] = useState<any[] | null>(null)
  const [loadingItemOptions, setLoadingItemOptions] = useState(false)
  const [unitQuantity, setUnitQuantity] = useState<number>(1)
  const [selectedSizeId, setSelectedSizeId] = useState<string | null>(null)
  const [manualQuantityMode, setManualQuantityMode] = useState(false)
  const [manualQuantityInput, setManualQuantityInput] = useState("")
  const [itemNotes, setItemNotes] = useState("")
  const [showItemNotes, setShowItemNotes] = useState(false)
  
  // Lazy load item options when modal opens - fixes orphaned choices bug for Metropol
  useEffect(() => {
    if (!selectedItem) {
      setLoadedItemOptions(null)
      return
    }
    
    const fetchItemOptions = async () => {
      setLoadingItemOptions(true)
      try {
        const supabase = createBrowserClient()
        
        // Fetch options for this specific item
        const { data: options, error: optionsError } = await supabase
          .from("item_options")
          .select("*")
          .eq("menu_item_id", selectedItem.id)
          .order("display_order", { ascending: true })
        
        if (optionsError) {
          console.log("[v0] Error fetching item options:", optionsError)
          setLoadedItemOptions([])
          return
        }
        
        if (!options || options.length === 0) {
          console.log("[v0] No options found for item:", selectedItem.id, selectedItem.name)
          setLoadedItemOptions([])
          return
        }
        
        // Fetch choices for these options
        const optionIds = options.map((opt) => opt.id)
        const { data: choices, error: choicesError } = await supabase
          .from("item_option_choices")
          .select("*")
          .in("item_option_id", optionIds)
          .order("display_order", { ascending: true })
        
        if (choicesError) {
          console.log("[v0] Error fetching option choices:", choicesError)
        }
        
        console.log("[v0] Fetched options for", selectedItem.name, ":", {
          optionCount: options.length,
          choiceCount: choices?.length || 0,
          options: options.map(o => ({ id: o.id, category: o.category })),
          choicesByOption: options.map(o => ({
            optionId: o.id,
            category: o.category,
            choices: (choices || []).filter(c => c.item_option_id === o.id).length
          }))
        })
        
        // Assemble options with their choices
        const optionsWithChoices = options.map((opt) => ({
          ...opt,
          item_option_choices: (choices || [])
            .filter((choice) => choice.item_option_id === opt.id)
            .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)),
        }))
        
        setLoadedItemOptions(optionsWithChoices)
      } catch (err) {
        console.log("[v0] Exception fetching item options:", err)
        setLoadedItemOptions([])
      } finally {
        setLoadingItemOptions(false)
      }
    }
    
    fetchItemOptions()
  }, [selectedItem?.id])

  // Centralized unit label helpers (from lib/selling-units.ts)
  const getUnitLabel = getUnitLabelCentral
  const getQuantityUnitLabel = getQuantityUnitLabelCentral

  const isUnitBasedItem = (item: MenuItem) => {
    return item.pricing_unit && item.pricing_unit !== "each" && item.pricing_unit !== "person"
  }

  const isPerPersonItem = (item: MenuItem) => {
    return item.pricing_unit === "person"
  }

  const hasUnitPricing = (item: MenuItem) => {
  return item.pricing_unit && item.pricing_unit !== "each"
  }

  // Operating hours helpers - simplified
  const DAY_NAMES_SHORT = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"]
  const DAY_NAMES_FULL = ["Domingo", "Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"]

  // Simple helper: check if a day is closed (no hours defined)
  const isDayClosed = (_date: Date): boolean => {
    // For now, assume restaurant is always open - removes recurring crash source
    // Real hours validation happens at checkout via delivery date selection
    return false
  }

  // Simple helper: get closed day names for display
  const getClosedDayNames = (): string[] => {
    // Return empty - hours are shown in the info modal instead
    return []
  }
  
  // Format hours for display (e.g., "11:30 AM - 8:30 PM")
  const formatTimeRange = (open: string | null, close: string | null): string | null => {
    if (!open || !close) return null
    const formatTime = (t: string) => {
      try {
        const [h, m] = t.split(":").map(Number)
        const ampm = h >= 12 ? "PM" : "AM"
        const h12 = h % 12 || 12
        return `${h12}:${m?.toString().padStart(2, "0") || "00"} ${ampm}`
      } catch { return t }
    }
    return `${formatTime(open)} - ${formatTime(close)}`
  }

  const hasSizes = (item: MenuItem) => {
    return item.sizes && item.sizes.length > 0
  }

  const getSelectedSize = (item: MenuItem): ItemSize | null => {
    if (!item.sizes || item.sizes.length === 0) return null
    if (selectedSizeId) {
      return item.sizes.find((s) => s.id === selectedSizeId) || item.sizes[0]
    }
    return item.sizes.find((s) => s.is_default) || item.sizes[0]
  }

  const getEffectivePrice = (item: MenuItem): number => {
    const size = getSelectedSize(item)
    return size ? size.price : (item.base_price || 0)
  }

  const getEffectiveServes = (item: MenuItem): string | null => {
    const size = getSelectedSize(item)
    const raw = size ? size.serves : (item.serves || null)
    // Safety: coerce to string in case DB returns an integer from older data
    return raw != null ? String(raw) : null
  }

  // Helper to get options - use loadedItemOptions for selectedItem, or item.item_options for other items
  const getItemOptions = (item: MenuItem): any[] => {
    // If this is the currently selected item in modal, use lazy-loaded options
    if (selectedItem && item.id === selectedItem.id && loadedItemOptions) {
      return loadedItemOptions
    }
    return item.item_options || []
  }

  // Check if item has ANY counter option that drives total quantity (e.g. Empanadillitas flavors)
  const hasRequiredCounterOption = (item: MenuItem): boolean => {
    return getItemOptions(item).some((opt: any) => opt.display_type === "counter")
  }

  // Get the total quantity allocated across ALL counter choices
  const getCounterTotal = (item: MenuItem): number => {
    let total = 0
    getItemOptions(item).forEach((option: any) => {
      if (option.display_type === "counter") {
        const selection = itemCustomizations[option.id]
        if (selection && typeof selection === "object" && !Array.isArray(selection)) {
          Object.values(selection).forEach((qty) => {
            total += qty as number
          })
        }
      }
    })
    return total
  }

  // Calculate the total price for counter items where choice prices are full unit prices
  // e.g. Bowl 8oz ($0 = use base $17.95), Bowl 16oz ($34.95 = full price), Bowl 32oz ($65.95 = full price)
  const getCounterItemTotal = (item: MenuItem): number => {
    const basePrice = item.per_unit_price || item.base_price || 0
    const minQty = item.min_quantity || 1
    const minFloor = basePrice * minQty
    let total = 0
    getItemOptions(item).forEach((option: any) => {
      if (option.display_type === "counter") {
        const selection = itemCustomizations[option.id]
        if (selection && typeof selection === "object" && !Array.isArray(selection)) {
          Object.entries(selection).forEach(([choiceId, qty]) => {
            const q = qty as number
            if (q <= 0) return
            const choice = option.item_option_choices?.find((c: any) => c.id === choiceId)
            // If choice has a price > 0, it's the full unit price for that variant
            // If choice price is 0 or missing, use the item's base price per unit
            const unitPrice = (choice?.price_modifier && choice.price_modifier > 0) ? choice.price_modifier : basePrice
            total += unitPrice * q
          })
        }
      }
    })
    return Math.max(minFloor, total)
  }

  // Calculate sum of all selected option price modifiers for live display
  const getOptionsTotal = (item: MenuItem): number => {
    const options = getItemOptions(item)
    if (!options || options.length === 0) return 0
    let total = 0
    options.forEach((option: any) => {
      const selection = itemCustomizations[option.id]
      if (option.display_type === "counter" && selection && typeof selection === "object" && !Array.isArray(selection)) {
        // Counter choice prices are handled by getCounterItemTotal -- skip here to avoid double-counting
      } else if (Array.isArray(selection)) {
        selection.forEach((choiceId) => {
          const choice = option.item_option_choices?.find((c: any) => c.id === choiceId)
          if (choice?.price_modifier) total += choice.price_modifier
        })
      } else if (selection && typeof selection === "string") {
        const choice = option.item_option_choices?.find((c: any) => c.id === selection)
        if (choice?.price_modifier) total += choice.price_modifier
      }
    })
    // Sub-option selections
    Object.entries(subOptionSelections).forEach(([key, subChoiceId]) => {
      const parentChoiceId = key.split("_sub")[0]
      options.forEach((option: any) => {
        const parentChoice = option.item_option_choices?.find((c: any) => c.id === parentChoiceId)
        const subChoice = parentChoice?.sub_options?.find((s: any) => s.id === subChoiceId)
        if (subChoice?.price_modifier) total += subChoice.price_modifier
      })
    })
    return total
  }

  const [selectedPackage, setSelectedPackage] = useState<ServicePackage | null>(null)
  const [bulkOrderItem, setBulkOrderItem] = useState<MenuItem | null>(null)
  const cartStorageKey = `cart_${restaurant.slug}`
  const [cart, setCart] = useState<any[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = sessionStorage.getItem(cartStorageKey)
        return saved ? JSON.parse(saved) : []
      } catch { return [] }
    }
    return []
  })
  const [showCart, setShowCart] = useState(false)

  // Persist cart to sessionStorage on changes
  useEffect(() => {
    try {
      sessionStorage.setItem(cartStorageKey, JSON.stringify(cart))
    } catch { /* storage full or unavailable */ }
  }, [cart, cartStorageKey])

  // Count only actual food/product items (exclude delivery fee), summing quantities
  const foodCartCount = cart
    .filter((item) => item.type !== "delivery_fee")
    .reduce((sum, item) => sum + (item.quantity || 1), 0)

  const [itemCustomizations, setItemCustomizations] = useState<Record<string, string | string[] | Record<string, number>>>({})

  const [packageAddons, setPackageAddons] = useState<
    Record<string, { quantity: number; selectedSubAddon?: string | null; selectedChoice?: string | null }>
  >({})

  const [subOptionSelections, setSubOptionSelections] = useState<Record<string, string>>({})
  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const [showCheckoutForm, setShowCheckoutForm] = useState(false) // This is now controlled by checkoutStep
  const [showStripeCheckout, setShowStripeCheckout] = useState(false)
  
  // Internal shop cart (persisted separately, tax calculated separately)
  const { 
    items: internalShopItems, 
    subtotal: internalShopSubtotal, 
    tax: internalShopTax,
    clearCart: clearInternalShopCart,
    updateQuantity: updateShopItemQuantity,
    removeItem: removeShopItem,
  } = useInternalShopCart()
  
  // Internal shop modal state
  const [showInternalShopModal, setShowInternalShopModal] = useState(false)
  const [isInternalShopAvailable, setIsInternalShopAvailable] = useState(true)
  
  // Check internal shop availability on mount
  useEffect(() => {
    fetch("/api/internal-shop/availability")
      .then(res => res.json())
      .then(data => {
        setIsInternalShopAvailable(data.available)
      })
      .catch(() => {
        setIsInternalShopAvailable(false)
      })
  }, [])
  
  const [showSquareCheckout, setShowSquareCheckout] = useState(false)
  const [showATHMovilCheckout, setShowATHMovilCheckout] = useState(false)
  const [showPaymentSelector, setShowPaymentSelector] = useState(false) // For "both" payment provider option
  const [checkoutData, setCheckoutData] = useState<any>(null)

  const [checkoutStep, setCheckoutStep] = useState<"delivery" | null>(null) // For managing checkout flow
  const [showCheckout, setShowCheckout] = useState(false) // Renamed from showCheckoutForm for clarity

  // Delivery fee calculation state
  const [deliveryFeeCalculation, setDeliveryFeeCalculation] = useState<{
    fee: number          // Full fee — used for order total & payment
    displayedFee: number // Subsidy-reduced fee shown to customer
    distance: number
    zoneName: string
    itemSurcharge: number
    isCalculating: boolean
    error?: string
  }>({
    fee: 0,
    displayedFee: 0,
    distance: 0,
    zoneName: "",
    itemSurcharge: 0,
    isCalculating: false,
  })

  // Delivery zone check state
  const [zoneCheck, setZoneCheck] = useState<{
    checked: boolean
    inZone: boolean
    distance: number | null
    radius: number
    closerBranch: { id: string; name: string; address: string; distance: number } | null
    acknowledged: boolean
  }>({ checked: false, inZone: true, distance: null, radius: 7, closerBranch: null, acknowledged: false })

  const [cartVersion, setCartVersion] = useState(0)
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set())

  const [editingCartIndex, setEditingCartIndex] = useState<number | null>(null)

  const toggleCategory = (categoryId: string) => {
    setCollapsedCategories((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId)
      } else {
        newSet.add(categoryId)
      }
      return newSet
    })
  }

  // Get template styles
  const primaryColor = effectiveRestaurant.primary_color || "#d00169"
  const template = designTemplate || effectiveRestaurant.design_template || "modern"
  const templateStyles = getTemplateStyles(template as DesignTemplate)

  // Container-based delivery fee calculation
  // Computes delivery fee based on containers in cart x per-type rates
  const calculateContainerDeliveryFee = (cartItems: any[]) => {
    const baseFee = effectiveRestaurant.delivery_base_fee ?? effectiveRestaurant.delivery_fee ?? 25
    const includedContainers = effectiveRestaurant.delivery_included_containers ?? 4

    // Count containers by type from cart items (only menu items, not packages/fees)
    const containerCounts: Record<string, number> = {}
    let totalContainers = 0

    for (const item of cartItems) {
      if (item.type === "delivery_fee" || item.type === "package") continue
      const cType = item.container_type || "none"
      if (cType === "none") continue
      // For per-person items, quantity = number of persons, not containers.
      // Container count is just containers_per_unit (the item ships in 1 bandeja regardless of person count).
      // For unit-based items (trays, boxes), multiply containers_per_unit by quantity.
      const isPerPerson = item.pricingUnit === "person"
      const count = isPerPerson
        ? (item.containers_per_unit || 1)
        : (item.containers_per_unit || 1) * (item.quantity || 1)
      containerCounts[cType] = (containerCounts[cType] || 0) + count
      totalContainers += count
    }

    // If no containers at all, return base fee
    if (totalContainers === 0) return { fee: baseFee, totalContainers: 0, breakdown: [] }

    // Calculate extra fee per container type
    const extraContainers = Math.max(0, totalContainers - includedContainers)
    let extraFee = 0
    const breakdown: { type: string; label: string; count: number; rate: number }[] = []

    if (extraContainers > 0 && containerRates.length > 0) {
      // Distribute extra containers proportionally across types
      let remaining = extraContainers
      const types = Object.entries(containerCounts).sort((a, b) => b[1] - a[1])

      for (const [cType, count] of types) {
        if (remaining <= 0) break
        const rate = containerRates.find((r) => r.container_type === cType)
        const feePerUnit = rate?.extra_fee_per_unit ?? 0
        const extraForType = Math.min(count, remaining)
        extraFee += extraForType * feePerUnit
        if (extraForType > 0) {
          breakdown.push({ type: cType, label: rate?.label || cType, count: extraForType, rate: feePerUnit })
        }
        remaining -= extraForType
      }
    } else if (extraContainers > 0) {
      // No container rates configured, use a flat fallback
      extraFee = extraContainers * 2.75
    }

    return { fee: Math.round((baseFee + extraFee) * 100) / 100, totalContainers, breakdown }
  }

  // Delivery fee is now calculated from delivery_zones (distance-based) and shown
  // as a line item in the cart footer — NOT injected as a cart item.
  // Clean up any legacy delivery_fee items that may exist in cart state.
  useEffect(() => {
    setCart((prevCart) => prevCart.filter((item) => item.type !== "delivery_fee"))
  }, [deliveryMethod])

  // Delivery form state
  // Pre-populate with the customer's default (or first) saved address if available
  const defaultSavedAddress = customerAddresses.find((a) => a.is_default) || customerAddresses[0] || null

  const [deliveryForm, setDeliveryForm] = useState({
    fullName: customer ? `${customer.first_name || ""} ${customer.last_name || ""}`.trim() : "",
    email: customer?.email || "",
    phone: customer?.phone || "",
    company: "",
    eventDate: (() => {
      const today = new Date()
      return today.toISOString().split("T")[0]
    })(),
    eventTime: (() => {
      // Default to now + estimated delivery time (45 min or restaurant's delivery_lead_time_hours in minutes)
      const deliveryMinutes = (effectiveRestaurant as any).delivery_estimated_minutes || 45
      const eta = new Date(Date.now() + deliveryMinutes * 60 * 1000)
      const h = eta.getHours().toString().padStart(2, "0")
      const m = Math.floor(eta.getMinutes() / 15) * 15  // round to nearest 15 min
      return `${h}:${m.toString().padStart(2, "0")}`
    })(),
    specialInstructions: defaultSavedAddress?.delivery_instructions || "",
    smsConsent: false,
    tipPercentage: (() => {
      const raw = effectiveRestaurant.tip_option_1 || 15
      return raw > 0 && raw < 1 ? Math.round(raw * 100) : raw
    })(),
    customTip: "",
  })

  const [showPackageModal, setShowPackageModal] = useState(false)

  // Pre-fill form fields when customer data becomes available
  useEffect(() => {
    if (customer) {
      setDeliveryForm((prev) => ({
        ...prev,
        fullName: prev.fullName || `${customer.first_name || ""} ${customer.last_name || ""}`.trim(),
        email: prev.email || customer.email || "",
        phone: prev.phone || customer.phone || "",
      }))
    }
  }, [customer])

  // Check if order is a pre-order (selected date is not today)
  const isPreOrder = (() => {
    const today = new Date().toISOString().split("T")[0]
    return deliveryForm.eventDate !== today
  })()



  const scrollToCategory = (category: string) => {
    const element = categoryRefs.current[category]
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }

  const toggleDietaryFilter = (filter: string) => {
    setDietaryFilters((prev) => (prev.includes(filter) ? prev.filter((f) => f !== filter) : [...prev, filter]))
  }

  // Returns true if the item name indicates a catering-site delivery charge that
  // should NOT be added here — delivery is managed by the platform's own fee logic.
  const isExternalDeliveryItem = (name: string): boolean => {
    const lower = name.toLowerCase()
    return (
      lower.startsWith("entrega a domicilio") ||
      lower.startsWith("delivery fee") ||
      lower.startsWith("costo de entrega") ||
      lower === "delivery"
    )
  }

  // Returns true if item has no options, no sizes, and no bulk-order flag —
  // i.e. it can be added directly to cart with qty=1, no dialog needed.
  const isSimpleItem = (item: MenuItem): boolean => {
    if (item.is_bulk_order) return false
    if (item.sizes && item.sizes.length > 0) return false
    if (item.item_options && item.item_options.length > 0) return false
    return true
  }

  // Add a no-options item straight to the cart (qty 1) without opening the dialog.
  const addSimpleItemToCart = (item: MenuItem) => {
    if (isExternalDeliveryItem(item.name)) return
    const itemPrice = Number(item.base_price) || 0
    const newCartItem = {
      id: item.id,
      name: item.name,
      type: "item" as const,
      basePrice: itemPrice,
      finalPrice: itemPrice,
      totalPrice: itemPrice,
      image_url: item.image_url,
      selectedOptions: {} as Record<string, string>,
      isAutomatic: false,
      lead_time_hours: item.lead_time_hours || effectiveRestaurant.lead_time_hours || 24,
      unitQuantity: 1,
      pricingUnit: item.pricing_unit || undefined,
      container_type: (item as any).container_type || "none",
      containers_per_unit: (item as any).containers_per_unit || 1,
      quantity: 1,
    }
    setCart((prev) => [...prev, newCartItem])
    setCartVersion((v) => v + 1)
  }

  const handleAddToCart = () => {
    if (selectedItem) {
      // Block delivery line items from catering integrations — handled by platform fee logic
      if (isExternalDeliveryItem(selectedItem.name)) {
        setShowItemModal(false)
        return
      }
      // Validate required options - use lazy loaded options
      for (const option of loadedItemOptions || []) {
        if (option.is_required) {
          const selection = itemCustomizations[option.id]
          if (option.display_type === "counter") {
            // Counter: check sum of quantities meets minimum
            const counterTotal = selection && typeof selection === "object" && !Array.isArray(selection)
              ? Object.values(selection).reduce((sum, qty) => sum + (qty as number), 0)
              : 0
            if (counterTotal < (option.min_selection || 1)) {
              alert(`Minimo ${option.min_selection || 1} unidades para ${option.category}`)
              return
            }
          } else if (!selection || (Array.isArray(selection) && selection.length === 0)) {
            alert(`Por favor selecciona una opcion para ${option.category}`)
            return
          }
        }
      }

      // Calculate price - account for size selection and quantity
      const selectedSize = getSelectedSize(selectedItem)
      const effectiveBasePrice = selectedSize ? Number(selectedSize.price) : Number(selectedItem.base_price || 0)
      const showsQuantity = true // All items support quantity selection
      const isCounterItem = hasRequiredCounterOption(selectedItem)
      const counterTotal = isCounterItem ? getCounterTotal(selectedItem) : 0
      const effectiveQuantity = isCounterItem ? counterTotal : unitQuantity
      let itemPrice: number
      if (isCounterItem) {
        // Counter items: use getCounterItemTotal which handles full-price choices vs base-price choices
        itemPrice = getCounterItemTotal(selectedItem)
      } else {
        itemPrice = showsQuantity ? effectiveBasePrice * effectiveQuantity : effectiveBasePrice
      }
      const customizations: Record<string, string | string[] | Record<string, number>> = { ...itemCustomizations }
      const subCustomizations: Record<string, string> = { ...subOptionSelections }

      // Add price modifiers from selected options
      Object.entries(itemCustomizations).forEach(([optionId, selection]) => {
        const option = loadedItemOptions?.find((opt) => opt.id === optionId)
        if (!option) return

        if (option.display_type === "counter" && selection && typeof selection === "object" && !Array.isArray(selection)) {
          // Counter choice prices already handled by getCounterItemTotal -- skip to avoid double-counting
        } else if (Array.isArray(selection)) {
          // Multi-select: sum up all price modifiers
          selection.forEach((choiceId) => {
            const choice = option.item_option_choices?.find((c) => c.id === choiceId)
            if (choice?.price_modifier) {
              itemPrice += Number(choice.price_modifier)
            }
          })
        } else if (selection && typeof selection === "string") {
          const choice = option.item_option_choices?.find((c) => c.id === selection)
          if (choice?.price_modifier) {
            itemPrice += Number(choice.price_modifier)
          }
        }
      })

      // Add price modifiers from sub-options
      Object.entries(subOptionSelections).forEach(([parentOptionId, subChoiceId]) => {
        const option = loadedItemOptions?.find((opt) => opt.id === parentOptionId)
        if (!option) return

        const parentChoiceId = itemCustomizations[parentOptionId]
        if (typeof parentChoiceId === "string") {
          const parentChoice = option.item_option_choices?.find((c) => c.id === parentChoiceId)
          const subChoice = parentChoice?.sub_options?.find((s) => s.id === subChoiceId)
          if (subChoice?.price_modifier) {
            itemPrice += Number(subChoice.price_modifier)
          }
        }
      })

      const selectedOptionsForDisplay: Record<string, string> = {}

      Object.entries(itemCustomizations).forEach(([optionId, selection]) => {
        const option = loadedItemOptions?.find((opt) => opt.id === optionId)
        if (!option) return

        if (option.display_type === "counter" && selection && typeof selection === "object" && !Array.isArray(selection)) {
          // Counter: show "Cerdo x5, Pollo x4, Queso x3"
          const parts = Object.entries(selection)
            .filter(([, qty]) => (qty as number) > 0)
            .map(([choiceId, qty]) => {
              const choice = option.item_option_choices?.find((c) => c.id === choiceId)
              return choice ? `${choice.name} x${qty}` : null
            })
            .filter(Boolean)
            .join(", ")
          if (parts) {
            selectedOptionsForDisplay[option.category] = parts
          }
        } else if (Array.isArray(selection)) {
          const choiceNames = selection
            .map((choiceId) => option.item_option_choices?.find((c) => c.id === choiceId)?.name)
            .filter(Boolean)
            .join(", ")
          if (choiceNames) {
            selectedOptionsForDisplay[option.category] = choiceNames
          }
        } else if (selection && typeof selection === "string") {
          const choice = option.item_option_choices?.find((c) => c.id === selection)
          if (choice) {
            selectedOptionsForDisplay[option.category] = choice.name
          }
        }
      })

      Object.entries(subOptionSelections).forEach(([parentChoiceId, subChoiceId]) => {
        for (const option of loadedItemOptions || []) {
          const parentChoice = option.item_option_choices?.find((c) => c.id === parentChoiceId)
          if (parentChoice) {
            const subChoice = parentChoice.sub_options?.find((s) => s.id === subChoiceId)
            if (subChoice) {
              selectedOptionsForDisplay[`${parentChoice.name}`] = subChoice.name
            }
            break
          }
        }
      })

      const newCartItem = {
        type: "item" as const,
        id: selectedItem.id,
        item: selectedItem,
        customizations,
        subCustomizations,
        totalPrice: itemPrice,
        finalPrice: itemPrice,
        basePrice: effectiveBasePrice,
        image_url: selectedItem.image_url,
        name: selectedItem.name,
        selectedOptions: selectedOptionsForDisplay,
        // Add lead_time_hours from the selected item, defaulting to restaurant lead time if not specified
        lead_time_hours: selectedItem.lead_time_hours || effectiveRestaurant.lead_time_hours || 24,
        // Quantity and unit fields
        unitQuantity: showsQuantity ? effectiveQuantity : undefined,
        pricingUnit: selectedItem.pricing_unit || undefined,
  servesTotal: (() => {
  const serves = getEffectiveServes(selectedItem)
  if (!serves || !showsQuantity) return undefined
  // Parse range like "20-25" or single number "10"
  const parts = serves.split("-").map((s) => Number.parseInt(s.trim()))
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return effectiveQuantity > 1 ? `${effectiveQuantity * parts[0]}-${effectiveQuantity * parts[1]}` : serves
  }
  const num = Number.parseInt(serves)
  return !isNaN(num) ? (effectiveQuantity * num).toString() : serves
  })(),
        // Size variant fields
        selectedSizeId: selectedSize?.id || undefined,
        selectedSizeName: selectedSize?.name || undefined,
        selectedSizeServes: selectedSize?.serves || undefined,
        notes: itemNotes.trim() || undefined,
        // Container fields for delivery fee calculation
        container_type: selectedItem.container_type || "none",
        containers_per_unit: selectedItem.containers_per_unit || 1,
        quantity: showsQuantity ? effectiveQuantity : 1,
        selectedSize: selectedSize ? { ...selectedSize } : undefined,
      }

      if (editingCartIndex !== null) {
        // Update existing cart item
        setCart((prevCart) => {
          const newCart = [...prevCart]
          newCart[editingCartIndex] = newCartItem
          return newCart
        })
        setEditingCartIndex(null)
        setCartVersion((v) => v + 1)
      } else {
        // Add new cart item
      setCart((prevCart) => [...prevCart, newCartItem])
      setCartVersion((v) => v + 1)
    }

      setSelectedItem(null)
      setItemCustomizations({})
      setSubOptionSelections({})
      setUnitQuantity(1)
      setSelectedSizeId(null)
      setManualQuantityMode(false)
      setItemNotes("")
      setShowItemNotes(false)
    } else if (selectedPackage) {
      // Check if all selected addons with sub-addons have a sub-addon selected
      const selectedAddons = Object.entries(packageAddons).filter(([_, data]) => data.quantity > 0)

      for (const [addonId, data] of selectedAddons) {
        const addon = selectedPackage.package_addons?.find((a) => a.id === addonId)
        if (!addon) continue

        // Check if this addon has sub-addons
        const subAddons = selectedPackage.package_addons?.filter((sa) => sa.parent_addon_id === addonId) || []

        if (subAddons.length > 0 && !data.selectedSubAddon) {
          alert(`Por favor selecciona una opcion para ${addon.name}`)
          return
        }

        // Check if this addon has choices
        if (addon.package_addon_choices && addon.package_addon_choices.length > 0 && !data.selectedChoice) {
          alert(`Por favor selecciona una opcion para ${addon.name}`)
          return
        }
      }

      const addons = Object.entries(packageAddons)
        .filter(([_, data]) => data.quantity > 0)
        .map(([addonId, data]) => {
          const addon = selectedPackage.package_addons?.find((a) => a.id === addonId)
          let addonTotalPrice = (addon?.price_per_unit || 0) * data.quantity

          // Calculate sub-addon price difference
          if (data.selectedSubAddon) {
            const subAddon = selectedPackage.package_addons?.find((a) => a.id === data.selectedSubAddon)
            if (subAddon) {
              addonTotalPrice += ((subAddon.price_per_unit || 0) - (addon?.price_per_unit || 0)) * data.quantity
            }
          }

          // Add choice price modifier
          if (data.selectedChoice) {
            const choice = addon?.package_addon_choices?.find((c: OptionChoice) => c.id === data.selectedChoice)
            if (choice?.price_modifier) {
              addonTotalPrice += choice.price_modifier * data.quantity
            }
          }

          return {
            id: addonId,
            name: addon?.name || "",
            quantity: data.quantity,
            unit: addon?.unit || "unit",
            price: addon?.price_per_unit || 0,
            selectedSubAddon: data.selectedSubAddon,
            selectedChoice: data.selectedChoice,
            totalPrice: addonTotalPrice, // Store calculated price
          }
        })

      // Calculate the total price for the package with addons
      let packageTotalPrice = selectedPackage.base_price || 0
      addons.forEach((addon) => {
        packageTotalPrice += addon.totalPrice
      })

      setCart((prevCart) => [
        ...prevCart,
        {
          type: "package",
          id: selectedPackage.id, // Added id for tracking
          package: selectedPackage,
          addons,
          totalPrice: packageTotalPrice, // Store calculated price
          finalPrice: packageTotalPrice, // Store calculated price for display
          image_url: selectedPackage.image_url, // Store image_url for cart display
          name: selectedPackage.name, // Store name for cart display
          selectedAddons: addons, // Store addons for cart display
        },
      ])
      setSelectedPackage(null)
      setPackageAddons({})
    }
  }

  const handleRemoveFromCart = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index))
    setCartVersion((v) => v + 1)
  }

  const handleUpdateCartItemQuantity = (index: number, delta: number) => {
    setCart((prev) => {
      const newCart = [...prev]
      const item = newCart[index]
      
      // Get current quantity - use quantity field (always set) or unitQuantity for unit-based items
      const currentQty = item.quantity || item.unitQuantity || 1
      const newQty = Math.max(1, currentQty + delta)
      
      if (newQty === currentQty) return prev
      
      // Calculate new total price based on the new quantity
      const pricePerUnit = item.totalPrice / currentQty
      const newTotalPrice = pricePerUnit * newQty
      
      // Update serves total if applicable (handle both string ranges and numbers)
      let newServesTotal = item.servesTotal
      if (item.servesTotal && currentQty > 0) {
        if (typeof item.servesTotal === 'string' && item.servesTotal.includes('-')) {
          // Handle range like "10-15"
          const parts = item.servesTotal.split('-').map((s: string) => Number.parseInt(s.trim()))
          if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            const perUnitLow = parts[0] / currentQty
            const perUnitHigh = parts[1] / currentQty
            newServesTotal = `${Math.round(perUnitLow * newQty)}-${Math.round(perUnitHigh * newQty)}`
          }
        } else {
          const serves = typeof item.servesTotal === 'string' ? Number.parseInt(item.servesTotal) : item.servesTotal
          if (!isNaN(serves)) {
            const servesPerUnit = serves / currentQty
            newServesTotal = Math.round(servesPerUnit * newQty)
          }
        }
      }
      
      newCart[index] = {
        ...item,
        unitQuantity: item.unitQuantity !== undefined ? newQty : undefined,
        quantity: newQty,
        totalPrice: newTotalPrice,
        finalPrice: newTotalPrice,
        servesTotal: newServesTotal,
      }
      
      return newCart
    })
    setCartVersion((v) => v + 1)
  }

  const handleEditCartItem = (index: number) => {
    const cartItem = cart[index]

    if (cartItem.type === "item" && cartItem.item) {
      // Set the selected item to open the modal
      setSelectedItem(cartItem.item)
      // Restore the customizations
      setItemCustomizations(cartItem.customizations || {})
      // Restore sub-option selections
      setSubOptionSelections(cartItem.subCustomizations || {})
      // Restore unit quantity for unit-based items
      setUnitQuantity(cartItem.unitQuantity || 1)
      // Restore selected size
      setSelectedSizeId(cartItem.selectedSizeId || null)
      // Restore item notes
      setItemNotes(cartItem.notes || "")
      setShowItemNotes(!!(cartItem.notes))
      // Track which cart item we're editing
      setEditingCartIndex(index)
      // Close the cart dialog
      setShowCart(false)
    } else if (cartItem.type === "package" && cartItem.package) {
      // Handle package editing
      setSelectedPackage(cartItem.package)
      // Restore package addons
      const restoredAddons: Record<string, { quantity: number; selectedSubAddon?: string; selectedChoice?: string }> =
        {}
      cartItem.selectedAddons?.forEach((addon: any) => {
        restoredAddons[addon.id] = {
          quantity: addon.quantity || 1,
          selectedSubAddon: addon.selectedSubAddon,
          selectedChoice: addon.selectedChoice,
        }
      })
      setPackageAddons(restoredAddons)
      setEditingCartIndex(index)
      setShowCart(false)
    }
  }

  const subtotal = cart
    .filter((item) => item.type !== "delivery_fee")
    .reduce((total, cartItem) => total + (cartItem.finalPrice || 0), 0)
  const taxRate = effectiveRestaurant.tax_rate ?? 0
  const taxAmount = subtotal * taxRate
  // Removed deliveryFee const as it's now dynamic

  const calculateTip = () => {
    if (deliveryForm.tipPercentage > 0) {
      return (subtotal * deliveryForm.tipPercentage) / 100
    } else if (deliveryForm.customTip) {
      return Number.parseFloat(deliveryForm.customTip) || 0
    }
    return 0
  }

  const tipAmount = calculateTip()
  
  // Calculate dispatch fee at component level for use throughout order summary sections
  const componentDispatchFeePercent = deliveryMethod === "delivery" ? Number((effectiveRestaurant as any).dispatch_fee_percent || 0) : 0
  const componentHasCalculatedFee = deliveryFeeCalculation.distance > 0 || deliveryFeeCalculation.zoneName !== ""
  const componentDeliverySubsidy = deliveryMethod === "delivery" && componentHasCalculatedFee
    ? Math.max(0, deliveryFeeCalculation.fee - deliveryFeeCalculation.displayedFee)
    : 0
  const dispatchFee = componentDispatchFeePercent > 0
    ? Math.ceil(((subtotal * componentDispatchFeePercent / 100) + componentDeliverySubsidy) / 0.05) * 0.05
    : 0
  
  const total = subtotal + taxAmount + (deliveryMethod === "delivery" ? deliveryFeeCalculation.fee : 0) + tipAmount // Use dynamic delivery fee here

  const calculateTax = () => {
  const taxRate = effectiveRestaurant.tax_rate ?? 0
  return subtotal * taxRate
  }

  // Ref to track last calculation to prevent duplicate calls
  const lastCalculationRef = useRef<{ address: string; timestamp: number } | null>(null)
  
  const handleCalculateDeliveryFee = async (addressOverride?: { streetAddress: string; streetAddress2?: string; city: string; state: string; zip: string }) => {
    const addressData = addressOverride || deliveryForm
    
    // Only proceed if delivery is selected and address fields are filled
    if (deliveryMethod !== "delivery" || !addressData.streetAddress || !addressData.city || !addressData.zip) {
      return
    }
    
    // Build address string to check for duplicates
    const addressKey = `${addressData.streetAddress}|${addressData.streetAddress2 || ""}|${addressData.city}|${addressData.state}|${addressData.zip}`
    const now = Date.now()
    
    // Skip if same address was calculated within last 2 seconds
    if (lastCalculationRef.current && 
        lastCalculationRef.current.address === addressKey && 
        now - lastCalculationRef.current.timestamp < 2000) {
      return
    }
    
    lastCalculationRef.current = { address: addressKey, timestamp: now }

    // If restaurant address is not configured, use the default fee
    if (!restaurant.restaurant_address) {
      setDeliveryFeeCalculation((prev) => ({
        ...prev,
        fee: 0,
        displayedFee: 0,
        distance: 0,
        zoneName: "",
        itemSurcharge: 0,
        isCalculating: false,
        error: "Restaurant address not configured. Please contact support.",
      }))
      return
    }

    setDeliveryFeeCalculation((prev) => ({ ...prev, isCalculating: true, error: undefined })) // Reset error and show calculating state

    const line2 = addressData.streetAddress2 ? `, ${addressData.streetAddress2}` : ""
    const deliveryAddress = `${addressData.streetAddress}${line2}, ${addressData.city}, ${addressData.state} ${addressData.zip}`

    // Count actual food items (exclude delivery fee and automatically added items like delivery_fee)
    const itemCount = cart.filter((item) => item.type !== "delivery_fee" && !item.isAutomatic).length

    try {
      const result = await calculateDeliveryFee({
        restaurantId: restaurant.id,
        deliveryAddress,
        restaurantAddress: restaurant.restaurant_address,
        itemCount,
      })

      if (result.success) {
        setDeliveryFeeCalculation({
          fee: result.fee,
          displayedFee: result.displayedFee ?? result.fee,
          distance: result.distance,
          zoneName: result.zoneName,
          itemSurcharge: result.itemSurcharge,
          isCalculating: false,
        })

        // Delivery fee is shown as a line item in the cart drawer footer — not injected into cart items
      } else {
        setDeliveryFeeCalculation((prev) => ({
          ...prev,
          isCalculating: false,
          error: result.error,
          fee: 0,
          displayedFee: 0,
          distance: 0,
          zoneName: "",
          itemSurcharge: 0,
        }))
      }
    } catch (error) {
      console.error("[v0] Error calculating delivery fee:", error)
      setDeliveryFeeCalculation((prev) => ({
        ...prev,
        isCalculating: false,
        error: "An unexpected error occurred while calculating delivery fee. Please try again.",
        fee: 0,
        displayedFee: 0,
        distance: 0,
        zoneName: "",
        itemSurcharge: 0,
      }))
    }
  }

  // Shared logic: apply a UserLocation to the delivery form and recalculate the fee
  const applyLocationAndCalc = useCallback((saved: {
    address: string; lat: number; lng: number
    zip?: string; streetAddress?: string; city?: string; state?: string
  }) => {
    if (!saved.lat || !saved.lng) return

    const restaurantLat = (restaurant as any).latitude ?? (restaurant as any).lat
    const restaurantLng = (restaurant as any).longitude ?? (restaurant as any).lng

    const applyAndCalc = (street: string, city: string, state: string, zip: string) => {
      setDeliveryForm((prev) => ({
        ...prev,
        streetAddress: street || prev.streetAddress,
        city: city || prev.city,
        state: state || prev.state,
        zip: zip || prev.zip,
      }))

      if (restaurantLat && restaurantLng) {
        setDeliveryFeeCalculation((prev) => ({ ...prev, isCalculating: true }))
        const itemCount = cart.filter((i) => i.type !== "delivery_fee" && !i.isAutomatic).length
        calculateDeliveryFeeByCoords({
          restaurantId: restaurant.id,
          customerLat: saved.lat,
          customerLng: saved.lng,
          restaurantLat,
          restaurantLng,
          itemCount,
        }).then((result) => {
          setDeliveryFeeCalculation({
            fee: result.fee,
            displayedFee: result.displayedFee,
            distance: result.distance,
            zoneName: result.zoneName,
            itemSurcharge: result.itemSurcharge,
            isCalculating: false,
            error: result.error,
          })
        })
      } else if (street && city && zip) {
        handleCalculateDeliveryFee({ streetAddress: street, city, state, zip })
      }
    }

    // Best case: structured fields already stored
    if (saved.streetAddress && saved.city && saved.state) {
      applyAndCalc(saved.streetAddress, saved.city, saved.state, saved.zip || "")
      return
    }

    // Fallback: reverse-geocode lat/lng to get structured components
    fetch(`/api/places/reverse-geocode?lat=${saved.lat}&lng=${saved.lng}`)
      .then((r) => r.json())
      .then((geo: { street?: string; city?: string; state?: string; zip?: string }) => {
        const street = geo.street || ""
        const city = geo.city || ""
        const state = geo.state || "PR"
        const zip = geo.zip || saved.zip || ""

        const updated = { ...saved, streetAddress: street, city, state, zip }
        localStorage.setItem("foodnet_user_location", JSON.stringify(updated))

        applyAndCalc(street, city, state, zip)
      })
      .catch(() => { /* silently ignore */ })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurant.id, restaurant])

  // Auto-calculate delivery fee on mount
  useEffect(() => {
    if (deliveryMethod !== "delivery") return
    try {
      const raw = localStorage.getItem("foodnet_user_location")
      if (!raw) return
      const saved = JSON.parse(raw)
      applyLocationAndCalc(saved)
    } catch { /* ignore parse errors */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deliveryMethod, restaurant.id])

  // Re-calculate whenever the customer changes their address in the top bar
  useEffect(() => {
    if (deliveryMethod !== "delivery") return
    const handler = (e: Event) => {
      const location = (e as CustomEvent).detail
      if (location?.lat && location?.lng) {
        applyLocationAndCalc(location)
      }
    }
    window.addEventListener("foodnet:location-changed", handler)
    return () => window.removeEventListener("foodnet:location-changed", handler)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deliveryMethod, applyLocationAndCalc])

  const handleSubmitCheckout = async () => {
    if (!user) {
      // Save checkout state to resume after login
      sessionStorage.setItem(
        "pendingCheckout",
        JSON.stringify({
          cart,
          deliveryForm,
          deliveryMethod,
          tipAmount, // This is the issue, tipAmount is not a state variable
          deliveryFeeCalculation,
        }),
      )
      alert("Por favor inicia sesion para completar tu orden")
      window.location.href = `/${restaurant.slug}/customer-auth?redirect=checkout&mode=signup`
      return
    }

    // Validate required fields
    if (
      !deliveryForm.fullName || // Changed from fullName to name
      !deliveryForm.email ||
      !deliveryForm.phone ||
      !deliveryForm.eventDate ||
      !deliveryForm.eventTime
    ) {
      alert("Please fill in all required fields")
      return
    }

    // Address validation for delivery
    if (deliveryMethod === "delivery") {
      if (!deliveryForm.streetAddress || !deliveryForm.city || !deliveryForm.state || !deliveryForm.zip) {
        alert("Please provide a complete delivery address.")
        return
      }

      // Check delivery zone if not already checked or acknowledged
      if (!zoneCheck.checked || (!zoneCheck.inZone && !zoneCheck.acknowledged)) {
        const fullAddress = `${deliveryForm.streetAddress}, ${deliveryForm.city}, ${deliveryForm.state} ${deliveryForm.zip}`
        const result = await checkDeliveryZone(restaurant.id, selectedBranch?.id || "", fullAddress)
        const newZoneCheck = {
          checked: true,
          inZone: result.inZone,
          distance: result.distance,
          radius: result.radius,
          closerBranch: result.closerBranch,
          acknowledged: false,
        }
        setZoneCheck(newZoneCheck)

        if (!result.inZone) {
          // Don't proceed -- the UI will show the warning
          return
        }
      }
    }

    // CRITICAL: Ensure branch is selected - orders CANNOT proceed without a branch
    if (!selectedBranch?.id) {
      toast({ title: "Error", description: "Por favor seleccione una sucursal antes de continuar.", variant: "destructive" })
      return
    }

    const tax = calculateTax()
    const dynamicDeliveryFee = deliveryMethod === "delivery" ? deliveryFeeCalculation.fee : 0
    
    // Include internal shop items in total (with their own tax)
    const internalShopTotal = internalShopSubtotal + internalShopTax
    const total = subtotal + tax + dynamicDeliveryFee + tipAmount + internalShopTotal

const orderData = {
  restaurantId: restaurant.id,
  restaurantName: restaurant.name,
  restaurantAddress: effectiveRestaurant.restaurant_address || "",
  branchId: selectedBranch.id,
  branchName: selectedBranch?.name || null,
  customerId: customer?.id || null, // Platform customer ID for order history
      // Payment provider settings - check branch first, then fall back to restaurant
      paymentProvider: (selectedBranch as any)?.payment_provider || (restaurant as any)?.payment_provider || "stripe",
      stripeAccountId: (selectedBranch as any)?.stripe_account_id || (restaurant as any)?.stripe_account_id || null,
      squareAccessToken: (selectedBranch as any)?.square_access_token || (restaurant as any)?.square_access_token || null,
      squareLocationId: (selectedBranch as any)?.square_location_id || (restaurant as any)?.square_location_id || null,
      squareEnvironment: (selectedBranch as any)?.square_environment || (restaurant as any)?.square_environment || "production",
      athmovilPublicToken: (selectedBranch as any)?.athmovil_public_token || (restaurant as any)?.athmovil_public_token || null,
      athmovilEcommerceId: (selectedBranch as any)?.athmovil_ecommerce_id || (restaurant as any)?.athmovil_ecommerce_id || null,
      cart: [
        // Restaurant items
        ...cart.map((item) => ({
          ...item,
          is_internal_shop: false,
          // Ensure correct structure for selected options and addons if they exist
          selectedOptions: item.selectedOptions || {},
          selectedAddons: item.selectedAddons || [],
          // Remove nested item/package objects to avoid duplication
          item: undefined,
          package: undefined,
        })),
        // Internal shop items (separate accounting)
        ...internalShopItems.map((item) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          image_url: item.image_url,
          is_internal_shop: true,
        })),
      ],
      // Restaurant subtotal (for restaurant accounting)
      subtotal: subtotal,
      tax,
      // Internal shop subtotal (separate accounting from restaurant)
      internalShopSubtotal: internalShopSubtotal,
      internalShopTax: internalShopTax,
      deliveryFee: dynamicDeliveryFee, // Use the calculated delivery fee
      tip: tipAmount, // Use calculated tip amount
      total,
      orderType: deliveryMethod,
      eventDetails: {
        name: deliveryForm.fullName, // Changed from fullName to name
        email: deliveryForm.email,
        phone: deliveryForm.phone,
        company: deliveryForm.company,
        eventDate: deliveryForm.eventDate,
        eventTime: deliveryForm.eventTime,
        address: deliveryForm.streetAddress, // Use streetAddress
        address2: deliveryForm.streetAddress2, // Line 2: Apt, Urb, Suite, etc.
        city: deliveryForm.city,
        state: deliveryForm.state,
        zip: deliveryForm.zip,
        specialInstructions: deliveryForm.specialInstructions,
      },
      customerEmail: deliveryForm.email,
      customerPhone: deliveryForm.phone,
      smsConsent: deliveryForm.smsConsent,
      includeUtensils: true, // Placeholder, can be a user choice
      servicePackage: null, // Placeholder, can be determined if a package was added
      deliveryZone: deliveryMethod === "delivery" ? deliveryFeeCalculation.zoneName : undefined,
      deliveryDistance: deliveryMethod === "delivery" ? deliveryFeeCalculation.distance : undefined,
      itemSurcharge: deliveryMethod === "delivery" ? deliveryFeeCalculation.itemSurcharge : undefined,
    }

    setCheckoutData(orderData)
    setShowCheckoutForm(false) // This is no longer used
    setCheckoutStep(null) // Close the delivery form
    setShowCheckout(false) // Close the main checkout dialog
    
    // Route to appropriate payment provider
    // Logic: stripe/square = card only, stripe_athmovil/square_athmovil = show selector
    const paymentProvider = orderData.paymentProvider || "stripe"
    
    if (paymentProvider === "stripe_athmovil" || paymentProvider === "square_athmovil") {
      // Show payment selector: Card vs ATH Móvil
      setShowPaymentSelector(true)
    } else if (paymentProvider === "stripe") {
      setShowStripeCheckout(true)
    } else if (paymentProvider === "square") {
      setShowSquareCheckout(true)
    } else {
      // Default to Stripe
      setShowStripeCheckout(true)
    }
  }
  
  const handleSelectPaymentProvider = (provider: "card" | "athmovil") => {
    setShowPaymentSelector(false)
    const paymentProvider = checkoutData?.paymentProvider || "stripe"
    
    if (provider === "card") {
      // Route to appropriate card processor based on merchant's settings
      if (paymentProvider === "square" || paymentProvider === "square_athmovil") {
        setShowSquareCheckout(true)
      } else {
        // Default to Stripe (stripe, stripe_athmovil, or fallback)
        setShowStripeCheckout(true)
      }
    } else if (provider === "athmovil") {
      setShowATHMovilCheckout(true)
    }
  }

  const handlePaymentSuccess = () => {
    setShowStripeCheckout(false)
    setShowSquareCheckout(false)
    setShowATHMovilCheckout(false)
    setCart([])
    clearInternalShopCart() // Clear internal shop cart on successful order
    setDeliveryForm({
      fullName: "", // Changed from fullName to name
      email: "",
      phone: "",
      company: "",
      eventDate: new Date().toISOString().split("T")[0],
      eventTime: (() => {
        const deliveryMinutes = (effectiveRestaurant as any).delivery_estimated_minutes || 45
        const eta = new Date(Date.now() + deliveryMinutes * 60 * 1000)
        const h = eta.getHours().toString().padStart(2, "0")
        const m = Math.floor(eta.getMinutes() / 15) * 15
        return `${h}:${m.toString().padStart(2, "0")}`
      })(),
      streetAddress: "",
      streetAddress2: "",
      city: "",
      state: "PR",
      zip: "",
      specialInstructions: "",
      smsConsent: false,
      tipPercentage: 15, // Reset to default
      customTip: "",
    })
    setDeliveryFeeCalculation({
      fee: 0,
      displayedFee: 0,
      distance: 0,
      zoneName: "",
      itemSurcharge: 0,
      isCalculating: false,
    })
    alert("Pedido realizado exitosamente. Recibiras un correo de confirmacion en breve.")
  }

  // Get template styles
  const { cardStyles, menuItemCardStyles, servicePackageCardStyles } = getTemplateStyles(designTemplate)

  // Minimum order enforcement based on delivery method
  const activeMinimumOrder = deliveryMethod === "delivery"
    ? (effectiveRestaurant.min_delivery_order || 0)
    : (effectiveRestaurant.min_pickup_order || 0)
  const cartSubtotal = cart.reduce((sum, item) => sum + (item.totalPrice || 0), 0)
  // Minimum order only counts menu items — not delivery fees, service packages, taxes, tips, etc.
  const menuItemsTotal = cart.filter((item) => item.type === "item").reduce((sum, item) => sum + (item.totalPrice || 0), 0)
  const isBelowMinimum = activeMinimumOrder > 0 && menuItemsTotal < activeMinimumOrder

  // Handler to proceed to checkout, used in the cart dialog
  const handleProceedToCheckout = () => {
    if (foodCartCount > 0 && !isBelowMinimum) {
      setShowCart(false) // Close the cart
      setCheckoutStep("delivery") // Show delivery info form step
      setShowCheckout(true) // Open checkout dialog
    }
  }

  // Functions for package customization
  const [packageCustomizations, setPackageCustomizations] = useState<
    Record<string, { selectedChoiceId?: string | null; selectedSubOptionId?: string | null; quantity: number }>
  >({})
  const [packageSubOptionSelections, setPackageSubOptionSelections] = useState<Record<string, string>>({})

  // Helper function to calculate the price of a package with its customizations
  const calculatePackagePrice = (pkg: ServicePackage): number => {
    let totalPrice = pkg.base_price || 0
    const customizations = packageCustomizations[`${pkg.id}`] || {}
    const selectedChoiceId = customizations.selectedChoiceId
    const selectedSubOptionId = customizations.selectedSubOptionId
    const quantity = customizations.quantity || 1

    // Find the selected base choice for the package
    let selectedBaseChoice: PackageAddon | undefined = undefined
    if (selectedChoiceId && pkg.package_addons) {
      selectedBaseChoice = pkg.package_addons.find((addon) => addon.id === selectedChoiceId)
      if (selectedBaseChoice) {
        totalPrice += (selectedBaseChoice.price_per_unit || 0) * quantity
      }
    }

    // If there are sub-options for the selected base choice, add their price modifier
    if (selectedSubOptionId && selectedBaseChoice && selectedBaseChoice.sub_options) {
      const subOption = selectedBaseChoice.sub_options.find((sub) => sub.id === selectedSubOptionId)
      if (subOption && subOption.price_modifier) {
        totalPrice += subOption.price_modifier * quantity
      }
    }

    // Add price for package addons
    if (pkg.package_addons) {
      pkg.package_addons.forEach((addon) => {
        if (addon.parent_addon_id && customizations[`${addon.id}`]) {
          const addonQuantity = customizations[`${addon.id}`].quantity || 0
          totalPrice += (addon.price_per_unit || 0) * addonQuantity
        }
      })
    }

    // Add price for selected package_addon_choices (if applicable)
    if (pkg.package_addons) {
      pkg.package_addons.forEach((addon) => {
        if (addon.package_addon_choices && customizations[`${addon.id}`]?.selectedChoiceId) {
          const choice = addon.package_addon_choices.find(
            (c) => c.id === customizations[`${addon.id}`].selectedChoiceId,
          )
          if (choice?.price_modifier) {
            totalPrice += choice.price_modifier * quantity
          }
        }
      })
    }

    // Add price per person if applicable
    if (pkg.price_per_person && pkg.price_per_person > 0 && quantity > 1) {
      totalPrice = pkg.price_per_person * quantity
    }

    return totalPrice
  }

  const handlePackageItemQuantity = (categoryId: string, itemId: string, amount: number) => {
    const customizationKey = `${categoryId}-${itemId}`
    setPackageCustomizations((prev) => {
      const currentCustomization = prev[customizationKey] || { quantity: 0 }
      const newQuantity = Math.max(0, currentCustomization.quantity + amount)
      return {
        ...prev,
        [customizationKey]: { ...currentCustomization, quantity: newQuantity },
      }
    })
  }

  const handlePackageChoiceSelect = (categoryId: string, choice: PackageAddon) => {
    const customizationKey = `${categoryId}-${choice.id}`
    setPackageCustomizations((prev) => ({
      ...prev,
      [customizationKey]: {
        selectedChoiceId: choice.id,
        quantity: (prev[customizationKey]?.quantity || 0) > 0 ? prev[customizationKey].quantity : 1, // Default to 1 if not set
        selectedSubOptionId: null, // Reset sub-option when parent choice changes
      },
    }))
    // Clear sub-option selections related to this choice
    setPackageSubOptionSelections((prev) => {
      const newSelections = { ...prev }
      Object.keys(newSelections).forEach((key) => {
        if (key.startsWith(`${categoryId}-${choice.id}-`)) {
          delete newSelections[key]
        }
      })
      return newSelections
    })
  }

  const handlePackageSubOptionSelect = (
    categoryId: string,
    choiceId: string,
    subOptionId: string,
    subChoiceId: string,
  ) => {
    const key = `${categoryId}-${choiceId}-${subChoiceId}`
    setPackageSubOptionSelections((prev) => ({
      ...prev,
      [key]: subOptionId,
    }))
  }

  const handleAddPackageToCart = () => {
    if (!selectedPackage) return

    // Calculate the total price including selected addons and customizations
    let packageTotalPrice = selectedPackage.base_price || 0
    const selectedAddons: any[] = []

    // Add selected base choice price
    const baseCustomizationKey = `${selectedPackage.id}-${selectedPackage.id}` // Assuming base choice ID is same as package ID for simplicity
    const baseCustomization = packageCustomizations[baseCustomizationKey]
    let selectedBaseChoice: PackageAddon | undefined
    if (baseCustomization?.selectedChoiceId && selectedPackage.package_addons) {
      selectedBaseChoice = selectedPackage.package_addons.find(
        (addon) => addon.id === baseCustomization.selectedChoiceId,
      )
      if (selectedBaseChoice) {
        packageTotalPrice += (selectedBaseChoice.price_per_unit || 0) * (baseCustomization.quantity || 1)
        selectedAddons.push({
          id: selectedBaseChoice.id,
          name: selectedBaseChoice.name,
          quantity: baseCustomization.quantity || 1,
          unit: selectedBaseChoice.unit,
          price: selectedBaseChoice.price_per_unit || 0,
          selectedSubAddon: baseCustomization.selectedSubOptionId,
          // Find the selected sub-choice name if applicable
          selectedSubAddonName: selectedBaseChoice.sub_options?.find(
            (sub) => sub.id === baseCustomization.selectedSubOptionId,
          )?.name,
        })
      }
    }

    // Add price per person if applicable
    if (selectedPackage.price_per_person && selectedPackage.price_per_person > 0 && baseCustomization?.quantity > 1) {
      packageTotalPrice = selectedPackage.price_per_person * baseCustomization.quantity
    }

    // Add price for selected package_addon_choices
    if (selectedPackage.package_addons) {
      selectedPackage.package_addons.forEach((addon) => {
        if (addon.package_addon_choices) {
          const addonCustomizationKey = `${selectedPackage.id}-${addon.id}`
          const addonCustomization = packageCustomizations[addonCustomizationKey]
          if (addonCustomization?.selectedChoiceId) {
            const choice = addon.package_addon_choices.find((c) => c.id === addonCustomization.selectedChoiceId)
            if (choice?.price_modifier) {
              packageTotalPrice += choice.price_modifier * (addonCustomization.quantity || 1)
              selectedAddons.push({
                id: addon.id,
                name: addon.name,
                quantity: addonCustomization.quantity || 1,
                unit: addon.unit,
                price: addon.price_per_unit || 0,
                selectedChoice: choice,
              })
            }
          }
        }
      })
    }

    setCart((prevCart) => [
      ...prevCart,
      {
        type: "package",
        id: selectedPackage.id,
        package: selectedPackage,
        addons: selectedAddons, // Store the processed addons
        totalPrice: packageTotalPrice,
        finalPrice: packageTotalPrice,
        image_url: selectedPackage.image_url,
        name: selectedPackage.name,
        quantity: baseCustomization?.quantity || 1, // Store the quantity
        selectedOptions: { ...packageCustomizations }, // Store all customizations
        selectedAddons: selectedAddons, // Store addons for display
      },
    ])

    setSelectedPackage(null)
    setPackageCustomizations({})
    setPackageSubOptionSelections({})
    setShowPackageModal(false)
  }

  const { toast } = useToast() // Initialize toast

  const getMethodLeadTime = () => {
    // Default to 0 for immediate delivery restaurants — catering items carry their own lead_time_hours
    const generalLead = effectiveRestaurant.lead_time_hours ?? 0
    if (deliveryMethod === "delivery") {
      return effectiveRestaurant.delivery_lead_time_hours ?? generalLead
    }
    return effectiveRestaurant.pickup_lead_time_hours ?? generalLead
  }

  const getMaxLeadTimeFromCart = () => {
    let maxLeadTime = getMethodLeadTime()

    cart.forEach((cartItem) => {
      if (cartItem.item && cartItem.item.lead_time_hours) {
        maxLeadTime = Math.max(maxLeadTime, cartItem.item.lead_time_hours)
      }
    })

    return maxLeadTime
  }

  const leadTimeHours = getMaxLeadTimeFromCart()
  const minDate = new Date()
  minDate.setHours(minDate.getHours() + leadTimeHours)
  const maxAdvanceDays = effectiveRestaurant.max_advance_days || 14
  const maxDate = new Date()
  maxDate.setDate(maxDate.getDate() + maxAdvanceDays)

  const [user, setUser] = useState<any>(null)
  const supabase = createBrowserClient()

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (reorderData && reorderData.order_items) {
      const reorderedCart = reorderData.order_items
        .filter((orderItem: any) => !isExternalDeliveryItem(orderItem.item_name || ""))
        .map((orderItem: any) => {
          const menuItem = effectiveMenuItems.find((item) => item.id === orderItem.menu_item_id)
          return {
            type: "item",
            id: orderItem.menu_item_id,
            name: orderItem.item_name,
            item: menuItem,
            quantity: orderItem.quantity,
            totalPrice: orderItem.unit_price * orderItem.quantity,
            finalPrice: orderItem.unit_price * orderItem.quantity,
            basePrice: orderItem.unit_price,
            image_url: menuItem?.image_url || null,
            customizations: orderItem.customizations || {},
            selectedOptions: orderItem.selected_options || {},
          }
        })

      setCart(reorderedCart)
      toast({
                title: "Articulos agregados al carrito",
                description: "Revisa tu pedido anterior y procede al pago",
      })
    }
  }, [reorderData, menuItems])

  // The pendingCheckout restoration effect below handles reopening the checkout dialog
  // after auth redirect. This effect is no longer needed as a separate check.
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      if (params.get("redirect") === "checkout") {
        // Remove the redirect param from URL immediately
        window.history.replaceState({}, "", window.location.pathname)
      }
    }
  }, [])

  useEffect(() => {
    const pendingCheckout = sessionStorage.getItem("pendingCheckout")
    if (pendingCheckout && user) {
      try {
        const data = JSON.parse(pendingCheckout)
        setCart(data.cart)
        setDeliveryForm(data.deliveryForm)
        setDeliveryMethod(data.deliveryMethod)
        // FIX: Removed the direct use of setTipAmount as it's not a state variable
        // setTipAmount(data.tipAmount) // Assuming tipAmount is a state variable, if not, this needs adjustment
        // Instead, we can directly set tipPercentage or customTip from the saved data if available.
        // For now, we'll assume tipPercentage from saved data is sufficient.
        if (data.deliveryForm && data.deliveryForm.tipPercentage !== undefined) {
          setDeliveryForm((prev) => ({ ...prev, tipPercentage: data.deliveryForm.tipPercentage }))
        }
        if (data.deliveryForm && data.deliveryForm.customTip !== undefined) {
          setDeliveryForm((prev) => ({ ...prev, customTip: data.deliveryForm.customTip }))
        }
        setDeliveryFeeCalculation(data.deliveryFeeCalculation)
        sessionStorage.removeItem("pendingCheckout")
        // Open checkout dialog
        setCheckoutStep("delivery")
        setShowCheckout(true)
      } catch (error) {
        console.error("[v0] Error restoring checkout state:", error)
        sessionStorage.removeItem("pendingCheckout")
      }
    }
  }, [user])

  // Use cartItems for calculations to avoid direct dependency on cart state in some effects if needed
  const cartItems = cart

  // Branch selector overlay for chain restaurants
  if (isChain && showBranchSelector && !selectedBranch) {
    return (
  <BranchSelector
  branches={branches}
  restaurantName={restaurant.name}
  logoUrl={effectiveRestaurant.logo_url}
  bannerLogoUrl={(restaurant as any).banner_logo_url}
  heroImageUrl={restaurant.hero_image_url}
        hideTitle={restaurant.hide_branch_selector_title}
        primaryColor={primaryColor}
        servicePackages={servicePackages}
        whiteLabel={restaurant.white_label}
        onSelect={(branch) => {
          setSelectedBranch(branch)
          setShowBranchSelector(false)
        }}
      />
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Global Navigation - persists across all pages */}
      {/* Show location bar but hide mode toggle since restaurant has its own Entrega/Recogido */}
      <GlobalNavbar showLocationBar={true} showModeToggle={false} />
      
      <header className={templateStyles.headerBar}>
        <div className="container mx-auto px-4 py-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            {/* Top row: Logo, name, cart */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                {/* Back to homepage button */}
                <Link
                  href="/"
                  className="flex items-center justify-center w-9 h-9 bg-black rounded-lg hover:bg-gray-800 transition-colors flex-shrink-0"
                  aria-label="Volver al inicio"
                >
                  <ChevronLeft className="w-5 h-5 text-white" />
                </Link>
                {/* Restaurant logo icon */}
                {restaurant.logo_url && (
                  <>
                    <Image
                      src={restaurant.logo_url}
                      alt={restaurant.name}
                      width={48}
                      height={48}
                      className="h-10 w-10 md:h-8 md:w-8 object-contain flex-shrink-0 rounded"
                    />
                    <div className="w-px h-8 bg-gray-300 flex-shrink-0" />
                  </>
                )}
                {/* Restaurant name - always black */}
                <span
                  className="text-xl md:text-2xl font-extrabold tracking-tight flex-shrink-0 truncate max-w-[320px] md:max-w-[420px] uppercase text-black"
                >
                  {restaurant.name}
                </span>
                {isChain && selectedBranch && (
                  <button
                    onClick={() => { setSelectedBranch(null); setShowBranchSelector(true); }}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium transition-colors hover:opacity-80"
                    style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}
                  >
                    <MapPin className="h-3.5 w-3.5" />
                    {selectedBranch.name}
                  </button>
                )}
              </div>
              {/* Cart button - visible on mobile in top row */}
              <Button
                variant="default"
                size="lg"
                className="relative text-white md:hidden flex-shrink-0"
                style={{ backgroundColor: primaryColor }}
                onClick={() => setShowCart(true)}
                aria-label={`Abrir carrito de compras${foodCartCount > 0 ? `, ${foodCartCount} artículos` : ''}`}
              >
  <ShoppingCart className="w-5 h-5 text-white" />
              {foodCartCount > 0 && (
                <Badge className="absolute -top-2 -right-2 h-6 w-6 flex items-center justify-center p-0">
                  {foodCartCount}
                </Badge>
              )}
            </Button>
            </div>
            {/* Bottom row on mobile: Delivery/Pickup toggle + Account + Cart (desktop only cart here) */}
            <div className="flex items-center justify-center gap-2 md:gap-4 md:justify-end">
              {/* Bebidas y Extras - FoodNet Shop button (only show when available) */}
              {isInternalShopAvailable && (
                <Button
                  size="sm"
                  onClick={() => setShowInternalShopModal(true)}
                  className="gap-1.5 bg-cyan-600 hover:bg-cyan-700 text-white"
                >
                  <Coffee className="w-4 h-4" />
                  <span className="hidden sm:inline text-xs font-medium">Bebidas y Extras</span>
                </Button>
              )}

              {/* Delivery/Pickup toggle - hidden until we have pickup restaurants */}
              {user ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => (window.location.href = `/${restaurant.slug}/account`)}
                  className="gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                  <span className="hidden sm:inline">Cuenta</span>
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => (window.location.href = `/${restaurant.slug}/customer-auth?mode=login`)}
                  className="gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                    />
                  </svg>
                  <span className="hidden sm:inline">Iniciar Sesion</span>
                </Button>
              )}
              {/* Cart button - desktop only in this position */}
              <Button
                variant="default"
                size="lg"
                className="relative text-white hidden md:flex flex-shrink-0"
                style={{ backgroundColor: primaryColor }}
                onClick={() => setShowCart(true)}
                aria-label={`Abrir carrito de compras${foodCartCount > 0 ? `, ${foodCartCount} artículos` : ''}`}
              >
  <ShoppingCart className="w-5 h-5 text-white" />
                {foodCartCount > 0 && (
                  <Badge className="absolute -top-2 -right-2 h-6 w-6 flex items-center justify-center p-0">
                    {foodCartCount}
                  </Badge>
                )}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Intro Banner - always shows the color bar */}
      <div
        className="relative w-full overflow-hidden"
        style={{ minHeight: "3rem" }}
      >
        {/* Background: either hero image or solid primary color */}
        <div
          className="absolute inset-0"
          style={{ backgroundColor: primaryColor }}
        />
        {effectiveRestaurant.hero_image_url && (
          <>
            <img
              src={effectiveRestaurant.hero_image_url}
              alt={`${restaurant.name} catering`}
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div
              className="absolute inset-0"
              style={{ background: `linear-gradient(to bottom, ${primaryColor}99, ${primaryColor}dd)` }}
            />
          </>
        )}
        {/* Content */}
        <div className={`relative w-full flex items-center justify-center px-6 ${effectiveRestaurant.hero_image_url ? "h-28 md:h-36" : "py-5 md:py-6"}`}>
          {(effectiveRestaurant.marketplace_tagline || effectiveRestaurant.description) && (
            <p className="text-sm md:text-base text-white/90 text-center leading-relaxed max-w-2xl text-balance font-light italic">
              {effectiveRestaurant.marketplace_tagline || effectiveRestaurant.description}
            </p>
          )}
        </div>
      </div>

      {/* Navigation - sticky floating menu (sticks below GlobalNavbar using measured height) */}
      <nav 
        className="sticky z-40 bg-background border-b shadow-sm"
        style={{ top: 'var(--navbar-height, 64px)' }}
      >
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-2 overflow-x-auto">
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button variant="default" size="sm" className="shrink-0" style={{ backgroundColor: primaryColor }}>
                  <List className="w-4 h-4 mr-2" />
                  Menu
                  <ChevronDown className="w-4 h-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56 max-h-80 overflow-y-auto z-[60]">
                <DropdownMenuLabel className="text-xs text-muted-foreground">Ir a categoria</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {categories
                  .filter((cat) => cat.is_active)
                  .filter((cat) => {
                    // Filter by day of week
                    const availableDays = cat.available_days as Record<string, boolean> | null
                    if (!availableDays) return true
                    const dayOfWeek = new Date().getDay()
                    const days = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const
                    return availableDays[days[dayOfWeek]] !== false
                  })
                  .sort((a, b) => a.display_order - b.display_order)
                  .filter((category) => {
                    const categoryItems = effectiveMenuItems.filter(
                      (item) => item.category === category.name && !isExternalDeliveryItem(item.name)
                    )
                    return categoryItems.length > 0
                  })
                  .map((category) => (
                    <DropdownMenuItem
                      key={category.id}
                      onClick={() => scrollToCategory(category.name)}
                      className="cursor-pointer"
                    >
                      {category.name}
                    </DropdownMenuItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Service packages nav button - filtered by branch assignment */}
            {effectiveServicePackages.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 bg-transparent"
  onClick={() => scrollToCategory("SERVICE_PACKAGES")}
  >
  {(effectiveRestaurant.packages_section_title || "PAQUETES DE SERVICIO").toUpperCase()}
  </Button>
            )}

            {categories
              .filter((cat) => cat.name !== "SERVICE_PACKAGES" && cat.is_active)
              .filter((cat) => {
                // Filter by day of week
                const availableDays = cat.available_days as Record<string, boolean> | null
                if (!availableDays) return true
                const dayOfWeek = new Date().getDay()
                const days = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const
                return availableDays[days[dayOfWeek]] !== false
              })
              .sort((a, b) => a.display_order - b.display_order)
              .map((category) => (
                <Button
                  key={category.id}
                  variant="outline"
                  size="sm"
                  className="shrink-0 bg-transparent"
                  onClick={() => scrollToCategory(category.name)}
                >
                  {category.name}
                </Button>
              ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main id="main-content" className="container mx-auto px-4 py-6" role="main" aria-label="Menú del restaurante">
        {categories
          .filter((cat) => cat.is_active)
          .filter((cat) => {
            // Filter by day of week if available_days is set
            const availableDays = cat.available_days as Record<string, boolean> | null
            if (!availableDays) return true // No restriction = show all days
            const dayOfWeek = new Date().getDay()
            const days = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const
            return availableDays[days[dayOfWeek]] !== false
          })
          .sort((a, b) => a.display_order - b.display_order)
          .map((category) => {
            const categoryItems = effectiveMenuItems.filter(
              (item) => item.category === category.name && !isExternalDeliveryItem(item.name)
            )
            if (categoryItems.length === 0) return null

            return (
              <section
                key={category.id}
                className="scroll-mt-32"
                ref={(el) => (categoryRefs.current[category.name] = el)}
              >
                {category.header_image_url && (
                  <div className="w-full mb-2 rounded-lg overflow-hidden shadow-md">
                    <img
                      src={category.header_image_url || "/placeholder.svg"}
                      alt={`${category.name} banner`}
                      className="w-full h-36 md:h-44 lg:h-52 object-cover"
                    />
                  </div>
                )}
                {/* Category Bar Divider */}
                <button
                  onClick={() => toggleCategory(category.id)}
                  className="w-full flex items-center justify-between px-4 md:px-6 py-2.5 cursor-pointer transition-opacity hover:opacity-90 rounded-md"
                  style={{ backgroundColor: primaryColor }}
                >
                  <h2 className="text-sm md:text-base font-bold uppercase tracking-wider text-white">
                    {category.name}
                  </h2>
                  <div className="w-6 h-6 rounded-full border-2 border-white/60 flex items-center justify-center">
                    {collapsedCategories.has(category.id) ? (
                      <Plus className="w-3.5 h-3.5 text-white" />
                    ) : (
                      <Minus className="w-3.5 h-3.5 text-white" />
                    )}
                  </div>
                </button>
                <div className="container mx-auto px-4 py-6">
                  {!collapsedCategories.has(category.id) && (
                    <div className={`${templateStyles.grid} mt-4`}>
                      {categoryItems.map((item) => (
                        <MenuItemCard
                          key={item.id}
                          item={item}
                          template={template}
                          primaryColor={primaryColor}
                          onSelect={() => {
                            if (item.is_bulk_order && !item.pricing_unit) {
                              setBulkOrderItem(item)
                            } else if (isSimpleItem(item)) {
                              // No options — add directly to cart, no dialog
                              addSimpleItemToCart(item)
                            } else {
                              setSelectedItem(item)
                              setUnitQuantity(item.min_quantity || 1)
                              setManualQuantityMode(false)
                              // Set default size
                              if (item.sizes && item.sizes.length > 0) {
                                const defaultSize = item.sizes.find((s) => s.is_default) || item.sizes[0]
                                setSelectedSizeId(defaultSize.id)
                              } else {
                                setSelectedSizeId(null)
                              }
                            }
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </section>
            )
          })}

        {/* Service Packages Section - standalone, outside categories map */}
        {effectiveServicePackages.length > 0 && (
          <section
            id="service-packages-section"
            className="scroll-mt-32"
            ref={(el) => (categoryRefs.current["SERVICE_PACKAGES"] = el)}
          >
            <button
              className="w-full flex items-center justify-between px-4 md:px-6 py-2.5 cursor-pointer transition-opacity hover:opacity-90 rounded-md"
              style={{ backgroundColor: primaryColor }}
            >
              <h2 className="text-sm md:text-base font-bold uppercase tracking-wider text-white">
                {effectiveRestaurant.packages_section_title || "Paquetes de Servicio"}
              </h2>
            </button>
            <div className="container mx-auto px-4 py-6">
              <div className={templateStyles.grid}>
                {effectiveServicePackages.map((pkg) => (
                  <ServicePackageCard
                    key={pkg.id}
                    pkg={pkg}
                    template={template}
                    primaryColor={primaryColor}
                    onSelect={() => {
                      setSelectedPackage(pkg)
                      setShowPackageModal(true)
                    }}
                  />
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Bulk Order Modal */}
      <BulkOrderModal
        item={
          bulkOrderItem
            ? {
                id: bulkOrderItem.id,
                name: bulkOrderItem.name,
                description: bulkOrderItem.description || "",
                per_unit_price: bulkOrderItem.price, // Use bulkOrderItem.price for per_unit_price
                min_quantity: bulkOrderItem.minimum_quantity || 5,
                pricing_unit: bulkOrderItem.quantity_unit || "person",
                image_url: bulkOrderItem.image_url,
                item_options: bulkOrderItem.item_options,
              }
            : null
        }
        isOpen={!!bulkOrderItem}
        onClose={() => setBulkOrderItem(null)}
        onAdd={(quantity, varieties) => {
          if (!bulkOrderItem) return

          const basePrice = bulkOrderItem.price * quantity
          let totalPrice = basePrice

          // Calculate price with variety modifiers
          const varietyDetails = varieties.map((v) => {
            const option = bulkOrderItem.item_options?.find((opt) =>
              opt.item_option_choices?.some((c: any) => c.id === v.choiceId),
            )
            const choice = option?.item_option_choices?.find((c: any) => c.id === v.choiceId)
            if (choice && choice.price_modifier) {
              totalPrice += choice.price_modifier * v.count
            }
            return {
              optionName: option?.category || "",
              choiceName: choice?.name || "",
              count: v.count,
              priceModifier: choice?.price_modifier || 0,
            }
          })

          setCart([
            ...cart,
            {
              type: "menu_item", // Changed type to menu_item for consistency
              item: bulkOrderItem,
              quantity,
              varieties: varietyDetails,
              totalPrice,
              customizations: {}, // Bulk orders might not have standard customizations in the same way
            },
          ])

          setBulkOrderItem(null)
          toast({
                    title: "Agregado al carrito",
                    description: `${quantity} ${bulkOrderItem.quantity_unit || getUnitLabel(bulkOrderItem.pricing_unit, quantity)} de ${bulkOrderItem.name}`,
          })
        }}
        primaryColor={primaryColor}
      />

      {/* Item Customization Modal */}
      <Dialog
        open={!!selectedItem}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedItem(null)
            setItemCustomizations({})
            setSubOptionSelections({})
            setEditingCartIndex(null)
            setUnitQuantity(1)
            setSelectedSizeId(null)
            setManualQuantityMode(false)
          }
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0">
          {selectedItem && (
            <>
              {/* Item Hero Image */}
              {selectedItem.image_url && (
                <div className="relative w-full h-48 md:h-56 shrink-0 overflow-hidden">
                  <img
                    src={selectedItem.image_url}
                    alt={selectedItem.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div className={`${selectedItem.image_url ? "px-6 pt-4" : "px-6 pt-6"}`}>
              <DialogHeader className="pb-4 border-b">
                <DialogTitle className="text-2xl font-bold">{selectedItem.name}</DialogTitle>
                {(hasSizes(selectedItem) || hasUnitPricing(selectedItem)) ? (
                  <div className="mt-1">
                    <p className="text-lg font-semibold text-foreground">
                      {(() => {
                        const price = getEffectivePrice(selectedItem)
                        const serves = getEffectiveServes(selectedItem)


                        // Per-person items: "$18.00 / person, minimum 10 people"
                        if (isPerPersonItem(selectedItem)) {
                          const perUnit = selectedItem.per_unit_price || price
                          return (
                            <>
                              ${perUnit.toFixed(2)}
                              <span className="text-base font-normal text-muted-foreground">
                                {" "}/ persona{selectedItem.min_quantity ? `, minimo ${selectedItem.min_quantity} personas` : ""}
                              </span>
                            </>
                          )
                        }

                      // Build full price line: "$15.00 por Libra | (Sirve 2) | Minimo 5 Libras"
                      const unitLabel = getUnitLabel(selectedItem.pricing_unit, 1)
                      const minQty = selectedItem.min_quantity
                      const qtyUnitLabel = getQuantityUnitLabel(selectedItem.pricing_unit, minQty || 1)

                      return (
                        <>
                          ${price.toFixed(2)}
                          <span className="text-base font-normal text-muted-foreground">
                            {unitLabel && <>{" "}{unitLabel.toLowerCase().startsWith("por") ? unitLabel.toLowerCase() : `/ ${unitLabel}`}</>}
                            {serves ? <>{" | "}(Sirve {serves})</> : ""}
                            {minQty ? <>{" | "}Minimo {minQty} {qtyUnitLabel}</> : ""}
                          </span>
                        </>
                      )
                      })()}
                    </p>
                    <p className="text-muted-foreground text-sm mt-2">{selectedItem.description}</p>
                  </div>
                ) : (
                  <div className="mt-1">
                    <p className="text-lg font-semibold">
                      ${(selectedItem.base_price || 0).toFixed(2)}
                      {selectedItem.min_quantity && selectedItem.min_quantity > 1 && (
                        <span className="text-base font-normal text-muted-foreground">
                          {" | "}Minimo {selectedItem.min_quantity} Unidades
                        </span>
                      )}
                    </p>
                    <p className="text-muted-foreground text-sm mt-1">{selectedItem.description}</p>
                  </div>
                )}
              </DialogHeader>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
                {/* Quantity Selector - compact stepper, hidden when counter option drives quantity */}
                {!hasRequiredCounterOption(selectedItem) && (
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Cantidad</Label>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          const minQty = selectedItem.min_quantity || 1
                          if (unitQuantity > minQty) setUnitQuantity(unitQuantity - 1)
                        }}
                        disabled={unitQuantity <= (selectedItem.min_quantity || 1)}
                        className="flex items-center justify-center w-9 h-9 rounded-full border-2 border-gray-300 text-gray-700 font-bold text-lg disabled:opacity-30 disabled:cursor-not-allowed hover:border-gray-500 transition-colors"
                        aria-label="Disminuir cantidad"
                      >
                        −
                      </button>
                      <span className="w-8 text-center text-lg font-semibold tabular-nums">{unitQuantity}</span>
                      <button
                        type="button"
                        onClick={() => setUnitQuantity(unitQuantity + 1)}
                        className="flex items-center justify-center w-9 h-9 rounded-full border-2 text-white font-bold text-lg hover:opacity-90 transition-opacity"
                        style={{ backgroundColor: primaryColor, borderColor: primaryColor }}
                        aria-label="Aumentar cantidad"
                      >
                        +
                      </button>
                    </div>
                    {(() => {
                      const serves = getEffectiveServes(selectedItem)
                      const isEachItem = !selectedItem.pricing_unit || selectedItem.pricing_unit === "each"
                      // For per-unit items, servings = quantity selected (each unit serves 1 person)
                      if (isEachItem && serves) {
                        return (
                          <p className="text-sm text-muted-foreground">
                            Servira {unitQuantity} personas
                          </p>
                        )
                      }
                      if (serves && !isPerPersonItem(selectedItem)) {
                        // Parse range like "20-25" or single number "10"
                        const parts = serves.split("-").map((s) => Number.parseInt(s.trim()))
                        let servesDisplay: string
                        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                          servesDisplay = unitQuantity > 1 ? `${unitQuantity * parts[0]}-${unitQuantity * parts[1]}` : `${parts[0]}-${parts[1]}`
                        } else if (!isNaN(parts[0])) {
                          servesDisplay = `${unitQuantity * parts[0]}`
                        } else {
                          servesDisplay = serves
                        }
                        return (
                          <p className="text-sm text-muted-foreground">
                            Servira {servesDisplay} personas
                          </p>
                        )
                      }
                      if (isPerPersonItem(selectedItem) && selectedItem.serves) {
                        return (
                          <p className="text-sm text-muted-foreground">
                            Servira {unitQuantity} personas
                          </p>
                        )
                      }
                      return null
                    })()}
                  </div>
                )}

                {/* Size Selection */}
                {hasSizes(selectedItem) && (
                  <div className="space-y-3">
                    <Label className="text-base font-semibold">Seleccionar tamano:</Label>
                    <div className="space-y-2">
                      {selectedItem.sizes!.map((size) => {
                        const isSelected = selectedSizeId === size.id ||
                          (!selectedSizeId && (size.is_default || selectedItem.sizes![0].id === size.id))
                        return (
                          <label
                            key={size.id}
                            className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                              isSelected
                                ? "border-[#6B1F1F] bg-[#6B1F1F]/5"
                                : "border-border hover:border-[#6B1F1F]/50"
                            }`}
                            onClick={() => setSelectedSizeId(size.id)}
                          >
                            <div
                              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                isSelected ? "border-[#6B1F1F]" : "border-gray-300"
                              }`}
                            >
                              {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-[#6B1F1F]" />}
                            </div>
                            <div className="flex-1">
                              <span className="font-medium">
                                {size.name}
                                {size.serves && (
                                  <span className="font-normal text-muted-foreground"> (Serves {size.serves})</span>
                                )}
                              </span>
                            </div>
                            <span className="font-semibold italic text-muted-foreground">
                              (${size.price.toFixed(2)})
                            </span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Item Options - lazy loaded to fix Metropol orphaned choices bug */}
                {loadingItemOptions && (
                  <div className="py-4 border-t text-center text-muted-foreground text-sm">
                    Cargando opciones...
                  </div>
                )}
                {!loadingItemOptions && loadedItemOptions && loadedItemOptions.length > 0 && (
                  <div className="space-y-6 py-4 border-t">
                    {loadedItemOptions
                      .sort((a, b) => a.display_order - b.display_order)
                      .map((option) => {
                        const isMultiSelect = option.max_selection && option.max_selection > 1
                        const currentSelection = itemCustomizations[option.id]
                        const selectedChoiceIds = Array.isArray(currentSelection)
                          ? currentSelection
                          : currentSelection
                            ? [currentSelection]
                            : []

                        // For single select, get the selected choice for sub-options
                        const selectedChoiceId = !isMultiSelect ? (currentSelection as string) : null
                        const selectedChoice = selectedChoiceId
                          ? option.item_option_choices.find((c) => c.id === selectedChoiceId)
                          : null
                        const subOptions = selectedChoice
                          ? option.item_option_choices.filter((c) => c.parent_choice_id === selectedChoice.id)
                          : []

                        return (
                          <div key={option.id} className="space-y-3">
                            <div>
                              <div className="flex items-center justify-between">
                                <Label className="text-base font-semibold">
                                  {formatOptionLabel(option.prompt || option.category)}
                                </Label>
                                {option.is_required ? (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border border-gray-300 text-gray-600 bg-white">Requerido</span>
                                ) : (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border border-gray-200 text-gray-400 bg-gray-50">Opcional</span>
                                )}
                              </div>

                            </div>

                            {option.display_type === "counter" ? (
                              // Counter display - quantity stepper per choice
                              (() => {
                                const counterSelection = (itemCustomizations[option.id] && typeof itemCustomizations[option.id] === "object" && !Array.isArray(itemCustomizations[option.id]))
                                  ? itemCustomizations[option.id] as Record<string, number>
                                  : {} as Record<string, number>
                                const counterTotal = Object.values(counterSelection).reduce((sum, qty) => sum + qty, 0)
                                const minRequired = option.min_selection || 1
                                const maxAllowed = option.max_selection || 999

                                return (
                                  <div className="space-y-3">
                                    {option.item_option_choices
                                      .filter((choice) => !choice.parent_choice_id)
                                      .map((choice) => {
                                        const qty = counterSelection[choice.id] || 0
                                        return (
                                          <div
                                            key={choice.id}
                                            className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border"
                                          >
                                            <div className="flex-1 min-w-0">
                                              <span className="font-medium text-sm">{choice.name}</span>
                                          {choice.price_modifier > 0 && (
                                            <span style={{ color: primaryColor }} className="text-xs font-semibold ml-1.5">
                                              ${choice.price_modifier.toFixed(2)}/u
                                            </span>
                                          )}
                                              {choice.description && (
                                                <p className="text-xs text-muted-foreground mt-0.5">{choice.description}</p>
                                              )}
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  if (qty > 0) {
                                                    setItemCustomizations((prev) => ({
                                                      ...prev,
                                                      [option.id]: { ...counterSelection, [choice.id]: qty - 1 },
                                                    }))
                                                  }
                                                }}
                                                disabled={qty <= 0}
                                                className="flex items-center justify-center w-9 h-9 rounded-lg border border-gray-300 bg-white text-lg font-bold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                                                aria-label={`Disminuir ${choice.name}`}
                                              >
                                                -
                                              </button>
                                              <span className="w-8 text-center font-semibold text-sm tabular-nums">{qty}</span>
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  if (counterTotal < maxAllowed) {
                                                    setItemCustomizations((prev) => ({
                                                      ...prev,
                                                      [option.id]: { ...counterSelection, [choice.id]: qty + 1 },
                                                    }))
                                                  }
                                                }}
                                                disabled={counterTotal >= maxAllowed}
                                                style={{ backgroundColor: primaryColor }}
                                                className="flex items-center justify-center w-9 h-9 rounded-lg text-white text-lg font-bold disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
                                                aria-label={`Aumentar ${choice.name}`}
                                              >
                                                +
                                              </button>
                                            </div>
                                          </div>
                                        )
                                      })}
                                    {/* Counter total summary - always show X/min format with color coding */}
                                    {(() => {
                                      const itemMin = selectedItem?.min_quantity || minRequired
                                      return (
                                        <div className="flex items-center justify-between pt-2 border-t border-dashed">
                                          <span className="text-sm text-muted-foreground">Total seleccionado</span>
                                          <span className={`text-sm font-bold ${counterTotal >= itemMin ? "text-green-600" : "text-red-500"}`}>
                                            {counterTotal}/{itemMin}
                                          </span>
                                        </div>
                                      )
                                    })()}
                                  </div>
                                )
                              })()
                            ) : option.display_type === "dropdown" && !isMultiSelect ? (
                              // Dropdown display for single-select
                              <select
                                value={selectedChoiceIds[0] || ""}
                                onChange={(e) => {
                                  const choiceId = e.target.value
                                  setItemCustomizations((prev) => ({
                                    ...prev,
                                    [option.id]: choiceId,
                                  }))
                                  setSubOptionSelections((prev) => {
                                    const newSelections = { ...prev }
                                    delete newSelections[option.id] // Clear sub-options when parent changes
                                    return newSelections
                                  })
                                }}
                                className="w-full p-3 border rounded-lg bg-background text-foreground"
                              >
                                <option value="">Seleccionar {option.category}...</option>
                                {option.item_option_choices
                                  .filter((choice) => !choice.parent_choice_id)
                                  .map((choice) => (
                                    <option key={choice.id} value={choice.id}>
                                      {choice.name}
                                      {choice.price_modifier > 0 && ` (+$${choice.price_modifier.toFixed(2)})`}
                                    </option>
                                  ))}
                              </select>
                            ) : option.display_type === "list" ? (
                              // List display - vertical with checkboxes/radios
                              <div className="flex flex-col gap-2">
                                {option.item_option_choices
                                  .filter((choice) => !choice.parent_choice_id)
                                  .map((choice) => {
                                    const isSelected = selectedChoiceIds.includes(choice.id)
                                    return (
                                      <label
                                        key={choice.id}
                                        style={{
                                          borderColor: isSelected ? primaryColor : undefined,
                                          backgroundColor: isSelected ? `${primaryColor}10` : undefined,
                                        }}
                                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                                          isSelected ? "shadow-sm" : "border-border hover:border-gray-300"
                                        }`}
                                      >
                                        <input
                                          type={isMultiSelect ? "checkbox" : "radio"}
                                          name={`option-${option.id}`}
                                          checked={isSelected}
                                          onChange={() => {
                                            if (isMultiSelect) {
                                              setItemCustomizations((prev) => {
                                                const current = prev[option.id]
                                                const currentArray = Array.isArray(current)
                                                  ? current
                                                  : current
                                                    ? [current]
                                                    : []
                                                if (currentArray.includes(choice.id)) {
                                                  return {
                                                    ...prev,
                                                    [option.id]: currentArray.filter((id) => id !== choice.id),
                                                  }
                                                } else if (currentArray.length < (option.max_selection || 1)) {
                                                  return { ...prev, [option.id]: [...currentArray, choice.id] }
                                                }
                                                return prev
                                              })
                                            } else {
                                              setItemCustomizations((prev) => ({ ...prev, [option.id]: choice.id }))
                                              setSubOptionSelections((prev) => {
                                                const newSelections = { ...prev }
                                                delete newSelections[option.id] // Clear sub-options when parent changes
                                                return newSelections
                                              })
                                            }
                                          }}
                                          style={{ accentColor: primaryColor }}
                                          className="w-4 h-4"
                                        />
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-1.5">
                                            <span className="font-medium text-sm">{choice.name}</span>
                                            {choice.description && !isSelected && (
                                              <span
                                                title={choice.description}
                                                className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-gray-300 text-[10px] text-muted-foreground cursor-help shrink-0"
                                              >
                                                i
                                              </span>
                                            )}
                                          </div>
                                          {choice.description && isSelected && (
                                            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                              {choice.description}
                                            </p>
                                          )}
                                        </div>
                                        {choice.price_modifier > 0 && (
                                          <span style={{ color: primaryColor }} className="text-xs font-semibold shrink-0">
                                            +${choice.price_modifier.toFixed(2)}
                                          </span>
                                        )}
                                      </label>
                                    )
                                  })}
                              </div>
                            ) : option.display_type === "grid" ? (
                              // Grid display - 2 column with checkboxes/radios
                              <div className="grid grid-cols-2 gap-2">
                                {option.item_option_choices
                                  .filter((choice) => !choice.parent_choice_id)
                                  .map((choice) => {
                                    const isSelected = selectedChoiceIds.includes(choice.id)
                                    return (
                                      <label
                                        key={choice.id}
                                        style={{
                                          borderColor: isSelected ? primaryColor : undefined,
                                          backgroundColor: isSelected ? `${primaryColor}10` : undefined,
                                        }}
                                        className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                                          isSelected ? "shadow-sm" : "border-border hover:border-gray-300"
                                        }`}
                                      >
                                        <input
                                          type={isMultiSelect ? "checkbox" : "radio"}
                                          name={`option-${option.id}`}
                                          checked={isSelected}
                                          onChange={() => {
                                            if (isMultiSelect) {
                                              setItemCustomizations((prev) => {
                                                const current = prev[option.id]
                                                const currentArray = Array.isArray(current)
                                                  ? current
                                                  : current
                                                    ? [current]
                                                    : []
                                                if (currentArray.includes(choice.id)) {
                                                  return {
                                                    ...prev,
                                                    [option.id]: currentArray.filter((id) => id !== choice.id),
                                                  }
                                                } else if (currentArray.length < (option.max_selection || 1)) {
                                                  return { ...prev, [option.id]: [...currentArray, choice.id] }
                                                }
                                                return prev
                                              })
                                            } else {
                                              setItemCustomizations((prev) => ({ ...prev, [option.id]: choice.id }))
                                              setSubOptionSelections((prev) => {
                                                const newSelections = { ...prev }
                                                delete newSelections[option.id] // Clear sub-options when parent changes
                                                return newSelections
                                              })
                                            }
                                          }}
                                          style={{ accentColor: primaryColor }}
                                          className="w-4 h-4"
                                        />
                                        <div className="flex-1 min-w-0">
                                          <span className="font-medium text-sm">{choice.name}</span>
                                          {choice.price_modifier > 0 && (
                                            <span
                                              style={{ color: primaryColor }}
                                              className="text-xs font-semibold ml-1"
                                            >
                                              +${choice.price_modifier.toFixed(2)}
                                            </span>
                                          )}
                                        </div>
                                      </label>
                                    )
                                  })}
                              </div>
                            ) : (
                              // Pills display (default) - existing button grid
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                {option.item_option_choices
                                  .filter((choice) => !choice.parent_choice_id)
                                  .map((choice) => {
                                    const isSelected = selectedChoiceIds.includes(choice.id)
                                    return (
                                      <button
                                        key={choice.id}
                                        onClick={() => {
                                          if (isMultiSelect) {
                                            setItemCustomizations((prev) => {
                                              const current = prev[option.id]
                                              const currentArray = Array.isArray(current)
                                                ? current
                                                : current
                                                  ? [current]
                                                  : []
                                              if (currentArray.includes(choice.id)) {
                                                return {
                                                  ...prev,
                                                  [option.id]: currentArray.filter((id) => id !== choice.id),
                                                }
                                              } else if (currentArray.length < (option.max_selection || 1)) {
                                                return { ...prev, [option.id]: [...currentArray, choice.id] }
                                              }
                                              return prev
                                            })
                                          } else {
                                            setItemCustomizations((prev) => ({ ...prev, [option.id]: choice.id }))
                                            setSubOptionSelections((prev) => {
                                              const newSelections = { ...prev }
                                              delete newSelections[option.id]
                                              return newSelections
                                            })
                                          }
                                        }}
                                        style={{
                                          borderColor: isSelected ? primaryColor : undefined,
                                          backgroundColor: isSelected ? `${primaryColor}10` : undefined,
                                        }}
                                        className={`relative p-3 rounded-lg border text-left transition-all ${
                                          isSelected
                                            ? "shadow-sm"
                                            : "border-border hover:border-gray-300 hover:bg-muted/50"
                                        }`}
                                      >
                                        <div className="flex items-start justify-between gap-2">
                                          <span className="font-medium text-sm">{choice.name}</span>
                                          {isSelected && <Check style={{ color: primaryColor }} className="w-4 h-4" />}
                                        </div>
                                        {choice.price_modifier > 0 && (
                                          <div style={{ color: primaryColor }} className="text-xs font-semibold mt-0.5">
                                            +${choice.price_modifier.toFixed(2)}
                                          </div>
                                        )}
                                        {/* Sub-options for this choice */}
                                        {isSelected && choice.sub_options && choice.sub_options.length > 0 && (
                                          <div
                                            style={{ borderColor: `${primaryColor}30` }}
                                            className="pl-4 border-l-2 space-y-2 mt-4"
                                          >
                                            <p className="text-xs text-muted-foreground font-medium">
                                              {choice.sub_options[0]?.name || "Elegir una opcion"}:
                                            </p>
                                            <div className="flex flex-wrap gap-1.5">
                                              {choice.sub_options.map((subOpt) =>
                                                subOpt.choices?.map((subChoice) => {
                                                  const isSubSelected = subOptionSelections[option.id] === subChoice.id
                                                  return (
                                                    <button
                                                      key={subChoice.id}
                                                      onClick={(e) => {
                                                        e.stopPropagation()
                                                        setSubOptionSelections((prev) => ({
                                                          ...prev,
                                                          [option.id]: subChoice.id,
                                                        }))
                                                      }}
                                                      style={{
                                                        borderColor: isSubSelected ? primaryColor : undefined,
                                                        backgroundColor: isSubSelected
                                                          ? `${primaryColor}10`
                                                          : undefined,
                                                      }}
                                                      className={`px-2 py-1 rounded-md border text-xs transition-all ${
                                                        isSubSelected
                                                          ? "ring-2 ring-opacity-20"
                                                          : "border-border hover:border-gray-400"
                                                      }`}
                                                    >
                                                      <div className="flex items-center gap-1">
                                                        {isSubSelected && (
                                                          <Check style={{ color: primaryColor }} className="w-3 h-3" />
                                                        )}
                                                        <span>{subChoice.name}</span>
                                                      </div>
                                                      {subChoice.price_modifier > 0 && (
                                                        <div
                                                          style={{ color: primaryColor }}
                                                          className="text-xs font-semibold mt-0.5"
                                                        >
                                                          +${subChoice.price_modifier.toFixed(2)}
                                                        </div>
                                                      )}
                                                    </button>
                                                  )
                                                }),
                                              )}
                                            </div>
                                          </div>
                                        )}
                                      </button>
                                    )
                                  })}
                              </div>
                            )}
                            {/* End of display_type conditional */}

                            {/* Sub-options only for single-select */}
                            {!isMultiSelect && subOptions.length > 0 && selectedChoice && (
                              <div className="pl-4 border-l-2 border-[#6B1F1F]/30 space-y-2 mt-4">
                                <Label className="text-sm font-medium text-muted-foreground">
                                  Elegir opcion de {selectedChoice.name}:
                                </Label>
                                <div className="grid grid-cols-2 gap-2">
                                  {subOptions.map((subChoice) => {
                                    const isSubSelected = subOptionSelections[option.id] === subChoice.id
                                    return (
                                      <button
                                        key={subChoice.id}
                                        onClick={() =>
                                          setSubOptionSelections((prev) => ({
                                            ...prev,
                                            [option.id]: subChoice.id,
                                          }))
                                        }
                                        className={`
                                        relative px-2.5 py-1 rounded-lg border-2 text-left transition-all text-sm
                                        ${
                                          isSubSelected
                                            ? "border-[#6B1F1F] bg-[#6B1F1F]/10"
                                            : "border-border hover:border-[#6B1F1F]/50"
                                        }
                                      `}
                                      >
                                        {isSubSelected && (
                                          <div className="absolute top-0.5 right-1">
                                            <Check className="w-3 h-3 text-[#6B1F1F]" />
                                          </div>
                                        )}
                                        <div className="font-medium pr-5">{subChoice.name}</div>
                                        {subChoice.price_modifier > 0 && (
                                          <div className="text-xs text-[#6B1F1F] font-semibold mt-0.5">
                                            +${(subChoice.price_modifier || 0).toFixed(2)}
                                          </div>
                                        )}
                                      </button>
                                    )
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                  </div>
                )}
              </div>

              {/* Special Instructions */}
              <div className="mt-3 px-4">
                <button
                  type="button"
                  className="flex items-center gap-1.5 text-sm font-medium transition-colors"
                  style={{ color: primaryColor }}
                  onClick={() => setShowItemNotes(!showItemNotes)}
                >
                  {showItemNotes ? (
                    <MinusCircle className="h-4 w-4" />
                  ) : (
                    <PlusCircle className="h-4 w-4" />
                  )}
                  Instrucciones especiales
                </button>
                {showItemNotes && (
                  <textarea
                    className="mt-2 w-full border rounded-lg p-3 text-sm focus:outline-none focus:ring-2 resize-y min-h-[80px]"
                    style={{ focusRingColor: primaryColor } as any}
                    placeholder="Informe al restaurante sobre alergias o instrucciones de preparacion."
                    value={itemNotes}
                    onChange={(e) => setItemNotes(e.target.value)}
                    rows={3}
                  />
                )}
              </div>

              <div className="border-t pt-3 mt-2 px-6 pb-4">
                  <div
                    className="flex items-center justify-between p-4 rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: primaryColor }}
                    onClick={handleAddToCart}
                  >
                    <span className="text-white font-bold text-lg">
                      {editingCartIndex !== null ? "Actualizar Carrito" : "Agregar al Carrito"}
                    </span>
                    <div className="text-right">
                      <p className="text-white font-bold text-lg">
                        ${(() => {
                          if (hasRequiredCounterOption(selectedItem)) {
                            return (getCounterItemTotal(selectedItem) + getOptionsTotal(selectedItem)).toFixed(2)
                          }
                          return ((getEffectivePrice(selectedItem) + getOptionsTotal(selectedItem)) * unitQuantity).toFixed(2)
                        })()}
                      </p>
                    </div>
                  </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Package Customization Modal */}
      <Dialog
        open={showPackageModal}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedPackage(null)
            setPackageCustomizations({})
            setPackageSubOptionSelections({})
            setShowPackageModal(false)
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedPackage && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl md:text-2xl font-bold">{selectedPackage.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-5 -mx-2 px-2">
                {/* Package Image */}
                {selectedPackage.image_url && (
                  <div className="relative w-full rounded-lg overflow-hidden" style={{ aspectRatio: "16/9" }}>
                    <Image
                      src={selectedPackage.image_url || "/placeholder.svg"}
                      alt={selectedPackage.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}

                {/* Description */}
                {selectedPackage.description && (
                  <p className="text-muted-foreground text-sm md:text-base italic leading-relaxed">
                    {selectedPackage.description}
                  </p>
                )}

                {/* What's Included - included_items (legacy string array) */}
                {selectedPackage.included_items && selectedPackage.included_items.length > 0 && (
                  <div className="border rounded-lg p-4">
                    <h4 className="font-bold text-sm md:text-base mb-3">Incluido</h4>
                    <ul className="space-y-2.5">
                      {selectedPackage.included_items.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2.5">
                          <Check style={{ color: primaryColor }} className="w-5 h-5 shrink-0 mt-0.5" />
                          <span className="text-sm font-medium">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* What's Included - package_inclusions (DB records) */}
                {selectedPackage.package_inclusions && selectedPackage.package_inclusions.length > 0 && (
                  <div className="border rounded-lg p-4">
                    <h4 className="font-bold text-sm md:text-base mb-3">Incluido</h4>
                    <ul className="space-y-2.5">
                      {selectedPackage.package_inclusions
                        .filter((inc) => inc.is_active !== false)
                        .sort((a, b) => a.display_order - b.display_order)
                        .map((inclusion) => (
                          <li key={inclusion.id} className="flex items-start gap-2.5">
                            <Check style={{ color: primaryColor }} className="w-5 h-5 shrink-0 mt-0.5" />
                            <span className="text-sm font-medium">{inclusion.description}</span>
                          </li>
                        ))}
                    </ul>
                  </div>
                )}

                {/* Optional Add-ons */}
                {selectedPackage.package_addons && selectedPackage.package_addons.length > 0 && (
                  <div>
                    <h4 className="font-bold text-sm md:text-base mb-3">Complementos Opcionales</h4>
                    <div className="space-y-3">
                      {selectedPackage.package_addons
                        .filter((addon) => !addon.parent_addon_id && addon.is_active !== false)
                        .map((addon) => {
                          const addonKey = `${selectedPackage.id}-${addon.id}`
                          const addonCustomization = packageCustomizations[addonKey] || {
                            quantity: 0,
                            selectedChoiceId: null,
                            selectedSubOptionId: null,
                          }
                          const quantity = addonCustomization.quantity
                          const isSelected = quantity > 0

                          const subAddons =
                            selectedPackage.package_addons?.filter((sa) => sa.parent_addon_id === addon.id) || []

                          return (
                            <div key={addon.id} className="space-y-2">
                              {/* Addon Card */}
                              <div
                                className={`flex items-center gap-4 p-4 rounded-lg border transition-all ${isSelected ? "shadow-sm" : "hover:border-gray-300"}`}
                                style={isSelected ? { borderColor: primaryColor, backgroundColor: `${primaryColor}08` } : undefined}
                              >
                                {addon.image_url && (
                                  <div className="relative w-14 h-14 rounded-md overflow-hidden shrink-0">
                                    <Image
                                      src={addon.image_url || "/placeholder.svg"}
                                      alt={addon.name}
                                      fill
                                      className="object-cover"
                                    />
                                  </div>
                                )}

                                <div className="flex-1 min-w-0">
                                  <div className="font-semibold text-sm">{addon.name}</div>
                                  <div className="text-sm text-muted-foreground">
                                    ${(addon.price_per_unit || 0).toFixed(2)} por {addon.unit}
                                  </div>
                                </div>

                                {/* Quantity Stepper */}
                                <div className="flex items-center gap-2 shrink-0">
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8 rounded-full"
                                    onClick={() =>
                                      setPackageCustomizations((prev) => ({
                                        ...prev,
                                        [addonKey]: {
                                          ...addonCustomization,
                                          quantity: Math.max(0, quantity - 1),
                                        },
                                      }))
                                    }
                                    disabled={quantity === 0}
                                  >
                                    <Minus className="w-4 h-4" />
                                  </Button>
                                  <span className="w-6 text-center font-semibold text-sm">{quantity}</span>
                                  <Button
                                    size="icon"
                                    className="h-8 w-8 rounded-full text-white hover:opacity-90"
                                    style={{ backgroundColor: primaryColor }}
                                    onClick={() =>
                                      setPackageCustomizations((prev) => ({
                                        ...prev,
                                        [addonKey]: {
                                          ...addonCustomization,
                                          quantity: quantity + 1,
                                        },
                                      }))
                                    }
                                  >
                                    <Plus className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>

                              {/* Sub-addons appear when parent is selected */}
                              {isSelected && subAddons.length > 0 && (
                                <div className="ml-6 pl-4 border-l-2 space-y-2" style={{ borderColor: `${primaryColor}40` }}>
                                  <Label className="text-sm text-muted-foreground">Seleccionar opcion de {addon.name}:</Label>
                                  <div className="grid grid-cols-2 gap-2">
                                    {subAddons.map((subAddon) => {
                                      const isSubSelected = addonCustomization.selectedSubAddon === subAddon.id
                                      return (
                                        <button
                                          key={subAddon.id}
                                          type="button"
                                          className="p-3 rounded-lg border text-left transition-all"
                                          style={
                                            isSubSelected
                                              ? { borderColor: primaryColor, backgroundColor: `${primaryColor}15` }
                                              : undefined
                                          }
                                          onClick={() =>
                                            setPackageCustomizations((prev) => ({
                                              ...prev,
                                              [addonKey]: { ...addonCustomization, selectedSubAddon: subAddon.id },
                                            }))
                                          }
                                        >
                                          <div className="flex items-center justify-between">
                                            <span className="font-medium text-sm">{subAddon.name}</span>
                                            {isSubSelected && <Check className="w-4 h-4" style={{ color: primaryColor }} />}
                                          </div>
                                          {subAddon.price_per_unit !== addon.price_per_unit && (
                                            <div className="text-xs mt-1" style={{ color: primaryColor }}>
                                              +${((subAddon.price_per_unit || 0) - (addon.price_per_unit || 0)).toFixed(2)}
                                            </div>
                                          )}
                                        </button>
                                      )
                                    })}
                                  </div>
                                </div>
                              )}

                              {/* Addon choices */}
                              {isSelected && addon.package_addon_choices && addon.package_addon_choices.length > 0 && (
                                <div className="ml-6 pl-4 border-l-2 space-y-2" style={{ borderColor: `${primaryColor}40` }}>
                                  <Label className="text-sm text-muted-foreground">Seleccionar opcion de {addon.name}:</Label>
                                  <div className="grid grid-cols-2 gap-2">
                                    {addon.package_addon_choices.map((choice) => {
                                      const isChoiceSelected = addonCustomization.selectedChoiceId === choice.id
                                      return (
                                        <button
                                          key={choice.id}
                                          type="button"
                                          className="p-3 rounded-lg border text-left transition-all"
                                          style={
                                            isChoiceSelected
                                              ? { borderColor: primaryColor, backgroundColor: `${primaryColor}15`, boxShadow: `0 0 0 2px ${primaryColor}30` }
                                              : undefined
                                          }
                                          onClick={() =>
                                            setPackageCustomizations((prev) => ({
                                              ...prev,
                                              [addonKey]: { ...addonCustomization, selectedChoiceId: choice.id },
                                            }))
                                          }
                                        >
                                          <div className="flex items-start gap-2">
                                            {choice.image_url && (
                                              <img
                                                src={choice.image_url || "/placeholder.svg"}
                                                alt={choice.name}
                                                className="w-10 h-10 rounded object-cover shrink-0"
                                              />
                                            )}
                                            <div className="flex-1 min-w-0">
                                              <div className="flex items-center justify-between">
                                                <span className="font-medium text-sm">{choice.name}</span>
                                                {isChoiceSelected && <Check className="w-4 h-4" style={{ color: primaryColor }} />}
                                              </div>
                                              {choice.price_modifier !== 0 && (
                                                <div className="text-xs mt-1" style={{ color: primaryColor }}>
                                                  {choice.price_modifier > 0 ? "+" : ""}${choice.price_modifier.toFixed(2)}
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        </button>
                                      )
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter className="gap-2 sm:gap-0 border-t pt-4 mt-2">
                <Button variant="outline" onClick={() => setSelectedPackage(null)}>
                  Cancelar
                </Button>
                <Button
                  className="hover:opacity-90 text-white"
                  style={{ backgroundColor: primaryColor }}
                  onClick={handleAddPackageToCart}
                >
                  Agregar al Carrito - ${calculatePackagePrice(selectedPackage).toFixed(2)}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Shopping Cart — right-side sliding drawer */}
      {showCart && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowCart(false)}
            aria-hidden="true"
          />
          {/* Panel */}
          <div className="relative ml-auto w-full max-w-md bg-white h-full flex flex-col shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex-shrink-0 flex items-center justify-between px-5 py-4 border-b">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" style={{ color: primaryColor }} />
                <span className="font-bold text-lg">Carrito de Compras</span>
                {foodCartCount > 0 && (
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full text-white"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {foodCartCount} {foodCartCount === 1 ? "artículo" : "artículos"}
                  </span>
                )}
              </div>
              <button
                onClick={() => setShowCart(false)}
                className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Cerrar carrito"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            {/* Scrollable body + footer share the remaining height */}
            <div className="flex flex-col flex-1 min-h-0">

                {foodCartCount === 0 && internalShopItems.length === 0 ? (
                  <div className="py-12 px-5 text-center text-muted-foreground">
                    <div
                      className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${primaryColor}15` }}
              >
                <ShoppingCart className="w-10 h-10" style={{ color: primaryColor, opacity: 0.5 }} />
              </div>
              <p className="text-lg font-medium">Tu carrito esta vacio</p>
              <p className="text-sm mt-1">Agrega algunos articulos deliciosos para comenzar</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-3 min-h-0 py-4 px-5">
              {/* Restaurant Items */}
              {cart
                .filter((item) => item.type !== "delivery_fee")
                .map((item, index) => ({ item, originalIndex: index }))
                .map(({ item, originalIndex: index }) => {
                const isDeliveryFee = false

                return (
                  <div
                    key={index}
                    className="rounded-lg border bg-card p-3 shadow-sm transition-shadow hover:shadow-md"
                    style={{ borderLeftWidth: "3px", borderLeftColor: isDeliveryFee ? "#d97706" : primaryColor }}
                  >
                    <div className="flex gap-3">
                      {/* Thumbnail */}
                      {item.image_url && !isDeliveryFee && (
                        <div className="flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden shadow-sm">
                          <Image
                            src={item.image_url || "/placeholder.svg"}
                            alt={item.name || "Item"}
                            width={80}
                            height={80}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}

                      {isDeliveryFee && (
                        <div className="flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden shadow-sm">
                          {item.image_url ? (
                            <Image
                              src={item.image_url}
                              alt="Entrega a Domicilio"
                              width={80}
                              height={80}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Image
                              src="/images/delivery-woman.jpeg"
                              alt="Entrega a Domicilio"
                              width={80}
                              height={80}
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm sm:text-base">{item.name}</h4>

                            {/* Size variant details */}
                            {item.selectedSizeName && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {item.selectedSizeName}
                                {item.selectedSizeServes && ` | (Sirve ${item.selectedSizeServes})`}
                              </p>
                            )}

                            {/* Unit-based item details -- only show if no size name already displayed */}
                            {item.unitQuantity && item.pricingUnit && !item.selectedSizeName && (
                              <div className="mt-0.5 space-y-0.5">
                                <p className="text-xs text-muted-foreground">
                                  {item.pricingUnit === "person"
                                    ? `Sirve ${item.unitQuantity} Personas`
                                    : <>
                                        {item.unitQuantity} {getUnitLabel(item.pricingUnit, item.unitQuantity)}
                                        {item.servesTotal && (
                                          <span>{" | "}(Sirve {item.servesTotal})</span>
                                        )}
                                      </>
                                  }
                                </p>
                              </div>
                            )}

                            {/* Bulk order variety details */}
                            {item.type === "menu_item" && item.varieties && item.varieties.length > 0 && (
                              <div className="mt-1 flex flex-wrap gap-1">
                                {item.varieties.map((v: any, i: number) => (
                                  <span key={i} className="text-xs bg-gray-100 px-2 py-0.5 rounded-full text-gray-600">
                                    {v.choiceName} x{v.count}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Item Customizations */}
                            {item.selectedOptions && item.type === "item" && Object.keys(item.selectedOptions).length > 0 && (
                              <div className="mt-1.5 space-y-0.5">
                                {Object.entries(item.selectedOptions).map(([optionName, choiceInfo]: [string, any]) => {
                                  // Skip non-string values (e.g., package customization objects)
                                  const displayValue = typeof choiceInfo === "string" ? choiceInfo : null
                                  if (!displayValue) return null
                                  // Split counter-style "Choice x1, Choice x2" into individual lines
                                  const parts = displayValue.includes(" x") ? displayValue.split(", ") : null
                                  if (parts && parts.length > 1) {
                                    return (
                                      <div key={optionName} className="space-y-0.5">
                                        {parts.map((part, i) => (
                                          <p key={i} className="text-xs text-muted-foreground leading-snug">
                                            {part}
                                          </p>
                                        ))}
                                      </div>
                                    )
                                  }
                                  return (
                                    <p
                                      key={optionName}
                                      className="text-xs text-muted-foreground leading-snug"
                                    >
                                      {displayValue}
                                    </p>
                                  )
                                })}
                              </div>
                            )}

                            {/* Package Add-ons as Pills */}
                            {item.selectedAddons && item.selectedAddons.length > 0 && (
                              <div className="mt-2">
                                <span className="text-xs font-medium text-muted-foreground">Complementos:</span>
                                <div className="mt-1 flex flex-wrap gap-1.5">
                                  {item.selectedAddons.map((addon: any, addonIdx: number) => (
                                    <span
                                      key={addonIdx}
                                      className="inline-flex items-center text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700"
                                    >
                                      {addon.name}
                                      {addon.selectedChoice && ` - ${addon.selectedChoice.name}`}
                                      {addon.quantity > 1 && (
                                        <span className="ml-1 font-medium">×{addon.quantity}</span>
                                      )}
                                      {addon.price > 0 && (
                                        <span className="ml-1 text-green-600">+${addon.price.toFixed(2)}</span>
                                      )}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Price */}
                          <div className="flex-shrink-0 text-right">
                            <span className="font-bold text-base" style={{ color: primaryColor }}>
                              ${(item.totalPrice ?? item.finalPrice ?? item.basePrice ?? 0).toFixed(2)}
                            </span>
                          </div>
                        </div>
                        {/* Item Notes */}
                        {item.notes && (
                          <p className="text-xs text-muted-foreground italic mt-1 pl-1">
                            Nota: {item.notes}
                          </p>
                        )}

                        {/* Action Buttons */}
                        {!isDeliveryFee && (
                          <div className="flex items-center justify-between gap-2 mt-3 pt-2 border-t border-dashed">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleEditCartItem(index)}
                                className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-md transition-colors hover:bg-gray-100"
                                style={{ color: primaryColor }}
                              >
                                <Pencil className="w-3 h-3" />
                                Editar
                              </button>
                              <button
                                onClick={() => handleRemoveFromCart(index)}
                                className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-md text-red-600 transition-colors hover:bg-red-50"
                              >
                                <Trash2 className="w-3 h-3" />
                                Eliminar
                              </button>
                            </div>
                            
                            {/* Quantity Controls */}
                            {item.type === "item" && (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleUpdateCartItemQuantity(index, -1)}
                                  disabled={(item.quantity || item.unitQuantity || 1) <= 1}
                                  className="w-7 h-7 rounded-full flex items-center justify-center text-white transition-opacity disabled:opacity-40"
                                  style={{ backgroundColor: primaryColor }}
                                >
                                  <Minus className="w-4 h-4" />
                                </button>
                                <span className="w-6 text-center font-semibold text-sm">
                                  {item.quantity || item.unitQuantity || 1}
                                </span>
                                <button
                                  onClick={() => handleUpdateCartItemQuantity(index, 1)}
                                  className="w-7 h-7 rounded-full flex items-center justify-center text-white transition-opacity hover:opacity-90"
                                  style={{ backgroundColor: primaryColor }}
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* Internal Shop Items (FoodNet Shop) */}
              {internalShopItems.length > 0 && (
                <div className="border-t pt-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded-full">FoodNet Shop</span>
                    <span className="text-xs text-gray-500">Bebidas y Extras</span>
                  </div>
                  {internalShopItems.map((shopItem) => (
                    <div
                      key={`shop-${shopItem.id}`}
                      className="rounded-lg border bg-card p-3 shadow-sm transition-shadow hover:shadow-md"
                      style={{ borderLeftWidth: "3px", borderLeftColor: "#06b6d4" }}
                    >
                      <div className="flex gap-3">
                        {shopItem.image_url && (
                          <div className="flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden shadow-sm bg-gray-100">
                            <Image
                              src={shopItem.image_url}
                              alt={shopItem.name}
                              width={56}
                              height={56}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        {!shopItem.image_url && (
                          <div className="flex-shrink-0 w-14 h-14 rounded-lg bg-cyan-50 flex items-center justify-center">
                            <Package className="w-6 h-6 text-cyan-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-semibold text-sm">{shopItem.name}</h4>
                            <button
                              onClick={() => removeShopItem(shopItem.id)}
                              className="text-gray-400 hover:text-red-500 transition-colors p-1"
                              aria-label="Remover item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">${shopItem.price.toFixed(2)} c/u</p>
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => updateShopItemQuantity(shopItem.id, -1)}
                                disabled={shopItem.quantity <= 1}
                                className="w-6 h-6 rounded-full flex items-center justify-center bg-cyan-500 text-white transition-opacity disabled:opacity-40"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-5 text-center font-semibold text-sm">{shopItem.quantity}</span>
                              <button
                                onClick={() => updateShopItemQuantity(shopItem.id, 1)}
                                className="w-6 h-6 rounded-full flex items-center justify-center bg-cyan-500 text-white hover:opacity-90"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                            <span className="font-bold text-sm" style={{ color: "#06b6d4" }}>
                              ${(shopItem.price * shopItem.quantity).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {effectiveMenuItems.filter((item) => item.is_cart_upsell).length > 0 && (
                <div className="border-t pt-6 space-y-3">
                  <h3 className="font-semibold text-sm">Agregar a Tu Orden</h3>
                  <div className="space-y-2">
                    {menuItems
                      .filter((item) => item.is_cart_upsell)
                      .map((upsellItem) => {
                        const isInCart = cart.some((cartItem) => cartItem.id === upsellItem.id)
                        return (
                          <div
                            key={upsellItem.id}
                            className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              {upsellItem.image_url && (
                                <div className="relative w-12 h-12 rounded overflow-hidden shrink-0">
                                  <Image
                                    src={upsellItem.image_url || "/placeholder.svg"}
                                    alt={upsellItem.name}
                                    fill
                                    className="object-cover"
                                  />
                                </div>
                              )}
                              <div>
                                <p className="font-medium text-sm">{upsellItem.name}</p>
                                <p className="text-xs text-muted-foreground">${upsellItem.base_price?.toFixed(2)}</p>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant={isInCart ? "outline" : "default"}
                              style={!isInCart ? { backgroundColor: primaryColor } : {}}
                              className={!isInCart ? "hover:opacity-90 text-white" : ""}
                              onClick={() => {
                                if (isInCart) {
                                  setCart(cart.filter((item) => item.id !== upsellItem.id))
                                  setCartVersion((v) => v + 1)
                                } else {
                                  // Determine serves from default size or item base
                                  const defaultSize = upsellItem.sizes?.find((s: any) => s.is_default) || upsellItem.sizes?.[0]
                                  const serves = defaultSize?.serves || upsellItem.serves || null
                                  const upsellPrice = upsellItem.base_price || 0
                                  setCart([
                                    ...cart,
                                    {
                                      id: upsellItem.id,
                                      name: upsellItem.name,
                                      type: "item",
                                      price: upsellPrice,
                                      basePrice: upsellPrice,
                                      totalPrice: upsellPrice,
                                      finalPrice: upsellPrice,
                                      quantity: 1,
                                      customizations: [],
                                      selectedOptions: {},
                                      image_url: upsellItem.image_url,
                                      pricing_unit: upsellItem.pricing_unit || "each",
                                      ...(serves ? { selectedSizeServes: serves } : {}),
                                      ...(defaultSize ? { selectedSizeName: defaultSize.name } : {}),
                                    },
                                  ])
                                  setCartVersion((v) => v + 1)
                                }
                              }}
                            >
                              {isInCart ? "Eliminar" : "Agregar"}
                            </Button>
                          </div>
                        )
                      })}
                  </div>
                </div>
              )}

              {/* Compact Upgrades upsell - inside scrollable area, after items */}
              {effectiveServicePackages && effectiveServicePackages.length > 0 && (() => {
                // Only show packages and addons explicitly marked as cart upsells
                const upsellPackages = effectiveServicePackages.filter((pkg) => {
                  if (!pkg.is_active || !pkg.is_cart_upsell) return false
                  // When delivery is selected, hide the cheapest (base delivery) package
                  if (deliveryMethod === "delivery") {
                    const cheapest = effectiveServicePackages
                      .filter((p) => p.is_active)
                      .sort((a, b) => (a.base_price ?? 0) - (b.base_price ?? 0))[0]
                    if (cheapest && pkg.id === cheapest.id) return false
                  }
                  return true
                })
                // Collect addons marked as cart upsells from ALL packages
                const upsellAddons = effectiveServicePackages.flatMap((pkg) =>
                  (pkg.package_addons || []).filter((addon: any) => addon.is_cart_upsell && addon.is_active !== false)
                )
                if (upsellPackages.length === 0 && upsellAddons.length === 0) return null
                return (
                  <div className="border-t pt-3 mt-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="w-3.5 h-3.5" style={{ color: primaryColor }} />
                      <h3 className="font-semibold text-xs uppercase tracking-wide" style={{ color: primaryColor }}>
                        Upgrades - {effectiveRestaurant.packages_section_title || "Paquetes de Servicio"}
                      </h3>
                    </div>
                    <div className="space-y-1.5">
                      {/* Service package rows */}
                      {upsellPackages.map((pkg) => {
                        const isInCart = cart.some((item) => item.type === "package" && item.id === pkg.id)
                        const isPerPerson = pkg.price_per_person != null && pkg.price_per_person > 0
                        const packagePrice = isPerPerson ? pkg.price_per_person : (pkg.base_price ?? 0)
                        return (
                          <div
                            key={pkg.id}
                            className={`flex items-center gap-2.5 rounded-lg p-2 border ${
                              isInCart ? "border-2 bg-white" : "border-gray-200 bg-gray-50/50"
                            }`}
                            style={isInCart ? { borderColor: primaryColor } : {}}
                          >
                            {pkg.image_url && (
                              <div className="flex-shrink-0 w-9 h-9 rounded overflow-hidden bg-gray-100">
                                <img
                                  src={pkg.image_url || "/placeholder.svg"}
                                  alt={pkg.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-gray-900 truncate">{pkg.name}</p>
                              <p className="text-[11px] text-gray-500">
                                Desde <span className="font-semibold" style={{ color: primaryColor }}>${Number(packagePrice).toFixed(2)}</span>{isPerPerson ? "/persona" : ""}
                              </p>
                            </div>
                            {isInCart ? (
                              <span
                                className="flex-shrink-0 inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                                style={{ color: primaryColor, backgroundColor: `${primaryColor}15` }}
                              >
                                <Check className="w-2.5 h-2.5" />
                                Agregado
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setShowCart(false)
                                  setTimeout(() => {
                                    const el = document.getElementById("service-packages-section")
                                    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" })
                                  }, 300)
                                }}
                                className="flex-shrink-0 text-[11px] font-medium px-2.5 py-1 rounded-md border transition-colors"
                                style={{ color: primaryColor, borderColor: primaryColor }}
                              >
                                Ver detalles
                              </button>
                            )}
                          </div>
                        )
                      })}
                      {/* Addon rows */}
                      {upsellAddons.map((addon: any) => {
                        const addonPrice = addon.price_per_unit || 0
                        return (
                          <div
                            key={addon.id}
                            className="flex items-center gap-2.5 rounded-lg p-2 border border-gray-200 bg-gray-50/50"
                          >
                            <div className="flex-shrink-0 w-9 h-9 rounded bg-gray-100 flex items-center justify-center">
                              <Package className="w-4 h-4 text-gray-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-gray-900 truncate">{addon.name}</p>
                              <p className="text-[11px] text-gray-500">
                                <span className="font-semibold" style={{ color: primaryColor }}>${Number(addonPrice).toFixed(2)}</span>
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setShowCart(false)
                                setTimeout(() => {
                                  const el = document.getElementById("service-packages-section")
                                  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" })
                                }, 300)
                              }}
                              className="flex-shrink-0 text-[11px] font-medium px-2.5 py-1 rounded-md border transition-colors"
                              style={{ color: primaryColor, borderColor: primaryColor }}
                            >
                              Ver detalles
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })()}
            </div>
          )}

            {/* Cart Footer with Total */}
            {(foodCartCount > 0 || internalShopItems.length > 0) && (() => {
              // tax_rate is stored as a decimal multiplier (0.115 = 11.5%) — no division needed
              const taxRate = effectiveRestaurant.tax_rate ?? 0
              const menuSubtotal = cart
                .filter((i) => i.type !== "delivery_fee")
                .reduce((s, i) => s + (i.totalPrice || 0), 0)
              const hasCalculatedFee = deliveryFeeCalculation.distance > 0 || deliveryFeeCalculation.zoneName !== ""
              const deliveryFee = deliveryMethod === "delivery" ? deliveryFeeCalculation.displayedFee : 0
              // Dispatch fee = % of subtotal + subsidy (subsidy re-added here as platform revenue)
              const dispatchFeePercent = deliveryMethod === "delivery" ? Number((effectiveRestaurant as any).dispatch_fee_percent || 0) : 0
              const deliverySubsidy = deliveryMethod === "delivery" && hasCalculatedFee
                ? Math.max(0, deliveryFeeCalculation.fee - deliveryFeeCalculation.displayedFee)
                : 0
              const dispatchFee = dispatchFeePercent > 0
                ? Math.ceil(((menuSubtotal * dispatchFeePercent / 100) + deliverySubsidy) / 0.05) * 0.05
                : 0
              const ivuAmount = menuSubtotal * taxRate
              const tipAmount = deliveryForm.tipPercentage > 0
                ? (menuSubtotal * deliveryForm.tipPercentage) / 100
                : Number(deliveryForm.customTip || 0)
              // Include internal shop items in total (separate accounting)
              const shopTotal = internalShopSubtotal + internalShopTax
              const orderTotal = menuSubtotal + deliveryFee + dispatchFee + ivuAmount + tipAmount + shopTotal
              const tipPresets = [10, 15, 18, 20]

              return (
                <div className="flex-shrink-0 border-t bg-white">
                  {/* Below-minimum warning */}
                  {isBelowMinimum && (
                    <div className="px-5 pt-3">
                      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-center">
                        Orden mínima {deliveryMethod === "delivery" ? "para delivery" : "para pickup"}: ${activeMinimumOrder.toFixed(2)}. Faltan ${(activeMinimumOrder - menuItemsTotal).toFixed(2)}.
                      </p>
                    </div>
                  )}

                  {/* Order total section */}
                  <div className="px-5 pt-4 pb-2 space-y-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Detalles de la Orden</p>

                    {/* Restaurant Subtotal */}
                    <div className="flex justify-between text-sm text-gray-700">
                      <span>{internalShopItems.length > 0 ? "Subtotal Restaurante" : "Subtotal"}</span>
                      <span>${menuSubtotal.toFixed(2)}</span>
                    </div>

                    {/* Internal Shop Subtotal (separate accounting) */}
                    {internalShopItems.length > 0 && (
                      <>
                        <div className="flex justify-between text-sm text-gray-700">
                          <span className="flex items-center gap-1.5">
                            <span className="text-cyan-600">FoodNet Shop</span>
                          </span>
                          <span>${internalShopSubtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-gray-500">
                          <span className="text-xs pl-2">IVU Shop (11.5%)</span>
                          <span className="text-xs">${internalShopTax.toFixed(2)}</span>
                        </div>
                      </>
                    )}

                    {/* Delivery fee */}
                    {deliveryMethod === "delivery" && (
                      <div className="flex justify-between text-sm text-gray-700">
                        <span className="flex items-center gap-1">
                          Delivery
                          {deliveryFeeCalculation.distance > 0 && (
                            <span className="text-xs text-gray-400">({deliveryFeeCalculation.distance.toFixed(1)} mi)</span>
                          )}
                        </span>
                        <span>
                          {deliveryFeeCalculation.isCalculating
                            ? <span className="text-gray-400 text-xs">Calculando...</span>
                            : hasCalculatedFee
                              ? (deliveryFee > 0 ? `$${deliveryFee.toFixed(2)}` : <span className="text-green-600 font-medium">Gratis</span>)
                              : <span className="text-gray-700 text-sm">Delivery Fee</span>
                          }
                        </span>
                      </div>
                    )}

                    {/* Dispatch Fee */}
                    {dispatchFee > 0 && (
                      <div className="flex justify-between text-sm text-gray-700">
                        <span>Dispatch Fee</span>
                        <span>${dispatchFee.toFixed(2)}</span>
                      </div>
                    )}

                    {/* IVU (Puerto Rico sales tax) */}
                    {taxRate > 0 && (
                      <div className="flex justify-between text-sm text-gray-700">
                        <span>{internalShopItems.length > 0 ? "IVU Restaurante" : "IVU"}</span>
                        <span>${ivuAmount.toFixed(2)}</span>
                      </div>
                    )}
                  </div>

                  {/* Tip section */}
                  <div className="px-5 py-3 border-t border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Propina</span>
                      <span className="text-sm font-semibold text-gray-900">${tipAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex gap-2">
                      {tipPresets.map((pct) => (
                        <button
                          key={pct}
                          onClick={() => setDeliveryForm({ ...deliveryForm, tipPercentage: pct, customTip: "" })}
                          className="flex-1 py-1.5 rounded-full text-xs font-semibold border transition-all"
                          style={{
                            backgroundColor: deliveryForm.tipPercentage === pct ? primaryColor : "transparent",
                            color: deliveryForm.tipPercentage === pct ? "#fff" : "#374151",
                            borderColor: deliveryForm.tipPercentage === pct ? primaryColor : "#d1d5db",
                          }}
                        >
                          {pct}%
                        </button>
                      ))}
                      <button
                        onClick={() => setDeliveryForm({ ...deliveryForm, tipPercentage: 0, customTip: "" })}
                        className="flex-1 py-1.5 rounded-full text-xs font-semibold border transition-all"
                        style={{
                          backgroundColor: deliveryForm.tipPercentage === 0 && !deliveryForm.customTip ? primaryColor : "transparent",
                          color: deliveryForm.tipPercentage === 0 && !deliveryForm.customTip ? "#fff" : "#374151",
                          borderColor: deliveryForm.tipPercentage === 0 && !deliveryForm.customTip ? primaryColor : "#d1d5db",
                        }}
                      >
                        Otro
                      </button>
                    </div>
                    {deliveryForm.tipPercentage === 0 && (
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Cantidad personalizada"
                        value={deliveryForm.customTip || ""}
                        onChange={(e) => setDeliveryForm({ ...deliveryForm, customTip: e.target.value })}
                        className="mt-2 w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2"
                        style={{ "--tw-ring-color": `${primaryColor}40` } as React.CSSProperties}
                      />
                    )}
                  </div>

                  {/* Shop Upsell Banner */}
                  <div className="px-5 pb-3">
                    <ShopUpsellBanner variant="compact" />
                  </div>

                  {/* Grand total + CTA */}
                  <div className="px-5 pb-2 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-base font-bold text-gray-900">Total</span>
                      <span className="text-base font-bold" style={{ color: primaryColor }}>${orderTotal.toFixed(2)}</span>
                    </div>
                    <Button
                      onClick={handleProceedToCheckout}
                      className="w-full h-12 text-base font-semibold text-white shadow-md hover:shadow-lg transition-shadow"
                      style={{ backgroundColor: primaryColor }}
                      disabled={isBelowMinimum}
                    >
                      {isBelowMinimum ? `Mínimo $${activeMinimumOrder.toFixed(2)}` : "Continuar"}
                    </Button>
                  </div>

                  {/* Legal disclaimer — set per-restaurant in super-admin */}
                  {(effectiveRestaurant as any).cart_disclaimer ? (
                    <div className="px-5 pt-1 pb-4">
                      <p className="text-[11px] text-gray-400 leading-relaxed">
                        {(effectiveRestaurant as any).cart_disclaimer}
                      </p>
                    </div>
                  ) : null}
                </div>
              )
            })()}
            </div>{/* end flex-col body */}
          </div>{/* end panel */}
        </div>
      )}{/* end cart drawer */}

      {/* Delivery Form Dialog (controlled by checkoutStep) */}
      <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
        <DialogContent 
          className="max-w-4xl max-h-[90vh] overflow-y-auto"
          onInteractOutside={(e) => {
            // Prevent dialog from closing when clicking Google Places autocomplete dropdown
            const target = e.target as HTMLElement
            if (target.closest('.pac-container') || target.closest('.pac-item')) {
              e.preventDefault()
            }
          }}
        >
          {checkoutStep === "delivery" && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold" style={{ color: primaryColor }}>
                  Informacion de Entrega
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6">
                <div
                  className="space-y-4 border-l-4 pl-4 -ml-2 py-3 pr-2 rounded-r-lg"
                  style={{
                    borderColor: primaryColor,
                    backgroundColor: `${primaryColor}08`,
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: `${primaryColor}15` }}
                    >
                      <svg
                        className="w-4 h-4"
                        style={{ color: primaryColor }}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                    </div>
                    <h3 className="font-semibold text-lg" style={{ color: primaryColor }}>
                      Informacion de Contacto
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fullName" className="text-sm font-medium">
                        Nombre Completo *
                      </Label>
                      <Input
                        id="fullName"
                        type="text"
                        value={deliveryForm.fullName}
                        onChange={(e) => setDeliveryForm({ ...deliveryForm, fullName: e.target.value })}
                        className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg transition-all focus:ring-2"
                        style={
                          {
                            "--tw-ring-color": `${primaryColor}30`,
                          } as React.CSSProperties
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm font-medium">
                        Email *
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={deliveryForm.email}
                        onChange={(e) => setDeliveryForm({ ...deliveryForm, email: e.target.value })}
                        className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg transition-all focus:ring-2"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-sm font-medium">
                        Telefono *
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={deliveryForm.phone}
                        onChange={(e) => setDeliveryForm({ ...deliveryForm, phone: e.target.value })}
                        placeholder="(787) 000-0000"
                        className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg transition-all focus:ring-2"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company" className="text-sm font-medium">
                        Nombre de Empresa
                      </Label>
                      <Input
                        id="company"
                        type="text"
                        value={deliveryForm.company}
                        onChange={(e) => setDeliveryForm({ ...deliveryForm, company: e.target.value })}
                        className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg transition-all focus:ring-2"
                      />
                    </div>
                  </div>
                </div>

                <div
                  className="space-y-4 border-l-4 pl-4 -ml-2 py-3 pr-2 rounded-r-lg"
                  style={{
                    borderColor: primaryColor,
                    backgroundColor: `${primaryColor}08`,
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: `${primaryColor}15` }}
                    >
                      <svg
                        className="w-4 h-4"
                        style={{ color: primaryColor }}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2h-3l-4 4z"
                        />
                      </svg>
                    </div>
                    <h3 className="font-semibold text-lg" style={{ color: primaryColor }}>
                      {deliveryMethod === "delivery" ? "Detalles de la Entrega" : "Detalles del Recogido"}
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="eventDate" className="text-sm font-medium">
                        {deliveryMethod === "delivery" ? "Fecha del Delivery" : "Fecha de Recogido"} *
                      </Label>
                      {leadTimeHours > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {deliveryMethod === "delivery" ? "Entrega" : "Recogido"} requiere minimo {leadTimeHours} horas de anticipacion.
                          Puedes programar hasta {maxAdvanceDays} dias de antelacion.
                        </p>
                      )}
                      {leadTimeHours > getMethodLeadTime() && (
                        <p className="text-sm text-amber-600">
                          Tu carrito contiene articulos que requieren {leadTimeHours} horas de anticipacion
                        </p>
                      )}
                      <Input
                        id="eventDate"
                        type="date"
                        required
                        min={minDate.toISOString().split("T")[0]}
                        max={maxDate.toISOString().split("T")[0]}
                        value={deliveryForm.eventDate}
                        onChange={(e) => {
                          const val = e.target.value
                          if (val) {
                            const selected = new Date(val + "T12:00:00")
                            if (isDayClosed(selected)) {
                              toast({
                                title: "Dia no disponible",
                                description: `No aceptamos pedidos los ${DAY_NAMES_FULL[selected.getDay()]}. Por favor selecciona otro dia.`,
                                variant: "destructive",
                              })
                              return
                            }
                          }
                          setDeliveryForm({ ...deliveryForm, eventDate: val })
                        }}
                        className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg transition-all focus:ring-2"
                        style={
                          {
                            "--tw-ring-color": `${primaryColor}30`,
                          } as React.CSSProperties
                        }
                      />
                      {getClosedDayNames().length > 0 && (
                        <p className="text-xs text-amber-600">
                          Cerrado: {getClosedDayNames().join(", ")}
                        </p>
                      )}
                    </div>
                    {/* Only show time selector for pre-orders (when date is not today) */}
                    {isPreOrder && (
                      <div className="space-y-2">
                        <Label htmlFor="eventTime" className="text-sm font-medium">
                          {deliveryMethod === "delivery" ? "Hora de Entrega Solicitada" : "Hora de Recogido"} *
                        </Label>
                        <select
                          id="eventTime"
                          value={deliveryForm.eventTime}
                          onChange={(e) => setDeliveryForm({ ...deliveryForm, eventTime: e.target.value })}
                          className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg transition-all focus:ring-2 bg-background"
                          required
                          style={
                            {
                              "--tw-ring-color": `${primaryColor}30`,
                            } as React.CSSProperties
                          }
                        >
                          <option value="">Selecciona una hora</option>
                          {/* Generate time slots in 15-minute increments from 11:30 to 21:00 */}
                          {(() => {
                            const slots = []
                            for (let hour = 11; hour <= 21; hour++) {
                              for (let min = 0; min < 60; min += 15) {
                                // Start at 11:30, end at 21:00
                                if (hour === 11 && min < 30) continue
                                if (hour === 21 && min > 0) continue
                                const timeValue = `${hour.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`
                                const displayHour = hour > 12 ? hour - 12 : hour
                                const ampm = hour >= 12 ? "PM" : "AM"
                                const displayTime = `${displayHour}:${min.toString().padStart(2, "0")} ${ampm}`
                                slots.push(
                                  <option key={timeValue} value={timeValue}>
                                    {displayTime}
                                  </option>
                                )
                              }
                            }
                            return slots
                          })()}
                        </select>
                        <p className="text-xs text-muted-foreground mt-1">Horario: 11:30 AM - 9:00 PM</p>
                      </div>
                    )}
                  </div>
                </div>

                {deliveryMethod === "delivery" && (
                  <div
                    className="space-y-4 p-6 rounded-xl border-l-4"
                    style={{
                      borderColor: primaryColor,
                      backgroundColor: `${primaryColor}08`,
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg" style={{ backgroundColor: primaryColor }}>
                        <MapPin className="w-5 h-5 text-white" />
                      </div>
                      <h3 className="text-lg font-semibold" style={{ color: primaryColor }}>
                        Direccion de Entrega
                      </h3>
                    </div>

                    {/* Saved Addresses Selector */}
                    {customerAddresses.length > 0 && (
                      <div className="space-y-2">
                        <Label>Direcciones Guardadas</Label>
                        <div className="grid gap-2">
                          {customerAddresses.map((addr) => (
                            <button
                              key={addr.id}
                              type="button"
                              onClick={() => {
                                setDeliveryForm({
                                  ...deliveryForm,
                                  streetAddress: addr.address_line_1,
                                  streetAddress2: addr.address_line_2 || "",
                                  city: addr.city,
                                  state: addr.state || "PR",
                                  zip: addr.postal_code || "",
                                  deliveryInstructions: addr.delivery_instructions || "",
                                })
                                // Trigger delivery fee calculation
                                handleCalculateDeliveryFee({
                                  ...deliveryForm,
                                  streetAddress: addr.address_line_1,
                                  city: addr.city,
                                  state: addr.state || "PR",
                                  zip: addr.postal_code || "",
                                })
                              }}
                              className="flex items-start gap-3 p-3 border rounded-lg text-left hover:bg-slate-50 transition-colors"
                              style={{
                                borderColor: deliveryForm.streetAddress === addr.address_line_1 ? primaryColor : "#e5e7eb",
                                backgroundColor: deliveryForm.streetAddress === addr.address_line_1 ? `${primaryColor}10` : "white",
                              }}
                            >
                              <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: primaryColor }} />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm">
                                  {addr.label || "Direccion"}
                                  {addr.is_default && (
                                    <span className="ml-2 text-xs bg-slate-100 px-2 py-0.5 rounded">Principal</span>
                                  )}
                                </p>
                                <p className="text-sm text-muted-foreground truncate">
                                  {addr.address_line_1}
                                  {addr.address_line_2 && `, ${addr.address_line_2}`}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {addr.city}{addr.state && `, ${addr.state}`} {addr.postal_code}
                                </p>
                              </div>
                            </button>
                          ))}
                        </div>
                        <div className="relative py-2">
                          <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                          </div>
                          <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-white px-2 text-muted-foreground">o ingresa nueva direccion</span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div>
                      <Label>Direccion *</Label>
                      <AddressAutocomplete
                        value={deliveryForm.streetAddress}
                        onChange={(val) => setDeliveryForm({ ...deliveryForm, streetAddress: val })}
                        onAddressSelected={(components: AddressComponents) => {
                          // ALWAYS override with autocomplete values when user selects an address
                          const newForm = {
                            ...deliveryForm,
                            streetAddress: components.streetAddress || deliveryForm.streetAddress,
                            city: components.city, // Always use autocomplete value
                            state: components.state || "PR",
                            zip: components.zip, // Always use autocomplete value
                          }
                          setDeliveryForm(newForm)
                          setZoneCheck({ checked: false, inZone: true, distance: null, radius: 7, closerBranch: null, acknowledged: false })
                          
                          // Trigger delivery fee calculation with the new address data directly
                          handleCalculateDeliveryFee(newForm)
                        }}
                        onBlur={handleCalculateDeliveryFee}
                        placeholder="Número de Casa o Edificio, Calle"
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <Label>Direccion Linea 2</Label>
                      <Input
                        value={deliveryForm.streetAddress2}
                        onChange={(e) => setDeliveryForm({ ...deliveryForm, streetAddress2: e.target.value })}
                        onBlur={handleCalculateDeliveryFee}
                        placeholder="Urbanizacion, Condominio, Apt., etc."
                        className="mt-2"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <Label>Ciudad *</Label>
                        <Input
                          required
                          value={deliveryForm.city}
                          onChange={(e) => setDeliveryForm({ ...deliveryForm, city: e.target.value })}
                          placeholder="Ciudad"
                          onBlur={handleCalculateDeliveryFee}
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <Label>Estado</Label>
                        <div className="mt-2 px-3 py-2 border rounded-md bg-muted text-sm font-medium text-muted-foreground select-none">
                          PR — Puerto Rico
                        </div>
                      </div>
                      <div>
                        <Label>Codigo Postal *</Label>
                        <Input
                          required
                          value={deliveryForm.zip}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, "").slice(0, 5)
                            setDeliveryForm({ ...deliveryForm, zip: val })
                          }}
                          placeholder="00900"
                          maxLength={5}
                          pattern="00[679]\d{2}"
                          title="Ingresa un codigo postal valido de Puerto Rico (006xx, 007xx, 009xx)"
                          onBlur={(e) => {
                            const val = e.target.value
                            if (val && !/^00[679]\d{2}$/.test(val)) {
                              e.target.setCustomValidity("Codigo postal invalido. Puerto Rico usa codigos que comienzan con 006, 007 o 009.")
                            } else {
                              e.target.setCustomValidity("")
                              handleCalculateDeliveryFee()
                            }
                          }}
                          className="mt-2"
                        />
                      </div>
                    </div>

                    {deliveryFeeCalculation.isCalculating && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 mt-4">
                        <div
                          className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
                          style={{ borderColor: primaryColor, borderTopColor: "transparent" }}
                        />
                        <span>Calculando costo de entrega...</span>
                      </div>
                    )}

                    {deliveryFeeCalculation.error && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 mt-4">
                        {deliveryFeeCalculation.error}
                      </div>
                    )}

                    {!deliveryFeeCalculation.isCalculating &&
                      !deliveryFeeCalculation.error &&
                      deliveryFeeCalculation.distance > 0 && (
                        <div
                          className="p-3 bg-white rounded-lg border mt-4"
                          style={{ borderColor: `${primaryColor}40` }}
                        >
                          <div className="text-sm text-gray-600">
                            <div className="flex justify-between">
                              <span>Zona:</span>
                              <span className="font-medium text-gray-900">{deliveryFeeCalculation.zoneName}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Distancia:</span>
                              <span className="font-medium text-gray-900">
                                {deliveryFeeCalculation.distance.toFixed(1)} millas
                              </span>
                            </div>
                            {deliveryFeeCalculation.itemSurcharge > 0 && (
                              <div className="flex justify-between text-xs mt-1 pt-1 border-t">
                                <span>Recargo por orden grande:</span>
                                <span className="font-medium">${deliveryFeeCalculation.itemSurcharge.toFixed(2)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                  </div>
                )}

                <div
                  className="space-y-2 border-l-4 pl-4 -ml-2 py-3 pr-2 rounded-r-lg"
                  style={{
                    borderColor: primaryColor,
                    backgroundColor: `${primaryColor}08`,
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: `${primaryColor}15` }}
                    >
                      <svg
                        className="w-4 h-4"
                        style={{ color: primaryColor }}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 00-2 2v12a2 2 0 002 2h-3l-4 4z"
                        />
                      </svg>
                    </div>
                    <Label
                      htmlFor="specialInstructions"
                      className="text-sm font-medium"
                      style={{ color: primaryColor }}
                    >
                      Instrucciones Especiales
                    </Label>
                  </div>
                  <textarea
                    id="specialInstructions"
                    value={deliveryForm.specialInstructions}
                    onChange={(e) => setDeliveryForm({ ...deliveryForm, specialInstructions: e.target.value })}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg transition-all min-h-[80px] focus:ring-2"
                    style={
                      {
                        "--tw-ring-color": `${primaryColor}30`,
                      } as React.CSSProperties
                    }
                    placeholder="Cualquier peticion especial o restriccion alimentaria..."
                  />
                </div>

                {/* Internal Shop Extras - Add drinks, snacks, etc. */}
                <div
                  className="space-y-4 border-l-4 pl-4 -ml-2 py-3 pr-2 rounded-r-lg"
                  style={{
                    borderColor: primaryColor,
                    backgroundColor: `${primaryColor}08`,
                  }}
                >
                  <InternalShopExtras
                    onAddToCart={(item, quantity) => {
                      setCart((prevCart) => {
                        // Remove any existing internal shop item with same ID
                        const filtered = prevCart.filter(
                          (cartItem) => !(cartItem.type === "internal_shop" && cartItem.internalShopItemId === item.id)
                        )
                        
                        // Add if quantity > 0
                        if (quantity > 0) {
                          filtered.push({
                            type: "internal_shop",
                            id: `internal-${item.id}`,
                            internalShopItemId: item.id,
                            name: item.name,
                            price: Number(item.price),
                            finalPrice: Number(item.price),
                            totalPrice: Number(item.price) * quantity,
                            quantity: quantity,
                            image_url: item.image_url,
                            category: item.category,
                          })
                        }
                        
                        return filtered
                      })
                      setCartVersion((v) => v + 1)
                    }}
                    existingItems={cart
                      .filter((item) => item.type === "internal_shop")
                      .map((item) => ({ id: item.internalShopItemId, quantity: item.quantity }))}
                  />
                </div>

                <div className="p-6 rounded-xl text-white space-y-3" style={{ backgroundColor: primaryColor }}>
                  <h3 className="text-lg font-semibold mb-4">Resumen del Pedido</h3>

                  {/* Line items in order summary */}
                  {cart
                    .filter((item) => item.type !== "delivery_fee")
                    .map((item, index) => {
                      // Determine serving info for the item
                      const servesCount = item.pricingUnit === "person"
                        ? item.unitQuantity
                        : item.selectedSizeServes || item.servesTotal || null
                      return (
                      <div key={index} className="flex justify-between text-sm">
                        <span>
                          {item.type === "package" ? (
                            <span className="font-medium">{item.name}</span>
                          ) : (
                            <>
                              <span className="font-medium">{item.name}</span>
                              {servesCount && (
                                <span className="text-xs text-white/70 ml-1">
                                  (sirve {servesCount})
                                </span>
                              )}
                              {!servesCount && item.selectedOptions && Object.keys(item.selectedOptions).length > 0 && (
                                <span className="text-xs text-white/70 ml-1">
                                  ({Object.values(item.selectedOptions).filter((v) => typeof v === "string").length} opciones)
                                </span>
                              )}
                            </>
                          )}
                        </span>
                        <span className="font-medium ml-4">${(item.totalPrice ?? item.finalPrice ?? item.basePrice ?? 0).toFixed(2)}</span>
                      </div>
                      )
                    })}

                  <div className="border-t border-white/20 pt-3 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal:</span>
                      <span>${subtotal.toFixed(2)}</span>
                    </div>
                    {deliveryMethod === "delivery" && (
                      <div className="flex justify-between text-sm">
                        <span>
                          Costo de Entrega
                          {deliveryFeeCalculation.distance > 0 && ` (${deliveryFeeCalculation.distance.toFixed(1)} mi)`}
                          :
                        </span>
                        <span>${deliveryFeeCalculation.displayedFee.toFixed(2)}</span>
                      </div>
                    )}
                    {deliveryMethod === "delivery" && dispatchFee > 0 && (
                      <div className="flex justify-between text-sm">
                        <span>Cargo por Servicio:</span>
                        <span>${dispatchFee.toFixed(2)}</span>
                      </div>
                    )}
                    {/* CHANGE: Tax label now falls back to 0% instead of 8.75% */}
                    <div className="flex justify-between text-sm">
                      <span>IVU ({Math.round((effectiveRestaurant.tax_rate || 0) * 1000) / 10}%):</span>
                      <span>${taxAmount.toFixed(2)}</span>
                    </div>
                    {tipAmount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span>Propina:</span>
                        <span>${tipAmount.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                  <div className="border-t border-white/20 pt-2 mt-2">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total:</span>
                      <span>${total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t space-y-3 relative z-10">
                  {/* Stripe Payment Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleSubmitCheckout()
                    }}
                    className="w-full flex items-center justify-center gap-3 p-4 bg-[#635BFF] text-white rounded-lg hover:bg-[#5349E0] transition-colors shadow-lg cursor-pointer active:scale-[0.98]"
                  >
                    <svg className="w-8 h-5" viewBox="0 0 60 25" fill="currentColor">
                      <path d="M59.64 14.28c0-4.7-2.3-8.4-6.7-8.4-4.4 0-7.1 3.7-7.1 8.4 0 5.5 3.2 8.3 7.7 8.3 2.2 0 3.9-.5 5.2-1.2v-3.6c-1.3.6-2.7 1-4.5 1-1.8 0-3.4-.6-3.6-2.8h9c0-.2.1-1.1.1-1.7zm-9.1-1.7c0-2.1 1.3-3 2.5-3s2.4.9 2.4 3h-4.9zM40.3 5.88c-1.8 0-3 .8-3.6 1.4l-.2-1.1h-4v20.1l4.5-1v-4.9c.7.5 1.7 1.2 3.3 1.2 3.3 0 6.4-2.7 6.4-8.5-.1-5.4-3.2-8.2-6.4-8.2zm-1.1 12.6c-1.1 0-1.8-.4-2.2-.9v-7.2c.5-.5 1.2-1 2.2-1 1.7 0 2.9 1.9 2.9 4.5 0 2.7-1.2 4.6-2.9 4.6zM27.4 5.08l4.5-1V.48l-4.5 1v3.6zM27.4 6.18h4.5v15.4h-4.5V6.18zM22.6 7.68l-.3-1.5h-4v15.4h4.5v-10.4c1.1-1.4 2.9-1.1 3.4-1v-4.2c-.6-.2-2.7-.5-3.6 1.7zM12.5 2.58l-4.4.9-.02 14.1c0 2.6 2 4.5 4.6 4.5 1.4 0 2.5-.3 3.1-.6v-3.6c-.5.2-3.2.9-3.2-1.4v-5.6h3.2v-3.8h-3.2l-.06-4.5zM3.3 10.88c0-.6.5-1 1.4-1 1.3 0 2.9.4 4.2 1.1V7.18c-1.4-.5-2.8-.8-4.2-.8-3.5 0-5.8 1.8-5.8 4.9 0 4.7 6.5 4 6.5 6 0 .7-.6 1-1.5 1-1.3 0-3-.5-4.3-1.3v3.9c1.5.6 2.9.9 4.3.9 3.5 0 6-1.8 6-4.9-.1-5.1-6.6-4.2-6.6-6.07z"/>
                    </svg>
                    <span className="font-semibold">Pagar con Tarjeta</span>
                  </button>

                  {/* ATH Movil Payment Button - Official Design */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleSubmitCheckout()
                      // After checkout data is set, we'll show ATH Movil
                      setTimeout(() => {
                        setShowStripeCheckout(false)
                        setShowATHMovilCheckout(true)
                      }, 100)
                    }}
                    className="w-full flex items-center justify-center gap-2 p-4 bg-[#F58220] text-white rounded-lg hover:bg-[#E57310] transition-colors shadow-lg cursor-pointer active:scale-[0.98]"
                  >
                    <span className="font-semibold text-lg">Pay with</span>
                    <div className="bg-white rounded px-2 py-0.5 flex items-center">
                      <span className="text-[#F58220] font-black text-lg tracking-tight">ATH</span>
                    </div>
                    <span className="font-semibold text-lg">Móvil</span>
                  </button>

                  {/* Back to Cart Button */}
                  <Button
                    variant="outline"
                    onClick={() => {
                      setCheckoutStep(null)
                      setShowCheckout(false)
                      setShowCart(true)
                    }}
                    className="w-full border-2"
                    style={{
                      borderColor: primaryColor,
                      color: primaryColor,
                    }}
                  >
                    Volver al Carrito
                  </Button>
                </div>

                {/* Delivery Zone Warning */}
                {zoneCheck.checked && !zoneCheck.inZone && deliveryMethod === "delivery" && (
                  <div className="mx-4 mb-4 rounded-lg border border-amber-300 bg-amber-50 p-4 space-y-3">
                    <div className="flex items-start gap-2">
                      <MapPin className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-amber-800">
                          {"Tu direccion esta a "}
                          {zoneCheck.distance?.toFixed(1)}
                          {" millas de esta sucursal (radio de delivery: "}
                          {zoneCheck.radius}
                          {" millas)."}
                        </p>
                      </div>
                    </div>

                    {/* Smart suggestion: closer branch */}
                    {zoneCheck.closerBranch && (
                      <div className="rounded-md border border-green-200 bg-green-50 p-3">
                        <p className="text-sm font-medium text-green-800 mb-2">
                          {"Nuestra sucursal de "}
                          <strong>{zoneCheck.closerBranch.name}</strong>
                          {" esta mas cerca de tu direccion ("}
                          {zoneCheck.closerBranch.distance}
                          {" millas)."}
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-green-600 text-green-700 hover:bg-green-100"
                          onClick={() => {
                            const branch = branches.find((b: any) => b.id === zoneCheck.closerBranch!.id)
                            if (branch) {
                              setSelectedBranch(branch)
                              setZoneCheck({ checked: false, inZone: true, distance: null, radius: 7, closerBranch: null, acknowledged: false })
                              toast({ title: "Sucursal cambiada", description: `Ahora estas ordenando de ${branch.name}.` })
                            }
                          }}
                        >
                          {"Cambiar a "}{zoneCheck.closerBranch.name}
                        </Button>
                      </div>
                    )}

                    {/* Soft block: let them continue anyway */}
                    {!zoneCheck.acknowledged && (
                      <div className="pt-2 border-t border-amber-200">
                        <p className="text-sm text-amber-700 mb-2">
                          Si deseas, envia tu orden de todas formas y trataremos de hacer lo mayor posible para que se pueda lograr. Te llamaremos con mas detalles.
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-amber-600 text-amber-700 hover:bg-amber-100"
                          onClick={() => setZoneCheck((prev) => ({ ...prev, acknowledged: true }))}
                        >
                          Continuar de todas formas
                        </Button>
                      </div>
                    )}

                    {zoneCheck.acknowledged && (
                      <p className="text-sm text-green-700 font-medium">
                        Orden aceptada fuera de zona. Nos comunicaremos contigo para confirmar.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Pre-Order Scheduling Dialog */}
      <Dialog open={showPreorderDialog} onOpenChange={setShowPreorderDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-xl">Ordenar por Adelantado</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-center text-slate-600 mb-6">
              {restaurant.name} esta cerrado en este momento. Puedes programar tu orden para cuando abran.
            </p>
            
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
                <p className="text-sm text-amber-800 font-medium mb-1">Proxima Apertura</p>
                <p className="text-2xl font-bold text-amber-900">
                  {(() => {
                    // Calculate next opening time from restaurantHours
                    const now = new Date()
                    const prFormatter = new Intl.DateTimeFormat('en-US', {
                      timeZone: 'America/Puerto_Rico',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false,
                    })
                    const prParts = prFormatter.formatToParts(now)
                    const prHour = prParts.find(p => p.type === 'hour')?.value || '00'
                    const prMinute = prParts.find(p => p.type === 'minute')?.value || '00'
                    const currentTime = `${prHour}:${prMinute}:00`
                    
                    const prDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/Puerto_Rico' }))
                    const dayOfWeek = prDate.getDay()
                    
                    const todayHours = restaurantHours.find(h => h.day_of_week === dayOfWeek)
                    if (todayHours) {
                      const shifts = [
                        todayHours.breakfast_open,
                        todayHours.lunch_open,
                        todayHours.dinner_open,
                      ].filter(Boolean)
                      
                      for (const openTime of shifts) {
                        if (openTime && currentTime < openTime) {
                          const [h, m] = openTime.split(':')
                          const hour = parseInt(h)
                          const ampm = hour >= 12 ? 'PM' : 'AM'
                          const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour)
                          return `${displayHour}:${m} ${ampm}`
                        }
                      }
                    }
                    return "Mañana"
                  })()}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Selecciona hora de entrega deseada
                </label>
                <select 
                  className="w-full border border-slate-300 rounded-lg p-3 text-base"
                  value={scheduledDeliveryTime || ""}
                  onChange={(e) => setScheduledDeliveryTime(e.target.value)}
                >
                  <option value="">Seleccionar hora...</option>
                  {(() => {
                    // Generate time slots based on restaurant hours, starting from next opening time
                    const options: JSX.Element[] = []
                    const now = new Date()
                    const prFormatter = new Intl.DateTimeFormat('en-US', {
                      timeZone: 'America/Puerto_Rico',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false,
                    })
                    const prParts = prFormatter.formatToParts(now)
                    const prHour = prParts.find(p => p.type === 'hour')?.value || '00'
                    const prMinute = prParts.find(p => p.type === 'minute')?.value || '00'
                    const currentTimeMinutes = parseInt(prHour) * 60 + parseInt(prMinute)
                    
                    const prDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/Puerto_Rico' }))
                    const dayOfWeek = prDate.getDay()
                    const todayHours = restaurantHours.find(h => h.day_of_week === dayOfWeek)
                    
                    // Find the next opening time
                    let nextOpenMinutes = 0
                    if (todayHours) {
                      const openTimes = [
                        todayHours.breakfast_open,
                        todayHours.lunch_open,
                        todayHours.dinner_open,
                      ].filter(Boolean)
                      
                      for (const openTime of openTimes) {
                        if (openTime) {
                          const [h, m] = openTime.split(':').map(Number)
                          const openMinutes = h * 60 + (m || 0)
                          if (openMinutes > currentTimeMinutes) {
                            nextOpenMinutes = openMinutes
                            break
                          }
                        }
                      }
                    }
                    
                    if (todayHours) {
                      const shifts = [
                        { name: 'Almuerzo', open: todayHours.lunch_open, close: todayHours.lunch_close },
                        { name: 'Cena', open: todayHours.dinner_open, close: todayHours.dinner_close },
                      ]
                      
                      for (const shift of shifts) {
                        if (shift.open && shift.close) {
                          const [startH] = shift.open.split(':').map(Number)
                          const [endH] = shift.close.split(':').map(Number)
                          
                          for (let h = startH; h < endH; h++) {
                            for (const m of ['00', '30']) {
                              const slotMinutes = h * 60 + parseInt(m)
                              // Only show times >= next opening time + 45 minutes buffer
                              const minAllowedTime = nextOpenMinutes + 45
                              if (slotMinutes >= minAllowedTime) {
                                const hour = h > 12 ? h - 12 : (h === 0 ? 12 : h)
                                const ampm = h >= 12 ? 'PM' : 'AM'
                                const timeStr = `${hour}:${m} ${ampm}`
                                const value = `${h.toString().padStart(2, '0')}:${m}`
                                options.push(
                                  <option key={value} value={value}>{timeStr}</option>
                                )
                              }
                            }
                          }
                        }
                      }
                    }
                    return options.length > 0 ? options : <option disabled>No hay horarios disponibles</option>
                  })()}
                </select>
              </div>
            </div>
          </div>
          
          <DialogFooter className="flex gap-2">
            <button
              onClick={() => setShowPreorderDialog(false)}
              className="flex-1 px-4 py-3 border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              onClick={() => {
                if (scheduledDeliveryTime) {
                  // Update the delivery form with the scheduled time
                  setDeliveryForm(prev => ({
                    ...prev,
                    eventTime: scheduledDeliveryTime
                  }))
                  setShowPreorderDialog(false)
                }
              }}
              disabled={!scheduledDeliveryTime}
              className="flex-1 px-4 py-3 bg-pink-500 text-white rounded-lg font-medium hover:bg-pink-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continuar
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Provider Selector (when branch has "both" payment providers) */}
      {showPaymentSelector && checkoutData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-black/50" 
            onClick={() => {
              setShowPaymentSelector(false)
              setCheckoutStep("delivery")
              setShowCheckout(true)
            }}
          />
          <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-bold mb-4 text-center">Selecciona Metodo de Pago</h3>
            <p className="text-sm text-gray-600 mb-6 text-center">
              Elige como deseas completar tu pago de ${checkoutData.total?.toFixed(2)}
            </p>
            <div className="space-y-3">
              {/* Credit Card Option */}
              <button
                onClick={() => handleSelectPaymentProvider("card")}
                className="w-full flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                      <line x1="1" y1="10" x2="23" y2="10"/>
                    </svg>
                  </div>
                  <div className="text-left">
                    <div className="font-medium">Tarjeta de Credito/Debito</div>
                    <div className="text-xs text-gray-500">Visa, Mastercard, Amex, Discover</div>
                  </div>
                </div>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {/* ATH Móvil Option */}
              <button
                onClick={() => handleSelectPaymentProvider("athmovil")}
                className="w-full flex items-center justify-between p-4 border border-orange-200 rounded-lg hover:bg-orange-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">ATH</span>
                  </div>
                  <div className="text-left">
                    <div className="font-medium">ATH Móvil</div>
                    <div className="text-xs text-gray-500">Paga con tu app ATH Móvil</div>
                  </div>
                </div>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            <button
              onClick={() => {
                setShowPaymentSelector(false)
                setCheckoutStep("delivery")
                setShowCheckout(true)
              }}
              className="w-full mt-4 text-sm text-gray-500 hover:text-gray-700"
            >
              Volver
            </button>
          </div>
        </div>
      )}

      {/* Stripe Checkout */}
      {showStripeCheckout && checkoutData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop - click to cancel */}
          <div 
            className="absolute inset-0 bg-black/50" 
            onClick={() => {
              setShowStripeCheckout(false)
              setCheckoutStep("delivery")
              setShowCheckout(true)
            }}
          />
          {/* Stripe checkout container - no pointer-events interference */}
          <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-auto">
            <StripeCheckout
              orderData={checkoutData}
              onSuccess={handlePaymentSuccess}
              onCancel={() => {
                setShowStripeCheckout(false)
                setCheckoutStep("delivery")
                setShowCheckout(true)
              }}
            />
          </div>
        </div>
      )}
      
      {/* Square Checkout */}
      {showSquareCheckout && checkoutData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-black/50" 
            onClick={() => {
              setShowSquareCheckout(false)
              setCheckoutStep("delivery")
              setShowCheckout(true)
            }}
          />
          <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-auto">
            <SquareCheckout
              orderData={checkoutData}
              onSuccess={handlePaymentSuccess}
              onCancel={() => {
                setShowSquareCheckout(false)
                setCheckoutStep("delivery")
                setShowCheckout(true)
              }}
            />
          </div>
        </div>
      )}

      {/* ATH Móvil Checkout */}
      {showATHMovilCheckout && checkoutData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-black/50" 
            onClick={() => {
              setShowATHMovilCheckout(false)
              setCheckoutStep("delivery")
              setShowCheckout(true)
            }}
          />
          <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-auto">
            <ATHMovilCheckout
              orderData={checkoutData}
              onSuccess={handlePaymentSuccess}
              onCancel={() => {
                setShowATHMovilCheckout(false)
                setCheckoutStep("delivery")
                setShowCheckout(true)
              }}
            />
          </div>
        </div>
      )}

      {/* About Section */}
      <section className="mt-16 border-t border-gray-200 bg-gray-50">
        <div className="container mx-auto px-4 py-10 max-w-3xl">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            {"Sobre "}{restaurant.name}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-10">
            {/* Address */}
            {selectedBranch && (selectedBranch.address || selectedBranch.city) && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Direccion</h3>
                <p className="text-sm text-gray-600">
                  {selectedBranch.address && <span className="block">{selectedBranch.address}</span>}
                  {(selectedBranch.city || selectedBranch.state || selectedBranch.zip) && (
                    <span className="block">
                      {[selectedBranch.city, selectedBranch.state].filter(Boolean).join(", ")}
                      {selectedBranch.zip ? ` ${selectedBranch.zip}` : ""}
                    </span>
                  )}
                </p>
              </div>
            )}

            {/* Contact */}
            {(selectedBranch?.phone || selectedBranch?.email || restaurant.footer_phone || restaurant.footer_email) && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Contacto</h3>
                <div className="text-sm text-gray-600 space-y-0.5">
                  {(selectedBranch?.phone || restaurant.footer_phone || restaurant.phone) && (
                    <p>{selectedBranch?.phone || restaurant.footer_phone || restaurant.phone}</p>
                  )}
                  {(selectedBranch?.email || restaurant.footer_email) && (
                    <p>{selectedBranch?.email || restaurant.footer_email}</p>
                  )}
                </div>
              </div>
            )}

            {/* Hours - simplified display */}
            {restaurantHours.length > 0 && (
              <div className="sm:col-span-2">
                <h3 className="font-semibold text-gray-900 mb-3">Horario de Operacion</h3>
                <div className="space-y-1.5 max-w-sm">
                  {[...restaurantHours].sort((a, b) => a.day_of_week - b.day_of_week).map((h) => {
                    const lunchHours = formatTimeRange(h.lunch_open, h.lunch_close)
                    const dinnerHours = formatTimeRange(h.dinner_open, h.dinner_close)
                    const displayHours = [lunchHours, dinnerHours].filter(Boolean).join(" / ")
                    return (
                      <div key={h.day_of_week} className="flex items-center text-sm">
                        <span className="font-medium text-gray-700 w-28 shrink-0">{DAY_NAMES_FULL[h.day_of_week]}</span>
                        {displayHours ? (
                          <span className="text-gray-600">{displayHours}</span>
                        ) : (
                          <span className="text-red-500 font-medium">Cerrado</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Delivery Fee */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Cargo de Delivery</h3>
              <p className="text-sm text-gray-600">
                {"Desde $"}{(effectiveRestaurant.delivery_fee ?? effectiveRestaurant.delivery_base_fee ?? 25).toFixed(2)}
              </p>
            </div>

            {/* Minimum Order */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Orden Minima para Delivery</h3>
              <p className="text-sm text-gray-600">
                {"$"}{Number(effectiveRestaurant.min_delivery_order || 0).toFixed(2)}{" minimo"}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="text-white" style={{ backgroundColor: primaryColor }}>
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="font-bold text-lg mb-4 text-white">Sobre {restaurant.name}</h3>
              <p className="text-sm text-gray-200">
                {restaurant.footer_description || "Servicios de catering premium para todos tus eventos especiales. Comida de calidad, servicio excepcional."}
              </p>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-4 text-white">Contacto</h3>
              <div className="space-y-2 text-sm text-gray-200">
                {(restaurant.footer_phone || restaurant.phone) && (
                  <p>{restaurant.footer_phone || restaurant.phone}</p>
                )}
                {restaurant.footer_email && (
                  <p>{restaurant.footer_email}</p>
                )}
              </div>
            </div>
            {restaurant.footer_links && restaurant.footer_links.length > 0 && (
              <div>
                <h3 className="font-bold text-lg mb-4 text-white">Enlaces</h3>
                <div className="space-y-2 text-sm">
                  {restaurant.footer_links.map((link, idx) => (
                    <a
                      key={idx}
                      href={link.url || "#"}
                      target={link.url?.startsWith("http") ? "_blank" : undefined}
                      rel={link.url?.startsWith("http") ? "noopener noreferrer" : undefined}
                      className="block text-gray-200 hover:text-white transition-colors"
                    >
                      {link.label}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="mt-8 pt-8 border-t border-white/20 text-center text-sm text-gray-200">
            <p suppressHydrationWarning>
              &copy; {new Date().getFullYear()} {restaurant.name}. Todos los derechos reservados. |{" "}
              <a href={`/${restaurant.slug}/admin`} className="text-white hover:underline">
                Admin
              </a>
            </p>
            {(restaurant.show_powered_by !== false) && (
              <p className="mt-2 text-xs text-gray-300/70">
                Powered by{" "}
                <a
                  href="/partners"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/80 hover:text-white underline transition-colors"
                >
                  FoodNetDelivery
                </a>
              </p>
            )}
          </div>
        </div>
      </footer>

      {/* Floating "View Cart" pill — always visible while scrolling, like DoorDash/Uber Eats */}
      <div
        className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ease-in-out ${
          foodCartCount > 0 && !showCart && !showCheckout
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 translate-y-4 pointer-events-none"
        }`}
      >
        <button
          onClick={() => setShowCart(true)}
          className="flex items-center gap-3 pl-3 pr-5 py-3 rounded-full shadow-2xl text-white font-semibold text-sm whitespace-nowrap"
          style={{ backgroundColor: primaryColor }}
          aria-label={`Ver carrito — ${foodCartCount} ${foodCartCount === 1 ? "artículo" : "artículos"}`}
        >
          {/* Item count badge */}
          <span
            className="flex items-center justify-center w-7 h-7 rounded-full bg-white/25 text-white font-bold text-sm tabular-nums"
          >
            {foodCartCount}
          </span>
          <span>Ver carrito</span>
          <span className="opacity-80">
            —
          </span>
          <span>
            ${cart
              .filter((i) => i.type !== "delivery_fee")
              .reduce((sum, i) => sum + (i.totalPrice || 0), 0)
              .toFixed(2)}
          </span>
        </button>
      </div>

      {/* Internal Shop Modal */}
      <InternalShopModal
        isOpen={showInternalShopModal}
        onClose={() => setShowInternalShopModal(false)}
      />
    </div>
  )
}
