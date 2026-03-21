"use client"

import type React from "react"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Minus, Pencil, Trash2, Settings, GripVertical, MapPin, Copy, Upload, Building, Phone, Eye, EyeOff, ChevronUp, ChevronDown, ArrowRightLeft, Search, CalendarDays, List, ChevronLeft, ChevronRight, Clock, Truck, Check, Monitor, ExternalLink, User, Key } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import PhoneOrderForm from "@/components/phone-order-form"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  SELLING_UNITS,
  CONTAINER_TYPES,
  getQuantityUnitValue,
  getAdminDisplayLabel,
  getContainerShortLabel,
} from "@/lib/selling-units"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ImageUpload } from "@/components/image-upload"
import { CSVUploadModal } from "@/components/csv-upload-modal"
import { Label } from "@/components/ui/label" // Added for Label component
import { type DesignTemplate, TEMPLATE_INFO, TemplatePreview } from "@/components/design-templates"
import { OrderNotificationSettings } from "@/components/order-notification-settings"
import {
  createCategory,
  updateCategory,
  deleteCategory as deleteCategoryAction,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem as deleteMenuItemAction,
  createItemOption,
  updateItemOption,
  deleteItemOption as deleteItemOptionAction,
  getItemOptions,
  createItemOptionChoice,
  deleteItemOptionChoice,
  createServicePackage,
  updateServicePackage,
  deleteServicePackage as deleteServicePackageAction,
  createPackageAddon,
  updatePackageAddon,
  savePackageInclusions,
  savePackageAddonChoices,
  deleteContainerRate,
  deletePackageAddons,
  fetchAllCategories,
  fetchContainerRates,
  fetchServicePackages,
  getBranchServicePackages,
  upsertContainerRate,
  saveBranchServicePackages,
  updateRestaurantSettings,
  createDeliveryZone,
  updateDeliveryZone,
  deleteDeliveryZone as deleteDeliveryZoneAction,
  bulkApplyDeliveryTiers,
  updateMenuItemOrder,
  updatePackageDisplayOrder,
  copyItemOption, // Add copyItemOption import
  getAllOptionsFromOtherItems, // Added for browsing options
  updateItemOptionOrder, // Import new function
  bulkImportMenuItems,
  bulkDeleteCategories, // Add bulkDeleteCategories
  bulkDeleteMenuItems, // Add bulkDeleteMenuItems
  reorderCategories, // Import reorderCategories
  updateServicePackagesVisibility, // Import updateServicePackagesVisibility
  updateChoiceOrder, // Import updateChoiceOrder
  updateRestaurantMarketplaceSettings, // Import for marketplace settings
  getItemSizes,
  createItemSize,
  updateItemSize,
  deleteItemSize,
  getAllSizesFromOtherItems,
  copySizeToMenuItem,
  getAllAddonsFromOtherPackages,
  getBranches,
  createBranch,
  updateBranch,
  deleteBranch,
  getBranchMenuOverrides,
  upsertBranchMenuOverride,
  deleteBranchMenuOverride,
  transferOrder,
  getOperatingHours,
  saveOperatingHours,
  type OperatingHourEntry,
  getRestaurantHours,
  saveRestaurantHours,
  type RestaurantHourEntry,
  type AvailableDays,
  type AvailabilityDaypart,
} from "./actions"
import { Checkbox } from "@/components/ui/checkbox" // Import Checkbox

// Assume createClient and tenant are defined elsewhere or imported if needed for handleSavePackage
// For now, using createBrowserClient directly as it's already imported and used elsewhere.
// If `tenant` is needed, it would likely be passed as a prop or imported.
const createClient = createBrowserClient // Alias for clarity in handleSavePackage

export default function RestaurantAdminClient({
  restaurantId,
  restaurantName,
  restaurant,
  cuisineTypes = [],
  marketplaceAreas = [],
  userRole = "restaurant_admin",
}: {
  restaurantId: string
  restaurantName: string
  restaurant: any
  cuisineTypes?: { id: string; name: string }[]
  marketplaceAreas?: { id: string; name: string }[]
  userRole?: string
}) {
const { toast } = useToast()
  const isSuperAdmin = userRole === "super_admin"
  const isCSR = userRole === "csr" || userRole === "manager"
  
  // CSRs default to menu tab and can only access menu
  const [activeTab, setActiveTab] = useState(isCSR ? "menu" : "overview")
  const [stats, setStats] = useState({
    categories: 0,
    menuItems: 0,
    servicePackages: 0,
    orders: 0,
  })

  // Menu management state
  const [categories, setCategories] = useState<any[]>([])
  const [menuItems, setMenuItems] = useState<any[]>([])
  const [servicePackages, setServicePackages] = useState<any[]>([])
  const [containerRates, setContainerRates] = useState<any[]>([])
  const [editingContainerRate, setEditingContainerRate] = useState<any>(null)
  const [containerRateForm, setContainerRateForm] = useState({ container_type: "", label: "", extra_fee_per_unit: "" })
  const [orders, setOrders] = useState<any[]>([])
  const [orderTypeFilter, setOrderTypeFilter] = useState<"all" | "delivery" | "pickup">("all")
  const [ordersView, setOrdersView] = useState<"list" | "calendar">("list")
  const [calendarMonth, setCalendarMonth] = useState(new Date())
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<string | null>(null)
  const [showPhoneOrder, setShowPhoneOrder] = useState(false)
  const [transferDialog, setTransferDialog] = useState<{ open: boolean; orderId: string; targetBranchId: string; reason: string }>({ open: false, orderId: "", targetBranchId: "", reason: "" })
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string | null>(null)
  const [editingOrder, setEditingOrder] = useState<any | null>(null)
  const [editOrderItems, setEditOrderItems] = useState<any[]>([])
  const [itemTypes, setItemTypes] = useState<any[]>([])

  // Shipday test state
  const [shipdayTestStatus, setShipdayTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle")
  const [shipdayTestMessage, setShipdayTestMessage] = useState("")

  // Email templates state
  const [emailTemplates, setEmailTemplates] = useState<any[]>([])
  const [editingTemplate, setEditingTemplate] = useState<any | null>(null)
  const [templateForm, setTemplateForm] = useState({ subject: "", body: "" })
  const [savingTemplate, setSavingTemplate] = useState(false)

  // Restaurant admin users state
  const [restaurantAdmins, setRestaurantAdmins] = useState<any[]>([])
  const [editingAdmin, setEditingAdmin] = useState<any | null>(null)
  const [adminForm, setAdminForm] = useState({ username: "", email: "", password: "" })
  const [showAdminPassword, setShowAdminPassword] = useState(false)
  const [savingAdmin, setSavingAdmin] = useState(false)
  const [showCreateAdminDialog, setShowCreateAdminDialog] = useState(false)

  const handleTestShipday = async (branchId?: string) => {
    setShipdayTestStatus("testing")
    setShipdayTestMessage("Testing connection...")
    try {
      const res = await fetch("/api/shipday/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId: restaurant.id,
          branchId: branchId || null,
          mode: "test",
        }),
      })
      const data = await res.json()
      if (data.success) {
        setShipdayTestStatus("success")
        setShipdayTestMessage(`Connection successful! API key source: ${data.apiKeySource}. Carriers found: ${data.carriersFound}`)
      } else {
        setShipdayTestStatus("error")
        setShipdayTestMessage(data.error || "Connection failed")
      }
    } catch (err) {
      setShipdayTestStatus("error")
      setShipdayTestMessage(err instanceof Error ? err.message : "Unknown error")
    }
  }

  // Branch management state
  const [branches, setBranches] = useState<any[]>([])
  const [editingBranch, setEditingBranch] = useState<any | null>(null)
  const [branchDialogOpen, setBranchDialogOpen] = useState(false)
  const [branchOverridesDialogOpen, setBranchOverridesDialogOpen] = useState(false)
  const [showUpsellConfigDialog, setShowUpsellConfigDialog] = useState(false)
  const [selectedBranchForOverrides, setSelectedBranchForOverrides] = useState<any | null>(null)
  const [branchOverrides, setBranchOverrides] = useState<any[]>([])
  const [branchForm, setBranchForm] = useState({
    name: "", slug: "", address: "", city: "", state: "", zip: "", phone: "", email: "",
    image_url: "", logo_url: "", delivery_fee: "", delivery_lead_time_hours: "", pickup_lead_time_hours: "",
    lead_time_hours: "", max_advance_days: "", min_delivery_order: "", min_pickup_order: "", shipday_api_key: "",
    tax_rate: "", tip_option_1: "", tip_option_2: "", tip_option_3: "",
    primary_color: "", design_template: "", standalone_domain: "",
    packages_section_title: "", show_service_packages: "",
    latitude: "", longitude: "", delivery_radius: "",
    delivery_enabled: true, pickup_enabled: true, is_active: true,
    area: "",
    payment_provider: "stripe" as "stripe" | "square" | "stripe_athmovil" | "square_athmovil",
    stripe_account_id: "",
    square_access_token: "",
    square_location_id: "",
    square_environment: "production" as "sandbox" | "production",
    athmovil_public_token: "",
    athmovil_ecommerce_id: "",
    // Order notification settings
    order_notification_method: "email" as "email" | "kds" | "chowly" | "square_kds" | "multiple",
    chowly_api_key: "",
    chowly_location_id: "",
    chowly_enabled: false,
    square_kds_enabled: false,
    kds_access_token: "",
  })

  // Operating hours state
  const DAY_NAMES = ["Domingo", "Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"]
  const DEFAULT_HOURS: OperatingHourEntry[] = Array.from({ length: 7 }, (_, i) => ({
    day_of_week: i,
    is_open: true,
    open_time: "08:00",
    close_time: "20:00",
  }))
  const [operatingHours, setOperatingHours] = useState<OperatingHourEntry[]>(DEFAULT_HOURS)
  const [operatingHoursLoaded, setOperatingHoursLoaded] = useState(false)
  const [savingHours, setSavingHours] = useState(false)

  // Restaurant meal period hours (Breakfast/Lunch/Dinner)
  const DEFAULT_RESTAURANT_HOURS: RestaurantHourEntry[] = Array.from({ length: 7 }, (_, i) => ({
    day_of_week: i,
    breakfast_open: null,
    breakfast_close: null,
    lunch_open: "11:30",
    lunch_close: "15:00",
    dinner_open: "15:00",
    dinner_close: "20:30",
  }))
  const [restaurantHours, setRestaurantHours] = useState<RestaurantHourEntry[]>(DEFAULT_RESTAURANT_HOURS)
  const [restaurantHoursLoaded, setRestaurantHoursLoaded] = useState(false)
  const [savingRestaurantHours, setSavingRestaurantHours] = useState(false)

  // Category and Item Type form states
  // Removed redundant categoryForm and setCategoryForm declarations here.

  // Option form state for menu item customization
  const [optionForm, setOptionForm] = useState({
    option_name: "",
    option_type: "single", // 'single' or 'multiple'
    display_type: "pills", // 'pills', 'dropdown', 'grid', 'list'
    is_required: false,
    min_selection: "0",
    max_selection: "1",
    choices: [{ id: crypto.randomUUID(), choice_name: "", price_modifier: "0", parent_choice_id: "none", description: "" }],
  })
  // const [setOptionForm] = useState<any>(null); // Dummy declaration to satisfy linter - REMOVED due to redeclaration

  const [isDraggingCategory, setIsDraggingCategory] = useState(false)
  const [draggedCategoryIndex, setDraggedCategoryIndex] = useState<number | null>(null) // Adding drag and drop state for categories
  const [draggedMenuItemIndex, setDraggedMenuItemIndex] = useState<number | null>(null)
  const [draggedPackageIndex, setDraggedPackageIndex] = useState<number | null>(null)
  const [draggedAddonIndex, setDraggedAddonIndex] = useState<number | null>(null)
  const [draggedOptionId, setDraggedOptionId] = useState<string | null>(null)
  const [draggedChoiceId, setDraggedChoiceId] = useState<string | null>(null)
  const [draggedChoiceOptionId, setDraggedChoiceOptionId] = useState<string | null>(null)

  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([])
  const [selectedMenuItemIds, setSelectedMenuItemIds] = useState<string[]>([])

  // Copy menu state
  const [allRestaurantsForCopy, setAllRestaurantsForCopy] = useState<{ id: string; name: string }[]>([])
  const [copyMenuSourceId, setCopyMenuSourceId] = useState("")
  const [copyMenuTargetIds, setCopyMenuTargetIds] = useState<string[]>([])
  const [copyMenuDirection, setCopyMenuDirection] = useState<"pull" | "push">("pull")
  const [copyMenuClearExisting, setCopyMenuClearExisting] = useState(true)
  const [isCopyingMenu, setIsCopyingMenu] = useState(false)
  const [copyMenuResult, setCopyMenuResult] = useState<{ success: boolean; message: string; results?: any } | null>(null)

  // Existing state declarations continue...
  const [loading, setLoading] = useState(true)

  const [showMenuItemModal, setShowMenuItemModal] = useState(false)
  const [showPackageModal, setShowPackageModal] = useState(false)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<any | null>(null)
  // Removed redundant categoryForm state declaration as it's now declared below.
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    description: "",
    header_image_url: "",
    available_days: { sun: true, mon: true, tue: true, wed: true, thu: true, fri: true, sat: true } as Record<string, boolean>,
  })
  const [showItemTypeModal, setShowItemTypeModal] = useState(false)
  const [showOptionsModal, setShowOptionsModal] = useState(false)
  const [currentItemForOptions, setCurrentItemForOptions] = useState<any>(null)
  const [itemOptions, setItemOptions] = useState<any[]>([])
  const [editingOption, setEditingOption] = useState<any>(null)
  const [showOptionForm, setShowOptionForm] = useState(false) // Added to control visibility of the option form

  const [showCopyOptionModal, setShowCopyOptionModal] = useState(false)
  const [optionToCopy, setOptionToCopy] = useState<any>(null)
  const [selectedTargetItems, setSelectedTargetItems] = useState<string[]>([])

  // Size manager state
  const [showSizesModal, setShowSizesModal] = useState(false)
  const [currentItemForSizes, setCurrentItemForSizes] = useState<any>(null)
  const [itemSizes, setItemSizes] = useState<any[]>([])
  const [sizeForm, setSizeForm] = useState({ name: "", price: "", serves: "", is_default: false })
  const [editingSizeId, setEditingSizeId] = useState<string | null>(null)

  const [showBrowseSizes, setShowBrowseSizes] = useState(false)
  const [availableSizes, setAvailableSizes] = useState<Array<{ size: any; menuItemName: string; menuItemId: string }>>([])
  const [loadingAvailableSizes, setLoadingAvailableSizes] = useState(false)

  const [showBrowseAddons, setShowBrowseAddons] = useState(false)
  const [availableAddons, setAvailableAddons] = useState<Array<{ addon: any; packageName: string; packageId: string }>>([])
  const [loadingAvailableAddons, setLoadingAvailableAddons] = useState(false)

  const [editingItem, setEditingItem] = useState<any>(null)
  const [editingPackage, setEditingPackage] = useState<any>(null)
  // Removed redundant editingCategory state declaration as it's already declared above.

  const [showBrowseOptions, setShowBrowseOptions] = useState(false)
  const [availableOptions, setAvailableOptions] = useState<
    Array<{
      option: any
      menuItemName: string
      menuItemId: string
    }>
  >([])
  const [loadingAvailableOptions, setLoadingAvailableOptions] = useState(false)
  const [manageOptionsItem, setManageOptionsItem] = useState<any>(null) // Track the item for which options are managed

  // Form states
  const [menuItemForm, setMenuItemForm] = useState({
    name: "",
    description: "",
    price: "",
    image_url: "",
    category_id: "",
    item_type_id: "",
    serves: "",
    dietary_tags: [] as string[],
    pricing_unit: "each" as string,
    per_unit_price: "" as string,
    min_quantity: "" as string,
    is_bulk_order: false,
    minimum_quantity: undefined as string | undefined,
    per_unit_pricing: false,
    quantity_unit: undefined as string | undefined,
    is_cart_upsell: false,
    lead_time_hours: undefined as string | undefined,
    container_type: "none" as string,
    containers_per_unit: "1" as string,
  })

  const [packageForm, setPackageForm] = useState({
    name: "",
    description: "",
    base_price: 0, // Changed from "" to 0, assuming it's a number
    image_url: "",
    inclusions: [] as { id: string; description: string }[],
    addons: [] as {
      id: string
      name: string
      price_per_unit: number
      unit: string
      image_url?: string
      parent_addon_id?: string | null
      choices?: { id: string; name: string; price_modifier: number; image_url?: string }[]
    }[],
  })

  const [settingsForm, setSettingsForm] = useState({
    name: "",
    email: "",
    logo_url: "",
    banner_logo_url: "",
    hero_image_url: "",
    primary_color: "#6B1F1F",
    standalone_domain: "",
    restaurant_address: "",
    latitude: "",
    longitude: "",
    tax_rate: "",
    delivery_fee: "",
    tip_option_1: "",
    tip_option_2: "",
    tip_option_3: "",
    lead_time_hours: "",
    delivery_lead_time_hours: "",
    pickup_lead_time_hours: "",
    max_advance_days: "",
    min_delivery_order: "",
    min_pickup_order: "",
    shipday_api_key: "",
    delivery_base_fee: "28",
    delivery_included_containers: "4",
    delivery_radius: "",
    delivery_zip_codes: [] as string[],
    is_chain: false,
    hide_branch_selector_title: false,
    footer_description: "",
    footer_email: "",
    footer_phone: "",
    footer_links: [] as { label: string; url: string }[],
    packages_section_title: "Service Packages",
    design_template: "modern", // Default template
    show_service_packages: true, // Added state for show_service_packages
    // Order type settings
    delivery_enabled: true,
    pickup_enabled: true,
    // Payment provider settings
    payment_provider: "stripe" as "stripe" | "square" | "stripe_athmovil" | "square_athmovil",
    stripe_account_id: "",
    square_access_token: "",
    square_location_id: "",
    square_environment: "production" as "sandbox" | "production",
    athmovil_public_token: "",
    athmovil_ecommerce_id: "",
    cash_payment_enabled: false,
    // Order notification settings
    order_notification_method: "email" as "email" | "kds" | "chowly" | "square_kds" | "multiple",
    chowly_api_key: "",
    chowly_location_id: "",
    chowly_enabled: false,
    square_kds_enabled: false,
    kds_access_token: "",
  })

  const [marketplaceSettings, setMarketplaceSettings] = useState({
  show_in_marketplace: restaurant.show_in_marketplace || false,
  marketplace_tagline: restaurant.marketplace_tagline || "",
  main_cuisine_type: (restaurant as any).main_cuisine_type || "",
  cuisine_types: (restaurant.cuisine_types as string[] | null) || (restaurant.cuisine_type ? [restaurant.cuisine_type] : []),
  is_featured: restaurant.is_featured || false,
  area: restaurant.area || "",
  })

  const MARKETPLACE_AREAS = marketplaceAreas.map((a) => a.name)

  const [deliveryZones, setDeliveryZones] = useState<any[]>([])
  const [showZoneModal, setShowZoneModal] = useState(false)
  const [editingZone, setEditingZone] = useState<any | null>(null)
  const [zoneForm, setZoneForm] = useState({
    zone_name: "",
    min_distance: "0",
    max_distance: "",
    base_fee: "",
    per_item_surcharge: "0",
    min_items_for_surcharge: "50",
    is_active: true,
  })

  // Tier grid — 10 tiers of 1 mile each (0–1, 1–2, … 9–10)
  const DEFAULT_TIERS = Array.from({ length: 10 }, (_, i) => ({
    minDistance: i,
    maxDistance: i + 1,
    baseFee: "",
  }))
  const [tierGrid, setTierGrid] = useState<{ minDistance: number; maxDistance: number; baseFee: string }[]>(DEFAULT_TIERS)
  const [isBulkApplying, setIsBulkApplying] = useState(false)
  const [showTierGrid, setShowTierGrid] = useState(false)

  // Added state for bulk import
  const [showBulkImportModal, setShowBulkImportModal] = useState(false) // Corrected state name
  const [importFile, setImportFile] = useState<File | null>(null)
  const [showCSVModal, setShowCSVModal] = useState(false) // Added for CSV upload

  const router = useRouter()
  const supabase = createBrowserClient()

  const handleLogout = () => {
    // Implement logout logic here
    router.push("/")
  }

  const handleServicePackagesToggle = async (checked: boolean) => {
    try {
      const result = await updateServicePackagesVisibility(restaurantId, checked)
      if (result.success) {
        // Update the local state
        await loadCategories()
      } else {
        console.error("Failed to update service packages visibility:", result.error)
        toast({
          title: "Error",
          description: "Failed to update service packages visibility",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error toggling service packages:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    }
  }

  // Renamed to fetchData to encompass all initial data loading
  const fetchData = async () => {
    setLoading(true)
    const supabase = createBrowserClient()

    try {
      await Promise.all([
        loadCategories(),
        loadMenuItems(),
        loadServicePackages(),
        loadOrders(),
        loadItemTypes(),
        loadStats(),
      ])

      const { data: restaurantData } = await supabase
        .from("restaurants")
        .select(
          "tax_rate, delivery_fee, tip_option_1, tip_option_2, tip_option_3, lead_time_hours, delivery_lead_time_hours, pickup_lead_time_hours, max_advance_days, min_delivery_order, min_pickup_order, restaurant_address, latitude, longitude, primary_color, standalone_domain, design_template, packages_section_title, name, logo_url, banner_logo_url, hero_image_url, delivery_enabled, pickup_enabled, show_service_packages, shipday_api_key, is_chain, hide_branch_selector_title, delivery_base_fee, delivery_included_containers, footer_description, footer_email, footer_phone, footer_links, payment_provider, stripe_account_id, square_access_token, square_location_id, square_environment, athmovil_public_token, athmovil_ecommerce_id, cash_payment_enabled, kds_access_token",
        )
        .eq("id", restaurantId)
        .single()

      // Load container rates
      fetchContainerRates(restaurantId).then(setContainerRates).catch(console.error)

      if (restaurantData) {
        setSettingsForm({
          name: restaurantData.name || "",
          email: restaurantData.email || "",
          logo_url: restaurantData.logo_url || "",
          banner_logo_url: restaurantData.banner_logo_url || "",
          hero_image_url: restaurantData.hero_image_url || "",
          primary_color: restaurantData.primary_color || "#6B1F1F",
          standalone_domain: restaurantData.standalone_domain || "",
          restaurant_address: restaurantData.restaurant_address || "",
          latitude: restaurantData.latitude?.toString() || "",
          longitude: restaurantData.longitude?.toString() || "",
          tax_rate: restaurantData.tax_rate?.toString() || "0",
          delivery_fee: restaurantData.delivery_fee?.toString() || "25",
          tip_option_1: (() => { const v = restaurantData.tip_option_1; return v ? (v > 0 && v < 1 ? Math.round(v * 100) : v).toString() : "12" })(),
          tip_option_2: (() => { const v = restaurantData.tip_option_2; return v ? (v > 0 && v < 1 ? Math.round(v * 100) : v).toString() : "15" })(),
          tip_option_3: (() => { const v = restaurantData.tip_option_3; return v ? (v > 0 && v < 1 ? Math.round(v * 100) : v).toString() : "18" })(),
          lead_time_hours: restaurantData.lead_time_hours?.toString() || "24",
          delivery_lead_time_hours: restaurantData.delivery_lead_time_hours?.toString() || "",
          pickup_lead_time_hours: restaurantData.pickup_lead_time_hours?.toString() || "",
          max_advance_days: restaurantData.max_advance_days?.toString() || "",
          min_delivery_order: restaurantData.min_delivery_order?.toString() || "0",
          min_pickup_order: restaurantData.min_pickup_order?.toString() || "0",
          delivery_enabled: restaurantData.delivery_enabled ?? true,
          pickup_enabled: restaurantData.pickup_enabled ?? true,
          shipday_api_key: restaurantData.shipday_api_key || "",
  delivery_base_fee: restaurantData.delivery_base_fee?.toString() || "28",
  delivery_included_containers: restaurantData.delivery_included_containers?.toString() || "4",
  delivery_radius: restaurantData.delivery_radius?.toString() || "",
  delivery_zip_codes: restaurantData.delivery_zip_codes || [],
  is_chain: restaurantData.is_chain || false,
          hide_branch_selector_title: restaurantData.hide_branch_selector_title || false,
          design_template: restaurantData.design_template || "modern",
          packages_section_title: restaurantData.packages_section_title || "Service Packages",
          footer_description: restaurantData.footer_description || "",
          footer_email: restaurantData.footer_email || "",
          footer_phone: restaurantData.footer_phone || "",
          footer_links: restaurantData.footer_links || [],
          show_service_packages: restaurantData.show_service_packages ?? true, // Set show_service_packages
          // Payment provider settings
          payment_provider: restaurantData.payment_provider || "stripe",
          stripe_account_id: restaurantData.stripe_account_id || "",
          square_access_token: restaurantData.square_access_token || "",
          square_location_id: restaurantData.square_location_id || "",
          square_environment: restaurantData.square_environment || "production",
          athmovil_public_token: restaurantData.athmovil_public_token || "",
          athmovil_ecommerce_id: restaurantData.athmovil_ecommerce_id || "",
          cash_payment_enabled: restaurantData.cash_payment_enabled || false,
          kds_access_token: restaurantData.kds_access_token || "",
        })
      }
      setLoading(false)
    } catch (error) {
      console.error("Error loading data:", error)
      toast({
        title: "Error loading data",
        description: "Failed to load admin panel data. Please try refreshing the page.",
        variant: "destructive",
      })
      setLoading(false)
    }
  }

  const loadBranches = async () => {
    try {
      const data = await getBranches(restaurantId)
      setBranches(data)
    } catch (e) {
      console.error("Failed to load branches:", e)
    }
  }

  const loadOperatingHours = async () => {
    try {
      const data = await getOperatingHours(restaurantId)
      if (data.length > 0) {
        // Merge fetched data with defaults for any missing days
        const merged = DEFAULT_HOURS.map((def) => {
          const found = data.find((d: any) => d.day_of_week === def.day_of_week)
          return found ? { day_of_week: found.day_of_week, is_open: found.is_open, open_time: found.open_time || "08:00", close_time: found.close_time || "20:00" } : def
        })
        setOperatingHours(merged)
      }
      setOperatingHoursLoaded(true)
    } catch (e) {
      console.error("Failed to load operating hours:", e)
      setOperatingHoursLoaded(true)
    }
  }

  const loadRestaurantHours = async () => {
    try {
      console.log("[v0] loadRestaurantHours called for restaurantId:", restaurantId)
      const data = await getRestaurantHours(restaurantId)
      console.log("[v0] getRestaurantHours returned:", data)
      if (data.length > 0) {
        const merged = DEFAULT_RESTAURANT_HOURS.map((def) => {
          const found = data.find((d: any) => d.day_of_week === def.day_of_week)
          return found ? {
            day_of_week: found.day_of_week,
            breakfast_open: found.breakfast_open,
            breakfast_close: found.breakfast_close,
            lunch_open: found.lunch_open,
            lunch_close: found.lunch_close,
            dinner_open: found.dinner_open,
            dinner_close: found.dinner_close,
          } : def
        })
        console.log("[v0] merged restaurantHours:", merged)
        setRestaurantHours(merged)
      } else {
        console.log("[v0] No restaurant hours data found, using defaults")
      }
      setRestaurantHoursLoaded(true)
    } catch (e) {
      console.error("[v0] Failed to load restaurant hours:", e)
      setRestaurantHoursLoaded(true)
    }
  }

  useEffect(() => {
  fetchData() // Use the renamed function
  fetchDeliveryZones()
  loadBranches()
  loadOperatingHours()
  loadRestaurantHours()
  loadEmailTemplates()
  loadRestaurantAdmins()
  // Load all restaurants for copy menu feature
  supabase.from("restaurants").select("id, name").order("name").then(({ data }) => {
    setAllRestaurantsForCopy(data || [])
  })
  }, [restaurantId])

  // Load functions
  const loadCategories = async () => {
    // Use admin server action to bypass RLS (which filters is_active=false)
    const data = await fetchAllCategories(restaurantId).catch(() => [])

    const { data: settingsData } = await supabase
      .from("restaurants")
      .select("show_service_packages")
      .eq("id", restaurantId)
      .single()

    const categoriesWithPackages = [
      ...(data || []),
      {
        id: "SERVICE_PACKAGES",
        name: settingsForm.packages_section_title, // Use the state value here
        description: "Catering service packages section",
        display_order: -1,
        is_virtual: true,
        is_active: settingsData?.show_service_packages ?? true, // Use dynamic value from settings
      },
    ]
    // Sort by display_order, treating -1 as first position
    categoriesWithPackages.sort((a, b) => {
      if (a.display_order === -1) return -1
      if (b.display_order === -1) return 1
      return a.display_order - b.display_order
    })

    setCategories(categoriesWithPackages)
  }

  const loadMenuItems = async () => {
    const { data } = await supabase
      .from("menu_items")
      .select("*, item_options(id)")
      .eq("restaurant_id", restaurantId)
      .order("display_order")
    // Add option_count to each item for display
    const itemsWithOptionCount = (data || []).map(item => ({
      ...item,
      option_count: item.item_options?.length || 0,
      item_options: undefined // Remove the nested data, we only needed the count
    }))
    setMenuItems(itemsWithOptionCount)
  }

  const loadServicePackages = async () => {
    try {
      const data = await fetchServicePackages(restaurantId)

    // Augment data with temporary IDs for editing
    const augmentedData = (data || []).map((pkg: any) => ({
      ...pkg,
      package_inclusions: pkg.package_inclusions?.map((inc: any) => ({ ...inc, id: crypto.randomUUID() })) || [],
      package_addons:
        pkg.package_addons?.map((addon: any) => ({
          ...addon,
          db_id: addon.id, // Preserve real DB ID for updates
          id: crypto.randomUUID(),
          choices:
            addon.package_addon_choices?.map((choice: any) => ({
              id: crypto.randomUUID(), // Temporary ID for choices
              name: choice.name,
              price_modifier: choice.price_modifier,
              image_url: choice.image_url, // Added image_url
            })) || [],
        })) || [],
    }))

    setServicePackages(augmentedData)
    } catch (error) {
      console.error("Error loading service packages:", error)
    }
  }

  const loadEmailTemplates = async () => {
    const { data } = await supabase
      .from("email_templates")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("template_type")
    setEmailTemplates(data || [])
  }

  const loadRestaurantAdmins = async () => {
    const { data } = await supabase
      .from("admin_users")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false })
    setRestaurantAdmins(data || [])
  }

  const generatePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%"
    let password = ""
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return password
  }

  const handleCreateAdmin = async () => {
    if (!adminForm.username || !adminForm.email || !adminForm.password) {
      toast({ title: "Error", description: "Todos los campos son requeridos", variant: "destructive" })
      return
    }
    setSavingAdmin(true)
    try {
      const res = await fetch("/api/admin-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: adminForm.username,
          email: adminForm.email,
          password: adminForm.password,
          role: "restaurant_admin",
          restaurant_id: restaurantId,
        }),
      })
      if (res.ok) {
        toast({ title: "Exito", description: "Usuario administrador creado" })
        setShowCreateAdminDialog(false)
        setAdminForm({ username: "", email: "", password: "" })
        loadRestaurantAdmins()
      } else {
        const err = await res.json()
        toast({ title: "Error", description: err.error || "Error al crear usuario", variant: "destructive" })
      }
    } catch (err) {
      toast({ title: "Error", description: "Error al crear usuario", variant: "destructive" })
    } finally {
      setSavingAdmin(false)
    }
  }

  const handleResetAdminPassword = async (userId: string, newPassword: string) => {
    try {
      const res = await fetch(`/api/admin-users/${userId}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      })
      if (res.ok) {
        toast({ title: "Exito", description: "Contrasena actualizada" })
        setEditingAdmin(null)
      } else {
        const err = await res.json()
        toast({ title: "Error", description: err.error || "Error al actualizar", variant: "destructive" })
      }
    } catch (err) {
      toast({ title: "Error", description: "Error al actualizar", variant: "destructive" })
    }
  }

  const handleSaveTemplate = async () => {
    if (!editingTemplate) return
    setSavingTemplate(true)
    try {
      const { error } = await supabase
        .from("email_templates")
        .update({
          subject: templateForm.subject,
          body: templateForm.body,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingTemplate.id)
      
      if (error) throw error
      await loadEmailTemplates()
      setEditingTemplate(null)
    } catch (err) {
      console.error("Error saving template:", err)
      alert("Error al guardar la plantilla")
    } finally {
      setSavingTemplate(false)
    }
  }

  const loadOrders = async () => {
    let query = supabase
      .from("orders")
      .select("*")
      .eq("restaurant_id", restaurantId)
    
    // Filter by branch if a branch is selected (and not super admin viewing all)
    if (selectedBranchFilter) {
      query = query.eq("branch_id", selectedBranchFilter)
    }
    
    const { data } = await query.order("created_at", { ascending: false })
    setOrders(data || [])
  }

  // Set default branch filter when branches load (first branch for restaurant admins)
  useEffect(() => {
    if (branches.length > 0 && selectedBranchFilter === null && !isSuperAdmin) {
      setSelectedBranchFilter(branches[0].id)
    }
  }, [branches, selectedBranchFilter, isSuperAdmin])
  
  // Reload orders when branch filter changes
  useEffect(() => {
    if (selectedBranchFilter !== null || isSuperAdmin) {
      loadOrders()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBranchFilter])

  const loadItemTypes = async () => {
    const { data } = await supabase
      .from("item_types")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("display_order")
    setItemTypes(data || [])
  }

  const loadItemOptions = async (menuItemId: string) => {
    const optionsData = await getItemOptions(menuItemId)
    const normalizedOptions = (optionsData || []).map((option: any) => ({
      ...option,
      choices: option.item_option_choices || [],
    }))
    setItemOptions(normalizedOptions)
  }

  const handleOptionDragStart = (e: React.DragEvent, optionId: string) => {
    setDraggedOptionId(optionId)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleOptionDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }

  const handleOptionDrop = async (e: React.DragEvent, targetOptionId: string) => {
    e.preventDefault()
    if (!draggedOptionId || draggedOptionId === targetOptionId) {
      setDraggedOptionId(null)
      return
    }

    const draggedIndex = itemOptions.findIndex((o) => o.id === draggedOptionId)
    const targetIndex = itemOptions.findIndex((o) => o.id === targetOptionId)

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedOptionId(null)
      return
    }

    // Reorder locally
    const newOptions = [...itemOptions]
    const [removed] = newOptions.splice(draggedIndex, 1)
    newOptions.splice(targetIndex, 0, removed)
    setItemOptions(newOptions)

    // Save order to database
    try {
      await updateItemOptionOrder(newOptions.map((o) => o.id))
    } catch (error) {
      console.error("Failed to update option order:", error)
    }

    setDraggedOptionId(null)
  }

  const handleOptionDragEnd = () => {
    setDraggedOptionId(null)
  }

  const handleChoiceDragStart = (e: React.DragEvent, choiceId: string, optionId: string) => {
    setDraggedChoiceId(choiceId)
    setDraggedChoiceOptionId(optionId)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleChoiceDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }

  const handleChoiceDrop = async (e: React.DragEvent, targetChoiceId: string, targetOptionId: string) => {
    e.preventDefault()

    if (!draggedChoiceId || !draggedChoiceOptionId || draggedChoiceId === targetChoiceId) {
      setDraggedChoiceId(null)
      setDraggedChoiceOptionId(null)
      return
    }

    // Only allow reordering within the same option
    if (draggedChoiceOptionId !== targetOptionId) {
      setDraggedChoiceId(null)
      setDraggedChoiceOptionId(null)
      return
    }

    const option = itemOptions.find((o) => o.id === targetOptionId)
    if (!option) return

    const draggedIndex = option.choices.findIndex((c: any) => c.id === draggedChoiceId)
    const targetIndex = option.choices.findIndex((c: any) => c.id === targetChoiceId)

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedChoiceId(null)
      setDraggedChoiceOptionId(null)
      return
    }

    // Reorder locally
    const newChoices = [...option.choices]
    const [removed] = newChoices.splice(draggedIndex, 1)
    newChoices.splice(targetIndex, 0, removed)

    // Update the option with new choices order
    const newOptions = itemOptions.map((opt) => (opt.id === targetOptionId ? { ...opt, choices: newChoices } : opt))
    setItemOptions(newOptions)

    // Save order to database
    try {
      await updateChoiceOrder(newChoices.map((c: any) => c.id))
    } catch (error) {
      console.error("Failed to update choice order:", error)
    }

    setDraggedChoiceId(null)
    setDraggedChoiceOptionId(null)
  }

  const handleChoiceDragEnd = () => {
    setDraggedChoiceId(null)
    setDraggedChoiceOptionId(null)
  }

  const handleCategoryDragStart = (e: React.DragEvent, categoryId: string) => {
    console.log("[v0] Drag start - categoryId:", categoryId)
    e.dataTransfer.effectAllowed = "move"
    setDraggedCategoryIndex(categories.findIndex((cat) => cat.id === categoryId))
  }

  const handleCategoryDragOver = (e: React.DragEvent, targetCategoryId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"

    if (draggedCategoryIndex === null) return

    const targetIndex = categories.findIndex((cat) => cat.id === targetCategoryId)

    console.log("[v0] Drag over - from index:", draggedCategoryIndex, "to index:", targetIndex)

    if (draggedCategoryIndex !== targetIndex) {
      const newCategories = [...categories]
      const [draggedItem] = newCategories.splice(draggedCategoryIndex, 1)
      newCategories.splice(targetIndex, 0, draggedItem)
      setCategories(newCategories)
      setDraggedCategoryIndex(targetIndex)
    }
  }

  const handleCategoryDragEnd = async () => {
    console.log("[v0] Drag end - saving new order")

    if (draggedCategoryIndex === null) return

    // Filter out SERVICE_PACKAGES and create ordered list
    const orderedCategories = categories
      .filter((cat) => cat.id !== "SERVICE_PACKAGES")
      .map((cat, index) => ({
        id: cat.id,
        display_order: index + 1,
      }))

    console.log("[v0] New order to save:", orderedCategories)

    const result = await reorderCategories(orderedCategories)

    if (result.success) {
      console.log("[v0] Reorder successful, reloading categories")
      await loadCategories()
    } else {
      console.error("[v0] Reorder failed:", result.error)
    }

    setDraggedCategoryIndex(null)
  }

  const loadAvailableOptions = async () => {
    if (!manageOptionsItem?.id) return
    setLoadingAvailableOptions(true)
    try {
      const options = await getAllOptionsFromOtherItems(restaurantId, manageOptionsItem.id) // Pass restaurantId and current item's id
      setAvailableOptions(options)
    } catch (error) {
      console.error("Failed to load available options:", error)
    } finally {
      setLoadingAvailableOptions(false)
    }
  }

  // Helper function to fetch choices for an option
  const getItemOptionChoices = async (optionId: string) => {
    const { data, error } = await supabase.from("item_option_choices").select("*").eq("item_option_id", optionId)

    if (error) {
      console.error("Error fetching item option choices:", error)
      return []
    }
    return data || []
  }

  const loadStats = async () => {
    const { count: categoriesCount } = await supabase.from("categories").select("id", { count: "exact", head: true }).eq("restaurant_id", restaurantId)
    const { count: menuItemsCount } = await supabase.from("menu_items").select("id", { count: "exact", head: true }).eq("restaurant_id", restaurantId)
    const { count: servicePackagesCount } = await supabase
      .from("service_packages")
      .select("id", { count: "exact", head: true })
      .eq("restaurant_id", restaurantId)
    const { count: ordersCount } = await supabase.from("orders").select("id", { count: "exact", head: true }).eq("restaurant_id", restaurantId)

    setStats({
      categories: categoriesCount || 0,
      menuItems: menuItemsCount || 0,
      servicePackages: servicePackagesCount || 0,
      orders: ordersCount || 0,
    })
  }

  const fetchDeliveryZones = async () => {
    const { data, error } = await supabase
      .from("delivery_zones")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("display_order", { ascending: true })

    if (!error && data) {
      setDeliveryZones(data)
    }
  }

  const handleManageOptions = async (item: any) => {
    setCurrentItemForOptions(item)
    setManageOptionsItem(item) // Set the item for which we are managing options
    await loadItemOptions(item.id) // Use the updated loadItemOptions
    setShowOptionsModal(true)
  }

  // ---- Browse Sizes from Other Items ----
  const loadAvailableSizes = async () => {
    if (!currentItemForSizes?.id) return
    setLoadingAvailableSizes(true)
    try {
      const sizes = await getAllSizesFromOtherItems(restaurantId, currentItemForSizes.id)
      setAvailableSizes(sizes)
    } catch (error) {
      console.error("Failed to load available sizes:", error)
    } finally {
      setLoadingAvailableSizes(false)
    }
  }

  const handleAddExistingSize = async (sourceSize: any) => {
    if (!currentItemForSizes?.id) return
    try {
      await copySizeToMenuItem(
        { name: sourceSize.name, price: sourceSize.price, serves: sourceSize.serves, is_default: false },
        currentItemForSizes.id,
      )
      toast({ title: `Size "${sourceSize.name}" copied successfully` })
      const sizes = await getItemSizes(currentItemForSizes.id)
      setItemSizes(sizes)
      // Refresh available sizes to update "Already Added" badges
      await loadAvailableSizes()
    } catch (error) {
      toast({ title: "Failed to copy size", variant: "destructive" })
    }
  }

  const handleCopyAllSizesFromItem = async (menuItemId: string) => {
    if (!currentItemForSizes?.id) return
    const sizesFromItem = availableSizes.filter((s) => s.menuItemId === menuItemId)
    const existingNames = new Set(itemSizes.map((s) => s.name.toLowerCase()))
    const toCopy = sizesFromItem.filter((s) => !existingNames.has(s.size.name.toLowerCase()))

    if (toCopy.length === 0) {
      toast({ title: "All sizes from this item are already added" })
      return
    }

    try {
      for (const { size } of toCopy) {
        await copySizeToMenuItem(
          { name: size.name, price: size.price, serves: size.serves, is_default: false },
          currentItemForSizes.id,
        )
      }
      toast({ title: `${toCopy.length} size(s) copied successfully` })
      const sizes = await getItemSizes(currentItemForSizes.id)
      setItemSizes(sizes)
      await loadAvailableSizes()
    } catch (error) {
      toast({ title: "Failed to copy sizes", variant: "destructive" })
    }
  }

  // ---- Browse Add-ons from Other Packages ----
  const loadAvailableAddons = async () => {
    if (!editingPackage?.id) return
    setLoadingAvailableAddons(true)
    try {
      const addons = await getAllAddonsFromOtherPackages(restaurantId, editingPackage.id)
      setAvailableAddons(addons)
    } catch (error) {
      console.error("Failed to load available addons:", error)
    } finally {
      setLoadingAvailableAddons(false)
    }
  }

  const handleAddExistingAddon = (sourceAddon: any) => {
    const existingNames = new Set(packageForm.addons.map((a: any) => a.name.toLowerCase()))
    if (existingNames.has(sourceAddon.name.toLowerCase())) {
      toast({ title: `"${sourceAddon.name}" is already added` })
      return
    }
    setPackageForm({
      ...packageForm,
      addons: [
        ...packageForm.addons,
        {
          id: crypto.randomUUID(),
          name: sourceAddon.name,
          price_per_unit: sourceAddon.price_per_unit || 0,
          unit: sourceAddon.unit || "person",
          choices: [],
        },
      ],
    })
    toast({ title: `Add-on "${sourceAddon.name}" added` })
  }

  const handleCopyAllAddonsFromPackage = (packageId: string) => {
    const addonsFromPkg = availableAddons.filter((a) => a.packageId === packageId)
    const existingNames = new Set(packageForm.addons.map((a: any) => a.name.toLowerCase()))
    const toCopy = addonsFromPkg.filter((a) => !existingNames.has(a.addon.name.toLowerCase()))

    if (toCopy.length === 0) {
      toast({ title: "All add-ons from this package are already added" })
      return
    }

    const newAddons = toCopy.map(({ addon }) => ({
      id: crypto.randomUUID(),
      name: addon.name,
      price_per_unit: addon.price_per_unit || 0,
      unit: addon.unit || "person",
      choices: [],
    }))

    setPackageForm({
      ...packageForm,
      addons: [...packageForm.addons, ...newAddons],
    })
    toast({ title: `${toCopy.length} add-on(s) copied successfully` })
  }

  // ---- Size Manager Handlers ----
  const handleManageSizes = async (item: any) => {
    setCurrentItemForSizes(item)
    try {
      const sizes = await getItemSizes(item.id)
      setItemSizes(sizes)
    } catch {
      setItemSizes([])
    }
    setSizeForm({ name: "", price: "", serves: "", is_default: false })
    setEditingSizeId(null)
    setShowSizesModal(true)
  }

  const handleSaveSize = async () => {
    if (!currentItemForSizes) return
    if (!sizeForm.name.trim() || !sizeForm.price) {
      alert("Name and price are required")
      return
    }
    try {
      if (editingSizeId) {
  await updateItemSize(editingSizeId, {
  name: sizeForm.name.trim(),
  price: Number.parseFloat(sizeForm.price),
  serves: sizeForm.serves ? sizeForm.serves.trim() : null,
          is_default: sizeForm.is_default,
          menu_item_id: currentItemForSizes.id,
        })
      } else {
  await createItemSize({
  menu_item_id: currentItemForSizes.id,
  name: sizeForm.name.trim(),
  price: Number.parseFloat(sizeForm.price),
  serves: sizeForm.serves ? sizeForm.serves.trim() : null,
          display_order: itemSizes.length,
          is_default: sizeForm.is_default,
        })
      }
      const sizes = await getItemSizes(currentItemForSizes.id)
      setItemSizes(sizes)
      setSizeForm({ name: "", price: "", serves: "", is_default: false })
      setEditingSizeId(null)
    } catch (error: any) {
      alert("Error saving size: " + error.message)
    }
  }

  const handleEditSize = (size: any) => {
    setEditingSizeId(size.id)
    setSizeForm({
      name: size.name,
      price: size.price.toString(),
      serves: size.serves?.toString() || "",
      is_default: size.is_default || false,
    })
  }

  const handleDeleteSize = async (id: string) => {
    try {
      await deleteItemSize(id)
      setItemSizes((prev) => prev.filter((s) => s.id !== id))
    } catch (error: any) {
      alert("Error deleting size: " + error.message)
    }
  }

  const handleSaveOption = async () => {
    if (!currentItemForOptions) return
    if (!optionForm.option_name.trim()) {
      alert("Please enter an option name")
      return
    }
    if (optionForm.choices.length === 0) {
      alert("Please add at least one choice")
      return
    }

    try {
      if (editingOption) {
        // Update existing option
        const result = await updateItemOption(editingOption.id, {
          category: optionForm.option_name,
          is_required: optionForm.is_required,
          min_selection: Number.parseInt(optionForm.min_selection) || 0,
          max_selection: Number.parseInt(optionForm.max_selection) || 1,
          display_type: optionForm.display_type,
        })

        if (!result.success) throw new Error(result.error || "Failed to update option")

        // Get existing choices to delete them first
        const existingChoices = await getItemOptionChoices(editingOption.id)

        // Delete existing choices
        if (existingChoices.length > 0) {
          for (const choice of existingChoices) {
            await deleteItemOptionChoice(choice.id)
          }
        }

        // Add new choices with display_order based on array position
        for (let i = 0; i < optionForm.choices.length; i++) {
          const choice = optionForm.choices[i]
          const choiceResult = await createItemOptionChoice({
            item_option_id: editingOption.id,
            name: choice.choice_name,
            price_modifier: Number.parseFloat(choice.price_modifier) || 0,
            parent_choice_id: choice.parent_choice_id === "none" ? null : choice.parent_choice_id,
            description: choice.description || null,
            display_order: i,
          })
          if (!choiceResult.success) {
            console.error("Failed to create choice:", choiceResult.error)
          }
        }
      } else {
        // Create new option
        const result = await createItemOption({
          menu_item_id: currentItemForOptions.id,
          category: optionForm.option_name,
          is_required: optionForm.is_required,
          min_selection: Number.parseInt(optionForm.min_selection) || 0,
          max_selection: Number.parseInt(optionForm.max_selection) || 1,
          display_type: optionForm.display_type,
        })

        if (!result.success || !result.data) throw new Error(result.error || "Failed to create option")

        const newOptionId = result.data.id

        // Add choices with display_order based on array position
        for (let i = 0; i < optionForm.choices.length; i++) {
          const choice = optionForm.choices[i]
          const choiceResult = await createItemOptionChoice({
            item_option_id: newOptionId,
            name: choice.choice_name,
            price_modifier: Number.parseFloat(choice.price_modifier) || 0,
            parent_choice_id: choice.parent_choice_id === "none" ? null : choice.parent_choice_id,
            description: choice.description || null,
            display_order: i,
          })
          if (!choiceResult.success) {
            console.error("Failed to create choice:", choiceResult.error)
          }
        }
      }

      // Reload options
      await loadItemOptions(currentItemForOptions.id)
      resetOptionForm()
      setEditingOption(null)
      setShowOptionForm(false) // Hide the form after saving
      toast({ title: editingOption ? "Option updated successfully" : "Option created successfully" })
    } catch (error) {
      console.error("Error saving option:", error)
      alert("Failed to save option. Please try again.")
    }
  }

  const handleDeleteOption = async (optionId: string) => {
    if (!confirm("Are you sure you want to delete this option?")) return

    try {
      await deleteItemOptionAction(optionId)
      toast({ title: "Option deleted successfully" })
      if (currentItemForOptions) {
        handleManageOptions(currentItemForOptions)
      }
    } catch (error) {
      toast({ title: "Error deleting option", variant: "destructive" })
    }
  }

  const resetOptionForm = () => {
    setOptionForm({
      option_name: "",
      option_type: "single",
      display_type: "pills", // Reset display_type
      is_required: false,
      min_selection: "0",
      max_selection: "1",
      choices: [],
    })
    setEditingOption(null)
  }

  const handleCopyOption = (option: any) => {
    setOptionToCopy(option)
    setSelectedTargetItems([])
    setShowCopyOptionModal(true)
  }

  const handleAddExistingOption = async (sourceOptionId: string) => {
    if (!manageOptionsItem?.id) return
    try {
      await copyItemOption(sourceOptionId, [manageOptionsItem.id])
      toast({ title: "Option added successfully" })
      await loadItemOptions(manageOptionsItem.id) // Reload options for the current item
      setShowOptionsModal(true) // Re-open the manage options modal
    } catch (error) {
      toast({ title: "Failed to add option", variant: "destructive" })
    }
  }

  const handleConfirmCopyOption = async () => {
    if (!optionToCopy || selectedTargetItems.length === 0) return

    try {
      const result = await copyItemOption(optionToCopy.id, selectedTargetItems)
      toast({
        title: `Option copied to ${result.copiedCount} menu item(s) successfully`,
      })
      setShowCopyOptionModal(false)
      setOptionToCopy(null)
      setSelectedTargetItems([])
    } catch (error) {
      console.error("[v0] Error copying option:", error)
      toast({ title: "Error copying option", variant: "destructive" })
    }
  }

  const toggleTargetItem = (itemId: string) => {
    setSelectedTargetItems((prev) => (prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]))
  }

  const handleEditMenuItem = (item: any) => {
    setEditingItem(item)
    setMenuItemForm({
      name: item.name,
      description: item.description || "",
      price: item.price.toString(),
      image_url: item.image_url || "",
      category_id: item.category_id || "",
      item_type_id: item.item_type_id || "",
      serves: item.serves?.toString() || "",
      dietary_tags: item.dietary_tags || [],
      pricing_unit: item.pricing_unit || "each",
      per_unit_price: item.per_unit_price?.toString() || "",
      min_quantity: item.min_quantity?.toString() || "",
      is_bulk_order: item.is_bulk_order || false,
      minimum_quantity: item.minimum_quantity || undefined,
      per_unit_pricing: item.per_unit_pricing || false,
      quantity_unit: item.quantity_unit || undefined,
      is_cart_upsell: item.is_cart_upsell || false,
      lead_time_hours: item.lead_time_hours?.toString(),
      container_type: item.container_type || "none",
      containers_per_unit: item.containers_per_unit?.toString() || "1",
    })
    setShowMenuItemModal(true)
  }

  const handleDeleteMenuItem = async (itemId: string) => {
    if (!confirm("Are you sure you want to delete this menu item?")) return

    try {
      await deleteMenuItemAction(itemId)
      toast({ title: "Menu item deleted successfully" })
      loadMenuItems()
    } catch (error) {
      toast({ title: "Error deleting menu item", variant: "destructive" })
    }
  }

  const handleSaveMenuItem = async () => {
    if (!menuItemForm.name || !menuItemForm.price || !menuItemForm.category_id) {
      toast({ title: "Please fill in all required fields", variant: "destructive" })
      return
    }

    try {
      if (editingItem) {
        const isUnitBased = menuItemForm.pricing_unit && menuItemForm.pricing_unit !== "each"
        const result = await updateMenuItem(editingItem.id, {
          name: menuItemForm.name,
          description: menuItemForm.description,
          base_price: Number.parseFloat(menuItemForm.price),
          image_url: menuItemForm.image_url || null,
          category_id: menuItemForm.category_id,
          pricing_unit: menuItemForm.pricing_unit || null,
          per_unit_price: isUnitBased && menuItemForm.per_unit_price ? Number.parseFloat(menuItemForm.per_unit_price) : null,
          min_quantity: menuItemForm.min_quantity ? Number.parseInt(menuItemForm.min_quantity) : null,
  serves: menuItemForm.serves ? menuItemForm.serves.trim() : null,
  is_bulk_order: menuItemForm.is_bulk_order,
  minimum_quantity: menuItemForm.is_bulk_order && menuItemForm.minimum_quantity ? Number.parseInt(menuItemForm.minimum_quantity) : null,
  per_unit_pricing: menuItemForm.is_bulk_order ? menuItemForm.per_unit_pricing : false,
  quantity_unit: menuItemForm.is_bulk_order && menuItemForm.quantity_unit ? menuItemForm.quantity_unit : null,
  is_cart_upsell: menuItemForm.is_cart_upsell,
  })

        if (!result.success) throw new Error(result.error || "Failed to update")

        // Refresh menu items
        const { data: updatedItems } = await supabase
          .from("menu_items")
          .select("*")
          .eq("restaurant_id", restaurantId)
          .order("display_order")
        if (updatedItems) setMenuItems(updatedItems)

        toast({ title: editingItem ? "Item updated!" : "Item created!" })
        setShowMenuItemModal(false)
        setEditingItem(null)
      } else {
        // Create new item
        const isUnitBasedCreate = menuItemForm.pricing_unit && menuItemForm.pricing_unit !== "each"
        const result = await createMenuItem({
          restaurant_id: restaurantId,
          category_id: menuItemForm.category_id,
          name: menuItemForm.name.trim(),
          description: menuItemForm.description.trim(),
          base_price: Number.parseFloat(menuItemForm.price),
          image_url: menuItemForm.image_url || null,
          is_active: true,
          pricing_unit: menuItemForm.pricing_unit || null,
          per_unit_price: isUnitBasedCreate && menuItemForm.per_unit_price ? Number.parseFloat(menuItemForm.per_unit_price) : null,
          min_quantity: menuItemForm.min_quantity ? Number.parseInt(menuItemForm.min_quantity) : null,
          serves: menuItemForm.serves ? menuItemForm.serves.trim() : null,
          is_bulk_order: menuItemForm.is_bulk_order,
          minimum_quantity: menuItemForm.is_bulk_order && menuItemForm.minimum_quantity ? Number.parseInt(menuItemForm.minimum_quantity) : null,
          per_unit_pricing: menuItemForm.is_bulk_order ? menuItemForm.per_unit_pricing : false,
          quantity_unit: menuItemForm.is_bulk_order && menuItemForm.quantity_unit ? menuItemForm.quantity_unit : null,
          is_cart_upsell: menuItemForm.is_cart_upsell,
          lead_time_hours: menuItemForm.lead_time_hours ? Number.parseInt(menuItemForm.lead_time_hours) : null,
          container_type: menuItemForm.container_type || "none",
          containers_per_unit: menuItemForm.containers_per_unit ? Number.parseInt(menuItemForm.containers_per_unit) : 1,
        })
        toast({ title: "Menu item created successfully" })
      }

      setShowMenuItemModal(false)
      setEditingItem(null)
      setMenuItemForm({
        name: "",
        description: "",
        price: "",
        image_url: "",
        category_id: "",
        item_type_id: "",
        serves: "",
        dietary_tags: [],
        pricing_unit: "each",
        per_unit_price: "",
        min_quantity: "",
        is_bulk_order: false,
        minimum_quantity: undefined,
        per_unit_pricing: false,
        quantity_unit: undefined,
        is_cart_upsell: false,
        lead_time_hours: undefined,
        container_type: "none",
        containers_per_unit: "1",
      })
      loadMenuItems()
    } catch (error) {
  const errMsg = error instanceof Error ? error.message : "Unknown error"
  console.error("[v0] Error saving menu item:", errMsg, error)
  toast({ title: editingItem ? "Error updating menu item" : "Error creating menu item", description: errMsg, variant: "destructive" })
    }
  }

  const resetMenuItemForm = () => {
    setMenuItemForm({
      name: "",
      description: "",
      price: "",
      image_url: "",
      category_id: "",
      item_type_id: "",
      serves: "",
      dietary_tags: [],
      pricing_unit: "each",
      per_unit_price: "",
      min_quantity: "",
      is_bulk_order: false,
      minimum_quantity: undefined,
      per_unit_pricing: false,
      quantity_unit: undefined,
      is_cart_upsell: false,
      lead_time_hours: undefined,
    })
    setEditingItem(null)
  }

  const handleEditPackage = (pkg: any) => {
    setEditingPackage(pkg)
    setPackageForm({
      name: pkg.name,
      description: pkg.description || "",
      base_price: pkg.base_price,
      image_url: pkg.image_url || "",
      inclusions: pkg.package_inclusions?.map((inc: any) => ({ id: inc.id, description: inc.description, is_active: inc.is_active ?? true })) || [],
      addons:
        pkg.package_addons?.map((addon: any) => ({
          id: addon.id,
          name: addon.name,
          price_per_unit: addon.price_per_unit,
          unit: addon.unit,
          image_url: addon.image_url,
          parent_addon_id: addon.parent_addon_id,
          is_active: addon.is_active ?? true,
          choices:
            addon.package_addon_choices?.map((choice: any) => ({
              id: crypto.randomUUID(), // Temporary ID for choices
              name: choice.name,
              price_modifier: choice.price_modifier,
              image_url: choice.image_url,
            })) || [],
        })) || [],
    })
    setShowPackageModal(true)
  }

  const handleDeletePackage = async (packageId: string) => {
    if (!confirm("Are you sure you want to delete this service package?")) return

    try {
      await deleteServicePackageAction(packageId)
      toast({ title: "Service package deleted successfully" })
      loadServicePackages()
    } catch (error) {
      toast({ title: "Error deleting service package", variant: "destructive" })
    }
  }

  const handleSavePackage = async () => {
    try {
      let packageId: string

      if (editingPackage) {
        // Update existing package
        await updateServicePackage(editingPackage.id, {
          name: packageForm.name,
          description: packageForm.description,
          base_price: packageForm.base_price,
          image_url: packageForm.image_url,
        })
        packageId = editingPackage.id

        // Delete old addons (inclusions are handled by savePackageInclusions which deletes first)
        await deletePackageAddons(packageId)
      } else {
        // Create new package
        const newPackage = await createServicePackage({
          restaurant_id: restaurantId,
          name: packageForm.name,
          description: packageForm.description,
          base_price: packageForm.base_price,
          image_url: packageForm.image_url,
        })
        packageId = newPackage.id
      }

      // Save inclusions (server action handles delete + insert)
      const validInclusions = packageForm.inclusions.filter((inc) => inc.description.trim())
      if (validInclusions.length > 0) {
        await savePackageInclusions(
          packageId,
          validInclusions.map((inc, idx) => ({ description: inc.description, display_order: idx, is_active: inc.is_active ?? true })),
        )
      }

      // Save addons
      const validAddons = packageForm.addons.filter((addon) => addon.name.trim())
      for (const addon of validAddons) {
        const newAddon = await createPackageAddon({
          package_id: packageId,
          name: addon.name,
          price_per_unit: addon.price_per_unit,
          unit: addon.unit,
          is_active: addon.is_active ?? true,
        })

        // Save addon choices
        const validChoices = (addon.choices || []).filter((c) => c.name.trim())
        if (validChoices.length > 0) {
          await savePackageAddonChoices(
            newAddon.id,
            validChoices.map((choice, idx) => ({
              name: choice.name,
              price_modifier: choice.price_modifier || 0,
              display_order: idx,
            })),
          )
        }
      }

      loadServicePackages()
      setShowPackageModal(false)
      setEditingPackage(null)
      setPackageForm({
        name: "",
        description: "",
        base_price: 0,
        image_url: "",
        inclusions: [],
        addons: [],
      })
      toast({ title: editingPackage ? "Package updated" : "Package created" })
    } catch (error) {
      console.error("Error saving package:", error)
      toast({ title: "Failed to save package", variant: "destructive" })
    }
  }

  const resetPackageForm = () => {
    setPackageForm({
      name: "",
      description: "",
      base_price: 0, // Reset to 0
      image_url: "",
      inclusions: [],
      addons: [],
    })
    setEditingPackage(null)
  }

  // Uses server action (admin client) to bypass RLS
  const handleToggleMenuItemActive = async (itemId: string, currentStatus: boolean) => {
    try {
      // Optimistically update local state
      setMenuItems((prev) => prev.map((item) => (item.id === itemId ? { ...item, is_active: !currentStatus } : item)))
      await updateMenuItem(itemId, { is_active: !currentStatus })
      toast({
        title: "Success",
        description: `Menu item ${!currentStatus ? "activated" : "deactivated"}`,
      })
    } catch (error) {
      // Revert optimistic update
      setMenuItems((prev) => prev.map((item) => (item.id === itemId ? { ...item, is_active: currentStatus } : item)))
      toast({
        title: "Error",
        description: "Failed to update menu item status",
        variant: "destructive",
      })
    }
  }

  // Uses server action (admin client) to bypass RLS
  const handleToggleServicePackage = async (packageId: string, currentStatus: boolean) => {
    try {
      setServicePackages((prev) => prev.map((pkg) => (pkg.id === packageId ? { ...pkg, is_active: !currentStatus } : pkg)))
      await updateServicePackage(packageId, { is_active: !currentStatus })
      toast({
        title: "Success",
        description: `Service package ${!currentStatus ? "activated" : "deactivated"}`,
      })
    } catch (error) {
      setServicePackages((prev) => prev.map((pkg) => (pkg.id === packageId ? { ...pkg, is_active: currentStatus } : pkg)))
      toast({
        title: "Error",
        description: "Failed to update service package status",
        variant: "destructive",
      })
    }
  }

  const handleEditCategory = (category: any) => {
    setEditingCategory(category)
    setCategoryForm({
      name: category.name,
      description: category.description || "",
      header_image_url: category.header_image_url || "",
      available_days: category.available_days || { sun: true, mon: true, tue: true, wed: true, thu: true, fri: true, sat: true },
    })
    setShowCategoryModal(true)
  }

  const handleSaveCategory = async () => {
    if (!categoryForm.name) {
      toast({ title: "Please fill in category name", variant: "destructive" })
      return
    }

    const categoryData = {
      restaurant_id: restaurantId,
      name: categoryForm.name,
      description: categoryForm.description,
      header_image_url: categoryForm.header_image_url || null, // Ensure null if empty
      display_order: editingCategory?.display_order ?? categories.length,
      is_active: editingCategory ? editingCategory.is_active : true, // Keep existing active status or default to true
      available_days: categoryForm.available_days,
    }

    try {
      if (editingCategory) {
        // Update existing category
        const { error } = await updateCategory(editingCategory.id, categoryData)
        if (error) {
          throw error
        }
        toast({ title: "Category updated successfully" })
      } else {
        // Create new category
        const { error } = await createCategory(categoryData)
        if (error) {
          throw error
        }
        toast({ title: "Category created successfully" })
      }

      setShowCategoryModal(false)
      setEditingCategory(null)
      setCategoryForm({ name: "", description: "", header_image_url: "", available_days: { sun: true, mon: true, tue: true, wed: true, thu: true, fri: true, sat: true } }) // Reset form
      loadCategories()
      loadStats() // Reload stats to update category count
    } catch (error) {
      console.error("[v0] Error saving category:", error)
      toast({ title: editingCategory ? "Error updating category" : "Error creating category", variant: "destructive" })
    }
  }

  const handleDeleteCategory = async (categoryId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this category? All menu items in this category will need to be reassigned.",
      )
    )
      return

    try {
      const { error } = await deleteCategoryAction(categoryId) // Use the imported action
      if (error) {
        throw error
      }
      toast({ title: "Category deleted successfully" })
      loadCategories()
      loadStats() // Reload stats to update category count
    } catch (error) {
      console.error("[v0] Error deleting category:", error)
      toast({ title: "Error deleting category", variant: "destructive" })
    }
  }

  const resetCategoryForm = () => {
    setCategoryForm({ name: "", description: "", header_image_url: "", available_days: { sun: true, mon: true, tue: true, wed: true, thu: true, fri: true, sat: true } })
    setEditingCategory(null)
  }
  // End of category form handlers

  // Removed duplicate handleCategoryDragStart
  // Removed duplicate handleCategoryDragOver
  // Removed duplicate handleCategoryDragEnd

  const handleMenuItemDragStart = (e: React.DragEvent, index: number) => {
    setDraggedMenuItemIndex(index)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleMenuItemDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedMenuItemIndex === null || draggedMenuItemIndex === index) return

    const newItems = [...menuItems]
    const draggedItem = newItems[draggedMenuItemIndex]
    newItems.splice(draggedMenuItemIndex, 1)
    newItems.splice(index, 0, draggedItem)

    setMenuItems(newItems)
    setDraggedMenuItemIndex(index)
  }

  const handleMenuItemDragEnd = async () => {
    setDraggedMenuItemIndex(null)

    const menuItemIds = menuItems.map((item) => item.id)
    await updateMenuItemOrder(menuItemIds)

    toast({ title: "Menu items order updated successfully" })
  }

  const handlePackageDragStart = (e: React.DragEvent, index: number) => {
    setDraggedPackageIndex(index)
    e.dataTransfer.effectAllowed = "move"
  }

  const handlePackageDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedPackageIndex === null || draggedPackageIndex === index) return

    const newPackages = [...servicePackages]
    const draggedItem = newPackages[draggedPackageIndex]
    newPackages.splice(draggedPackageIndex, 1)
    newPackages.splice(index, 0, draggedItem)

    setServicePackages(newPackages)
    setDraggedPackageIndex(index)
  }

  const handlePackageDragEnd = async () => {
    setDraggedPackageIndex(null)

    // Original code had an error here, `index` and `id` were undeclared.
    // Assuming the intent was to update `display_order` for each package based on its new index.
    // This requires a loop or a more complex update operation.
    // For now, we'll update the display_order to reflect the new order.
    const updates = servicePackages.map((pkg, newIndex) => ({
      id: pkg.id,
      display_order: newIndex,
    }))

    await updatePackageDisplayOrder(updates)

    toast({ title: "Service packages order updated successfully" })
  }

  const handleAddonDragStart = (e: React.DragEvent, index: number) => {
    setDraggedAddonIndex(index)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleAddonDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedAddonIndex === null || draggedAddonIndex === index) return

    const newAddons = [...packageForm.addons]
    const draggedItem = newAddons[draggedAddonIndex]
    newAddons.splice(draggedAddonIndex, 1)
    newAddons.splice(index, 0, draggedItem)

    setPackageForm({ ...packageForm, addons: newAddons })
    setDraggedAddonIndex(index)
  }

  const handleAddonDragEnd = () => {
    setDraggedAddonIndex(null)
  }

  // handleSaveSettings now updates restaurant_address, delivery_fee, lead_time_hours, min_delivery_order, tip_option_1, tip_option_2, tip_option_3
  const handleTransferOrder = async () => {
    if (!transferDialog.targetBranchId) {
      toast({ title: "Error", description: "Selecciona una sucursal destino.", variant: "destructive" })
      return
    }
    try {
      const result = await transferOrder(transferDialog.orderId, transferDialog.targetBranchId, transferDialog.reason)
      toast({ title: "Orden transferida", description: `Orden transferida a ${result.targetBranchName}.` })
      setTransferDialog({ open: false, orderId: "", targetBranchId: "", reason: "" })
      router.refresh()
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "No se pudo transferir la orden.", variant: "destructive" })
    }
  }

  // Copy menu from/to another restaurant
  const handleCopyMenu = async () => {
    if (copyMenuDirection === "pull" && !copyMenuSourceId) return
    if (copyMenuDirection === "push" && copyMenuTargetIds.length === 0) return
    
    const targetCount = copyMenuDirection === "push" ? copyMenuTargetIds.length : 1
    const confirmMsg = copyMenuClearExisting
      ? `Esto BORRARA el menu de ${targetCount} restaurante(s) y lo reemplazara. ¿Continuar?`
      : `Esto agregara el menu a ${targetCount} restaurante(s). ¿Continuar?`
    
    if (!window.confirm(confirmMsg)) return

    setIsCopyingMenu(true)
    setCopyMenuResult(null)

    try {
      if (copyMenuDirection === "pull") {
        // Pull: copy FROM another restaurant TO this one
        const response = await fetch("/api/admin/copy-menu", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sourceRestaurantId: copyMenuSourceId,
            targetRestaurantId: restaurantId,
            clearExisting: copyMenuClearExisting,
          }),
        })
        const data = await response.json()
        if (!response.ok) {
          setCopyMenuResult({ success: false, message: data.error || "Error al copiar menu" })
        } else {
          setCopyMenuResult({
            success: true,
            message: "Menu copiado exitosamente",
            results: data.results,
          })
          loadCategories()
          loadMenuItems()
        }
      } else {
        // Push: copy FROM this restaurant TO multiple others
        let totalResults = { categories: 0, items: 0, options: 0, choices: 0 }
        let errors: string[] = []
        
        for (const targetId of copyMenuTargetIds) {
          const response = await fetch("/api/admin/copy-menu", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sourceRestaurantId: restaurantId,
              targetRestaurantId: targetId,
              clearExisting: copyMenuClearExisting,
            }),
          })
          const data = await response.json()
          if (!response.ok) {
            const targetName = allRestaurantsForCopy.find(r => r.id === targetId)?.name || targetId
            errors.push(`${targetName}: ${data.error}`)
          } else if (data.results) {
            totalResults.categories += data.results.categories
            totalResults.items += data.results.items
            totalResults.options += data.results.options
            totalResults.choices += data.results.choices
          }
        }
        
        if (errors.length > 0) {
          setCopyMenuResult({
            success: false,
            message: `Errores: ${errors.join(", ")}`,
            results: totalResults,
          })
        } else {
          setCopyMenuResult({
            success: true,
            message: `Menu copiado a ${copyMenuTargetIds.length} restaurante(s)`,
            results: totalResults,
          })
        }
        setCopyMenuTargetIds([])
      }
    } catch (error: any) {
      setCopyMenuResult({ success: false, message: error.message || "Error al copiar menu" })
    } finally {
      setIsCopyingMenu(false)
    }
  }

  const handleSaveSettings = async () => {
    const data = {
      name: settingsForm.name,
      email: settingsForm.email || null,
  logo_url: settingsForm.logo_url,
  banner_logo_url: settingsForm.banner_logo_url || null,
  hero_image_url: settingsForm.hero_image_url || null,
      primary_color: settingsForm.primary_color,
      standalone_domain: settingsForm.standalone_domain || null,
      restaurant_address: settingsForm.restaurant_address,
      latitude: settingsForm.latitude ? Number.parseFloat(settingsForm.latitude) : undefined,
      longitude: settingsForm.longitude ? Number.parseFloat(settingsForm.longitude) : undefined,
      tax_rate: settingsForm.tax_rate ? Number.parseFloat(settingsForm.tax_rate) : null,
      delivery_fee: settingsForm.delivery_fee ? Number.parseFloat(settingsForm.delivery_fee) : null,
      lead_time_hours: settingsForm.lead_time_hours ? Number.parseInt(settingsForm.lead_time_hours) : null,
      delivery_lead_time_hours: settingsForm.delivery_lead_time_hours ? Number.parseInt(settingsForm.delivery_lead_time_hours) : null,
      pickup_lead_time_hours: settingsForm.pickup_lead_time_hours ? Number.parseInt(settingsForm.pickup_lead_time_hours) : null,
      max_advance_days: settingsForm.max_advance_days ? Number.parseInt(settingsForm.max_advance_days) : null,
      min_delivery_order: settingsForm.min_delivery_order ? Number.parseFloat(settingsForm.min_delivery_order) : null,
      min_pickup_order: settingsForm.min_pickup_order ? Number.parseFloat(settingsForm.min_pickup_order) : null,
      tip_option_1: settingsForm.tip_option_1 ? Number.parseFloat(settingsForm.tip_option_1) : null,
      tip_option_2: settingsForm.tip_option_2 ? Number.parseFloat(settingsForm.tip_option_2) : null,
      tip_option_3: settingsForm.tip_option_3 ? Number.parseFloat(settingsForm.tip_option_3) : null,
      delivery_enabled: settingsForm.delivery_enabled,
  pickup_enabled: settingsForm.pickup_enabled,
  delivery_base_fee: settingsForm.delivery_base_fee ? Number.parseFloat(settingsForm.delivery_base_fee) : null,
  delivery_included_containers: settingsForm.delivery_included_containers ? Number.parseInt(settingsForm.delivery_included_containers) : null,
  delivery_radius: settingsForm.delivery_radius ? Number.parseFloat(settingsForm.delivery_radius) : null,
  delivery_zip_codes: settingsForm.delivery_zip_codes.length > 0 ? settingsForm.delivery_zip_codes : null,
      shipday_api_key: settingsForm.shipday_api_key || null,
      is_chain: settingsForm.is_chain,
      hide_branch_selector_title: settingsForm.hide_branch_selector_title,
      packages_section_title: settingsForm.packages_section_title || null,
      design_template: settingsForm.design_template,
      show_service_packages: settingsForm.show_service_packages,
      footer_description: settingsForm.footer_description || null,
      footer_email: settingsForm.footer_email || null,
      footer_phone: settingsForm.footer_phone || null,
      footer_links: settingsForm.footer_links.length > 0 ? settingsForm.footer_links : null,
      // Payment provider settings
      payment_provider: settingsForm.payment_provider || "stripe",
      stripe_account_id: settingsForm.stripe_account_id || null,
      square_access_token: settingsForm.square_access_token || null,
      square_location_id: settingsForm.square_location_id || null,
      square_environment: settingsForm.square_environment || "production",
      athmovil_public_token: settingsForm.athmovil_public_token || null,
      athmovil_ecommerce_id: settingsForm.athmovil_ecommerce_id || null,
      cash_payment_enabled: settingsForm.cash_payment_enabled || false,
      // Order notification settings
      order_notification_method: settingsForm.order_notification_method || "email",
      chowly_api_key: settingsForm.chowly_api_key || null,
      chowly_location_id: settingsForm.chowly_location_id || null,
      chowly_enabled: settingsForm.chowly_enabled || false,
      square_kds_enabled: settingsForm.square_kds_enabled || false,
      kds_access_token: settingsForm.kds_access_token || null,
    }

    try {
      const result = await updateRestaurantSettings(restaurantId, data)

      if (result.error) {
        toast({ title: "Error saving settings", description: result.error.message || "Unknown error", variant: "destructive" })
      } else {
        toast({ title: "Settings saved successfully" })
        loadCategories()
      }
    } catch (e: any) {
      toast({ title: "Error saving settings", description: e.message, variant: "destructive" })
    }
  }

  const handleSaveOperatingHours = async () => {
    setSavingHours(true)
    try {
      const result = await saveOperatingHours(restaurantId, operatingHours)
      if (result.success) {
        toast({ title: "Horario guardado exitosamente" })
      } else {
        toast({ title: "Error guardando horario", description: result.error, variant: "destructive" })
      }
    } catch (e: any) {
      toast({ title: "Error guardando horario", description: e.message, variant: "destructive" })
    } finally {
      setSavingHours(false)
    }
  }

  const handleSaveRestaurantHours = async () => {
    setSavingRestaurantHours(true)
    try {
      const result = await saveRestaurantHours(restaurantId, restaurantHours)
      if (result.success) {
        toast({ title: "Horario de comidas guardado exitosamente" })
      } else {
        toast({ title: "Error guardando horario", description: result.error, variant: "destructive" })
      }
    } catch (e: any) {
      toast({ title: "Error guardando horario", description: e.message, variant: "destructive" })
    } finally {
      setSavingRestaurantHours(false)
    }
  }

  // Copy one day's hours to all days
  const copyRestaurantHoursToAll = (sourceDayIndex: number) => {
    const sourceDay = restaurantHours[sourceDayIndex]
    const updated = restaurantHours.map((day) => ({
      ...day,
      breakfast_open: sourceDay.breakfast_open,
      breakfast_close: sourceDay.breakfast_close,
      lunch_open: sourceDay.lunch_open,
      lunch_close: sourceDay.lunch_close,
      dinner_open: sourceDay.dinner_open,
      dinner_close: sourceDay.dinner_close,
    }))
    setRestaurantHours(updated)
    toast({ title: `Horario de ${DAY_NAMES[sourceDayIndex]} copiado a todos los dias` })
  }

  // Removed the old handleServicePackagesToggle function from here.
  // The new implementation is defined earlier in the file.

  // Added handleSaveZone and handleDeleteZone
  const handleSaveZone = async () => {
    if (!zoneForm.zone_name || !zoneForm.max_distance || !zoneForm.base_fee) {
      alert("Please fill in all required fields")
      return
    }

    const zoneData = {
      restaurant_id: restaurantId,
      zone_name: zoneForm.zone_name,
      min_distance: Number.parseFloat(zoneForm.min_distance),
      max_distance: Number.parseFloat(zoneForm.max_distance),
      base_fee: Number.parseFloat(zoneForm.base_fee),
      per_item_surcharge: Number.parseFloat(zoneForm.per_item_surcharge),
      min_items_for_surcharge: Number.parseInt(zoneForm.min_items_for_surcharge),
      is_active: zoneForm.is_active,
      display_order: editingZone ? editingZone.display_order : deliveryZones.length,
    }

    if (editingZone) {
      const { error } = await updateDeliveryZone(editingZone.id, zoneData)

      if (error) {
        alert("Error updating zone")
        return
      }
    } else {
      const { error } = await createDeliveryZone(zoneData)

      if (error) {
        alert("Error creating zone")
        return
      }
    }

    setShowZoneModal(false)
    setEditingZone(null)
    setZoneForm({
      zone_name: "",
      min_distance: "0",
      max_distance: "",
      base_fee: "",
      per_item_surcharge: "0",
      min_items_for_surcharge: "50",
      is_active: true,
    })
    fetchDeliveryZones()
  }

  const handleDeleteZone = async (zoneId: string) => {
    if (!confirm("Are you sure you want to delete this delivery zone?")) return

    const { error } = await deleteDeliveryZoneAction(zoneId)

    if (error) {
      alert("Error deleting zone")
      return
    }

    fetchDeliveryZones()
  }

  // Handle file input change for bulk import
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setImportFile(event.target.files[0])
    }
  }

  // Handle bulk import submission
  const handleBulkImportSubmit = async () => {
    if (!importFile) {
      toast({ title: "Please select a file to import", variant: "destructive" })
      return
    }

    try {
      const formData = new FormData()
      formData.append("menuItems", importFile)
      formData.append("restaurantId", restaurantId)

      const response = await fetch("/api/import-menu-items", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to import menu items")
      }

      const result = await response.json()
      toast({ title: `Successfully imported ${result.importedCount} menu items.` })
      loadMenuItems() // Reload menu items after import
      setShowBulkImportModal(false)
      setImportFile(null)
    } catch (error: any) {
      console.error("Error during bulk import:", error)
      toast({ title: `Error importing menu items: ${error.message}`, variant: "destructive" })
    }
  }

  const handleBulkImport = async (items: any[]) => {
    try {
      const result = await bulkImportMenuItems(restaurantId, items)

      if (result.success) {
        toast({
          title: "Success",
          description: result.message,
        })
        await loadMenuItems()
        await loadCategories()
        setShowBulkImportModal(false)
      } else {
        throw new Error(result.message)
      }
    } catch (error) {
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "Failed to import menu items",
        variant: "destructive",
      })
      throw error
    }
  }

  const handleCSVImport = async (
    items: Array<{
      category_name: string
      item_name: string
      description: string
      price: number
      is_active: boolean
    }>,
  ) => {
    const result = await bulkImportMenuItems(restaurantId, items) // Use restaurantId from props

    // Refresh the page data to show new items
    if (result.success) {
      window.location.reload()
    }

    return result
  }

  const handleBulkDeleteCategories = async () => {
    if (selectedCategoryIds.length === 0) {
      toast({
        title: "No Selection",
        description: "Please select categories to delete",
        variant: "destructive",
      })
      return
    }

    if (
      !confirm(
        `Are you sure you want to delete ${selectedCategoryIds.length} categories? This action cannot be undone.`,
      )
    ) {
      return
    }

    try {
      const result = await bulkDeleteCategories(selectedCategoryIds)
      toast({
        title: "Success",
        description: `Deleted ${result.deletedCount} categories`,
      })
      setSelectedCategoryIds([])
      loadCategories()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const handleBulkDeleteMenuItems = async () => {
    if (selectedMenuItemIds.length === 0) {
      toast({
        title: "No Selection",
        description: "Please select items to delete",
        variant: "destructive",
      })
      return
    }

    if (
      !confirm(
        `Are you sure you want to delete ${selectedMenuItemIds.length} menu items? This action cannot be undone.`,
      )
    ) {
      return
    }

    try {
      const result = await bulkDeleteMenuItems(selectedMenuItemIds)
      toast({
        title: "Success",
        description: `Deleted ${result.deletedCount} menu items`,
      })
      setSelectedMenuItemIds([])
      loadMenuItems()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const toggleCategorySelection = (categoryId: string) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(categoryId) ? prev.filter((id) => id !== categoryId) : [...prev, categoryId],
    )
  }

  const toggleMenuItemSelection = (itemId: string) => {
    setSelectedMenuItemIds((prev) => (prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]))
  }

  const toggleAllCategories = () => {
    if (selectedCategoryIds.length === categories.filter((c) => !c.is_virtual).length) {
      setSelectedCategoryIds([])
    } else {
      setSelectedCategoryIds(categories.filter((c) => !c.is_virtual).map((c) => c.id))
    }
  }

  const toggleAllMenuItems = () => {
    if (selectedMenuItemIds.length === menuItems.length) {
      setSelectedMenuItemIds([])
    } else {
      setSelectedMenuItemIds(menuItems.map((item) => item.id))
    }
  }

const handleSaveMarketplaceSettings = async () => {
  try {
  const result = await updateRestaurantMarketplaceSettings(
  restaurant.id,
  marketplaceSettings.show_in_marketplace,
  marketplaceSettings.marketplace_tagline,
  marketplaceSettings.cuisine_types,
  marketplaceSettings.is_featured,
  marketplaceSettings.area,
  marketplaceSettings.main_cuisine_type,
  )
      if (result.error) {
        toast({
          title: "Error updating marketplace settings",
          description: result.error,
          variant: "destructive",
        })
      } else {
        toast({ title: "Marketplace settings updated successfully" })
      }
    } catch (error) {
      toast({
        title: "Error updating marketplace settings",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    }
  }

  // Branch handlers
  const handleOpenBranchDialog = (branch?: any) => {
    if (branch) {
      setEditingBranch(branch)
      setBranchForm({
        name: branch.name || "", slug: branch.slug || "",
        address: branch.address || "", city: branch.city || "", state: branch.state || "", zip: branch.zip || "",
        phone: branch.phone || "", email: branch.email || "",
        image_url: branch.image_url || "", logo_url: branch.logo_url || "",
        delivery_fee: branch.delivery_fee?.toString() || "",
        delivery_lead_time_hours: branch.delivery_lead_time_hours?.toString() || "",
        pickup_lead_time_hours: branch.pickup_lead_time_hours?.toString() || "",
        lead_time_hours: branch.lead_time_hours?.toString() || "",
        max_advance_days: branch.max_advance_days?.toString() || "",
        min_delivery_order: branch.min_delivery_order?.toString() || "",
        min_pickup_order: branch.min_pickup_order?.toString() || "",
        shipday_api_key: branch.shipday_api_key || "",
        tax_rate: branch.tax_rate?.toString() || "",
        tip_option_1: branch.tip_option_1?.toString() || "",
        tip_option_2: branch.tip_option_2?.toString() || "",
        tip_option_3: branch.tip_option_3?.toString() || "",
        primary_color: branch.primary_color || "",
        design_template: branch.design_template || "",
        standalone_domain: branch.standalone_domain || "",
        packages_section_title: branch.packages_section_title || "",
        show_service_packages: branch.show_service_packages != null ? (branch.show_service_packages ? "true" : "false") : "",
        latitude: branch.latitude?.toString() || "", longitude: branch.longitude?.toString() || "",
        delivery_radius: branch.delivery_radius?.toString() || "",
        delivery_enabled: branch.delivery_enabled ?? true, pickup_enabled: branch.pickup_enabled ?? true,
        is_active: branch.is_active ?? true,
        area: branch.area || "",
        payment_provider: branch.payment_provider || "stripe",
        stripe_account_id: branch.stripe_account_id || "",
        square_access_token: branch.square_access_token || "",
        square_location_id: branch.square_location_id || "",
        square_environment: branch.square_environment || "production",
        athmovil_public_token: branch.athmovil_public_token || "",
        athmovil_ecommerce_id: branch.athmovil_ecommerce_id || "",
        // Order notification settings
        order_notification_method: branch.order_notification_method || "email",
        chowly_api_key: branch.chowly_api_key || "",
        chowly_location_id: branch.chowly_location_id || "",
        chowly_enabled: branch.chowly_enabled || false,
        square_kds_enabled: branch.square_kds_enabled || false,
        kds_access_token: branch.kds_access_token || "",
        selectedPackageIds: [] as string[],
      })
    } else {
      setEditingBranch(null)
      setBranchForm({
        name: "", slug: "", address: "", city: "", state: "", zip: "", phone: "", email: "",
        image_url: "", logo_url: "", delivery_fee: "", delivery_lead_time_hours: "", pickup_lead_time_hours: "",
        lead_time_hours: "", max_advance_days: "", min_delivery_order: "", min_pickup_order: "", shipday_api_key: "",
        tax_rate: "", tip_option_1: "", tip_option_2: "", tip_option_3: "",
        primary_color: "", design_template: "", standalone_domain: "",
        packages_section_title: "", show_service_packages: "",
        latitude: "", longitude: "", delivery_radius: "",
        delivery_enabled: true, pickup_enabled: true, is_active: true,
        area: "",
        payment_provider: "stripe",
        stripe_account_id: "",
        square_access_token: "",
        square_location_id: "",
        athmovil_public_token: "",
        athmovil_ecommerce_id: "",
        square_environment: "production",
        // Order notification settings
        order_notification_method: "email" as "email" | "kds" | "chowly" | "square_kds" | "multiple",
        chowly_api_key: "",
        chowly_location_id: "",
        chowly_enabled: false,
        square_kds_enabled: false,
        kds_access_token: "",
        selectedPackageIds: [] as string[],
      })
    }
    setBranchDialogOpen(true)

    // Load assigned packages for editing
    if (branch) {
      getBranchServicePackages(branch.id).then((ids) => {
        setBranchForm((prev) => ({ ...prev, selectedPackageIds: ids }))
      })
    }
  }

  const handleSaveBranch = async () => {
    try {
      const data: any = {
        name: branchForm.name, slug: branchForm.slug.toLowerCase().replace(/\s+/g, "-"),
        address: branchForm.address, city: branchForm.city, state: branchForm.state, zip: branchForm.zip,
        phone: branchForm.phone, email: branchForm.email || null,
        image_url: branchForm.image_url || null, logo_url: branchForm.logo_url || null,
        delivery_fee: branchForm.delivery_fee ? Number.parseFloat(branchForm.delivery_fee) : null,
        delivery_lead_time_hours: branchForm.delivery_lead_time_hours ? Number.parseInt(branchForm.delivery_lead_time_hours) : null,
        pickup_lead_time_hours: branchForm.pickup_lead_time_hours ? Number.parseInt(branchForm.pickup_lead_time_hours) : null,
        lead_time_hours: branchForm.lead_time_hours ? Number.parseInt(branchForm.lead_time_hours) : null,
        max_advance_days: branchForm.max_advance_days ? Number.parseInt(branchForm.max_advance_days) : null,
        min_delivery_order: branchForm.min_delivery_order ? Number.parseFloat(branchForm.min_delivery_order) : null,
        min_pickup_order: branchForm.min_pickup_order ? Number.parseFloat(branchForm.min_pickup_order) : null,
        shipday_api_key: branchForm.shipday_api_key || null,
        tax_rate: branchForm.tax_rate ? Number.parseFloat(branchForm.tax_rate) : null,
        tip_option_1: branchForm.tip_option_1 ? Number.parseFloat(branchForm.tip_option_1) : null,
        tip_option_2: branchForm.tip_option_2 ? Number.parseFloat(branchForm.tip_option_2) : null,
        tip_option_3: branchForm.tip_option_3 ? Number.parseFloat(branchForm.tip_option_3) : null,
        primary_color: branchForm.primary_color || null,
        design_template: branchForm.design_template || null,
        standalone_domain: branchForm.standalone_domain || null,
        packages_section_title: branchForm.packages_section_title || null,
        show_service_packages: branchForm.show_service_packages === "true" ? true : branchForm.show_service_packages === "false" ? false : null,
        latitude: branchForm.latitude ? Number.parseFloat(branchForm.latitude) : null,
        longitude: branchForm.longitude ? Number.parseFloat(branchForm.longitude) : null,
        delivery_radius: branchForm.delivery_radius ? Number.parseFloat(branchForm.delivery_radius) : null,
        delivery_enabled: branchForm.delivery_enabled, pickup_enabled: branchForm.pickup_enabled,
        is_active: branchForm.is_active,
        area: branchForm.area || null,
payment_provider: branchForm.payment_provider || "stripe",
      stripe_account_id: branchForm.stripe_account_id || null,
      square_access_token: branchForm.square_access_token || null,
      square_location_id: branchForm.square_location_id || null,
      square_environment: branchForm.square_environment || "production",
      athmovil_public_token: branchForm.athmovil_public_token || null,
      athmovil_ecommerce_id: branchForm.athmovil_ecommerce_id || null,
      // Order notification settings
      order_notification_method: branchForm.order_notification_method || "email",
      chowly_api_key: branchForm.chowly_api_key || null,
      chowly_location_id: branchForm.chowly_location_id || null,
      chowly_enabled: branchForm.chowly_enabled || false,
      square_kds_enabled: branchForm.square_kds_enabled || false,
      kds_access_token: branchForm.kds_access_token || null,
    }
    let branchId: string
      if (editingBranch) {
        await updateBranch(editingBranch.id, data)
        branchId = editingBranch.id
        toast({ title: "Sucursal actualizada" })
      } else {
        data.restaurant_id = restaurantId
        data.display_order = branches.length
        const newBranch = await createBranch(data)
        branchId = newBranch.id
        toast({ title: "Sucursal creada" })
      }

      // Save branch-specific package assignments
      await saveBranchServicePackages(branchId, branchForm.selectedPackageIds || [])

      setBranchDialogOpen(false)
      loadBranches()
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" })
    }
  }

  const handleDeleteBranch = async (id: string) => {
    if (!confirm("Estas seguro de eliminar esta sucursal?")) return
    try {
      await deleteBranch(id)
      toast({ title: "Sucursal eliminada" })
      loadBranches()
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" })
    }
  }

  const handleOpenOverrides = async (branch: any) => {
    setSelectedBranchForOverrides(branch)
    try {
      const overrides = await getBranchMenuOverrides(branch.id)
      setBranchOverrides(overrides)
    } catch (e) {
      setBranchOverrides([])
    }
    setBranchOverridesDialogOpen(true)
  }

  const handleToggleItemHidden = async (branchId: string, menuItemId: string, currentlyHidden: boolean) => {
    try {
      await upsertBranchMenuOverride({ branch_id: branchId, menu_item_id: menuItemId, is_hidden: !currentlyHidden })
      const overrides = await getBranchMenuOverrides(branchId)
      setBranchOverrides(overrides)
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" })
    }
  }

  const handleSetPriceOverride = async (branchId: string, menuItemId: string, price: string) => {
    try {
      const existing = branchOverrides.find((o: any) => o.menu_item_id === menuItemId)
      await upsertBranchMenuOverride({
        branch_id: branchId, menu_item_id: menuItemId,
        price_override: price ? Number.parseFloat(price) : null,
        is_hidden: existing?.is_hidden || false,
      })
      const overrides = await getBranchMenuOverrides(branchId)
      setBranchOverrides(overrides)
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" })
    }
  }

  const handleRemoveOverride = async (branchId: string, menuItemId: string) => {
    try {
      await deleteBranchMenuOverride(branchId, menuItemId)
      const overrides = await getBranchMenuOverrides(branchId)
      setBranchOverrides(overrides)
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              {isSuperAdmin && (
                <Link href="/super-admin" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline mb-1">
                  <ArrowRightLeft className="h-3 w-3" />
                  Super Admin Dashboard
                </Link>
              )}
              {isCSR && (
                <Link href="/csr/menus" className="inline-flex items-center gap-1 text-xs font-medium text-teal-600 hover:underline mb-1">
                  <ArrowRightLeft className="h-3 w-3" />
                  Volver a Seleccion de Restaurantes
                </Link>
              )}
              <h1 className="text-2xl font-bold">{restaurantName}</h1>
              <p className="text-sm text-gray-600 mt-1">{isCSR ? "CSR - Edicion de Menu" : "Restaurant Admin Panel"}</p>
            </div>
            <div className="flex items-center gap-2">
              {isSuperAdmin && (
                <Link href="/super-admin">
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Building className="h-4 w-4" />
                    Super Admin
                  </Button>
                </Link>
              )}
              <Button onClick={handleLogout} variant="outline">
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
    {isCSR ? (
              <TabsList className="grid w-full mb-8 grid-cols-1 max-w-xs">
                <TabsTrigger value="menu">Menu Items</TabsTrigger>
              </TabsList>
            ) : (
              <TabsList className={`grid w-full mb-8 ${settingsForm.is_chain ? "grid-cols-5 lg:grid-cols-10" : "grid-cols-5 lg:grid-cols-9"}`}>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="menu">Menu Items</TabsTrigger>
                {settingsForm.is_chain && <TabsTrigger value="branches">Sucursales</TabsTrigger>}
                <TabsTrigger value="packages">Service Packages</TabsTrigger>
                <TabsTrigger value="orders">Orders</TabsTrigger>
<TabsTrigger value="communications">Comunicaciones</TabsTrigger>
  <TabsTrigger value="access">Acceso</TabsTrigger>
  <TabsTrigger value="settings">Settings</TabsTrigger>
                <TabsTrigger value="kds">KDS</TabsTrigger>
                {isSuperAdmin && <TabsTrigger value="marketplace">Marketplace</TabsTrigger>}
              </TabsList>
            )}

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card className="p-6">
                <h3 className="text-sm font-medium text-gray-600 mb-2">Categories</h3>
                <p className="text-3xl font-bold text-[#5d1f1f]">{stats.categories}</p>
              </Card>
              <Card className="p-6">
                <h3 className="text-sm font-medium text-gray-600 mb-2">Menu Items</h3>
                <p className="text-3xl font-bold text-[#5d1f1f]">{stats.menuItems}</p>
              </Card>
              <Card className="p-6">
                <h3 className="text-sm font-medium text-gray-600 mb-2">Service Packages</h3>
                <p className="text-3xl font-bold text-[#5d1f1f]">{stats.servicePackages}</p>
              </Card>
              <Card className="p-6">
                <h3 className="text-sm font-medium text-gray-600 mb-2">Total Orders</h3>
                <p className="text-3xl font-bold text-[#5d1f1f]">{stats.orders}</p>
              </Card>
            </div>
          </TabsContent>

          {/* Menu Items Tab */}
          <TabsContent value="menu">
            <Card className="mb-6">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Categories</CardTitle>
                <div className="flex gap-2">
                  {selectedCategoryIds.length > 0 && (
                    <Button onClick={handleBulkDeleteCategories} variant="destructive" size="sm">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete {selectedCategoryIds.length} Selected
                    </Button>
                  )}
                  <Button
                    onClick={() => {
                      setEditingCategory(null)
                      setCategoryForm({ name: "", description: "", header_image_url: "", available_days: { sun: true, mon: true, tue: true, wed: true, thu: true, fri: true, sat: true } })
                      setShowCategoryModal(true)
                    }}
                    className="bg-[#5d1f1f] hover:bg-[#4a1818]"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Category
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">Drag to reorder categories</p>
                {categories.length > 0 && (
                  <div className="flex items-center gap-2 mb-3 pb-3 border-b">
                    <Checkbox
                      checked={selectedCategoryIds.length === categories.filter((c) => !c.is_virtual).length}
                      onCheckedChange={toggleAllCategories}
                    />
                    <span className="text-sm text-gray-600">Select All</span>
                  </div>
                )}
                <div className="space-y-3">
                  {categories
                    .filter((cat) => cat.id === "SERVICE_PACKAGES")
                    .map((category) => (
                      <div
                        key={category.id}
                        className="flex items-center justify-between p-3 border rounded-lg bg-blue-50"
                      >
                        <div className="flex items-center gap-4">
                          <span className="text-sm font-medium text-gray-900">{category.name}</span>
                          <span className="text-xs text-gray-500">(Virtual Category)</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">Active</span>
                            <Switch checked={category.is_active} onCheckedChange={handleServicePackagesToggle} />
                          </div>
                        </div>
                      </div>
                    ))}

                  {categories
                    .filter((cat) => cat.id !== "SERVICE_PACKAGES")
                    .map((category) => (
                      <div
                        key={category.id}
                        onDragOver={(e) => handleCategoryDragOver(e, category.id)}
                        className={`flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors ${
                          draggedCategoryIndex === categories.findIndex((cat) => cat.id === category.id)
                            ? "ring-2 ring-blue-500 bg-blue-50"
                            : ""
                        } ${!category.is_active ? "opacity-50 bg-gray-100 border-dashed" : ""}`}
                      >
                        <div className="flex items-center gap-4">
                          <GripVertical
                            className="h-5 w-5 text-gray-400 cursor-grab active:cursor-grabbing flex-shrink-0"
                            draggable
                            onDragStart={(e) => handleCategoryDragStart(e, category.id)}
                            onDragEnd={handleCategoryDragEnd}
                          />
                          <Checkbox
                            checked={selectedCategoryIds.includes(category.id)}
                            onCheckedChange={() => toggleCategorySelection(category.id)}
                          />
                          {category.header_image_url && (
                            <img
                              src={category.header_image_url || "/placeholder.svg"}
                              alt={category.name}
                              className="w-24 h-12 object-cover rounded"
                            />
                          )}
                          <div>
                            <h4 className="font-medium">{category.name}</h4>
                            {category.description && <p className="text-sm text-gray-500">{category.description}</p>}
                            {!category.header_image_url && (
                              <p className="text-xs text-gray-400 italic">No header image</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <span className="text-sm text-gray-600">Active</span>
                            <Switch
                              checked={category.is_active}
                              onCheckedChange={async (checked) => {
                                try {
                                  const result = await updateCategory(category.id, { is_active: checked })
                                  await loadCategories()
                                  toast({
                                    title: "Success",
                                    description: `Category ${category.name} ${checked ? "activated" : "deactivated"}`,
                                  })
                                } catch (error) {
                                  toast({
                                    title: "Error",
                                    description: "Failed to update category status",
                                    variant: "destructive",
                                  })
                                }
                              }}
                            />
                          </label>
                          <Button variant="outline" size="sm" onClick={() => handleEditCategory(category)}>
                            <Pencil className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleDeleteCategory(category.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Menu Items</CardTitle>
                <div className="flex gap-2">
                  {selectedMenuItemIds.length > 0 && (
                    <Button onClick={handleBulkDeleteMenuItems} variant="destructive" size="sm">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete {selectedMenuItemIds.length} Selected
                    </Button>
                  )}
                  {/* CHANGE> Fix modal state variable mismatch - button uses showCSVModal but modal uses showBulkImportModal */}
                  <Button onClick={() => setShowBulkImportModal(true)} variant="outline">
                    <Upload className="h-4 w-4 mr-2" />
                    Bulk Import
                  </Button>
                  <Button onClick={() => setShowMenuItemModal(true)} className="bg-[#5d1f1f] hover:bg-[#4a1818]">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Menu Item
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {menuItems.length > 0 && (
                  <div className="flex items-center gap-2 mb-3 pb-3 border-b">
                    <Checkbox
                      checked={selectedMenuItemIds.length === menuItems.length}
                      onCheckedChange={toggleAllMenuItems}
                    />
                    <span className="text-sm text-gray-600">Select All</span>
                  </div>
                )}
                <div className="space-y-6">
                  {categories.map((category) => {
                    const categoryItems = menuItems.filter((item) => item.category_id === category.id)
                    if (categoryItems.length === 0) return null

                    return (
                      <div key={category.id}>
                        <h3 className="text-lg font-semibold mb-3 text-[#5d1f1f]">{category.name}</h3>
                        <div className="space-y-4">
                          {categoryItems.map((item, index) => {
                            // Find the global index for drag-and-drop state management
                            const globalIndex = menuItems.findIndex((mi) => mi.id === item.id)
                            return (
                              <Card
                                key={item.id}
                                draggable
                                onDragStart={(e) => handleMenuItemDragStart(e, globalIndex)}
                                onDragOver={(e) => handleMenuItemDragOver(e, globalIndex)}
                                onDragEnd={handleMenuItemDragEnd}
                                className={`cursor-move hover:shadow-md transition-shadow ${
                                  draggedMenuItemIndex === globalIndex ? "ring-2 ring-blue-500 bg-blue-50" : ""
                                }`}
                              >
                                <CardContent className="p-4">
                                  <div className="flex gap-4">
                                    <GripVertical className="h-5 w-5 text-gray-400 mt-2 flex-shrink-0" />
                                    {item.image_url && (
                                      <img
                                        src={item.image_url || "/placeholder.svg"}
                                        alt={item.name}
                                        className="w-20 h-20 object-cover rounded"
                                      />
                                    )}
                                    <div className="flex-1">
                                      <div className="flex items-start justify-between">
                                        <div>
                                          <div className="flex items-center gap-2">
                                            <h3 className="font-semibold">{item.name}</h3>
                                            {!item.is_active && <Badge variant="secondary">Inactive</Badge>}
                                          </div>
                                          <p className="text-sm text-gray-600">{item.description}</p>
                                          <div className="text-lg font-bold text-[#5d1f1f] mt-1">
                                            ${item.price.toFixed(2)}
                                            {item.pricing_unit && item.pricing_unit !== "each" && (
                                              <span className="text-sm font-normal text-gray-500">
                                                {" "}/ {getAdminDisplayLabel(item.pricing_unit)}

                                                {item.pricing_unit !== "cena_completa" && item.min_quantity ? ` (Min: ${item.min_quantity})` : ""}
                                              </span>
                                            )}
                                          </div>
                                          {item.serves && <p className="text-sm text-gray-500">Sirve {item.serves} personas</p>}
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <div className="flex items-center gap-2">
                                            <span className="text-sm">{item.is_active ? "Active" : "Inactive"}</span>
                                            <Switch
                                              checked={item.is_active}
                                              onCheckedChange={() =>
                                                handleToggleMenuItemActive(item.id, item.is_active)
                                              }
                                            />
                                          </div>
                                        </div>
                                      </div>
                                      {/* Day & Daypart Availability */}
                                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                                        {/* Daypart Dropdown */}
                                        <select
                                          value={item.availability_daypart || "all"}
                                          onChange={async (e) => {
                                            const newDaypart = e.target.value as AvailabilityDaypart
                                            try {
                                              await updateMenuItem(item.id, { availability_daypart: newDaypart })
                                              setMenuItems(prev => prev.map(mi => mi.id === item.id ? { ...mi, availability_daypart: newDaypart } : mi))
                                            } catch (error) {
                                              toast({ title: "Error", description: "Failed to update daypart", variant: "destructive" })
                                            }
                                          }}
                                          className="text-xs border border-gray-200 rounded px-1.5 py-0.5 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-amber-500"
                                        >
                                          <option value="all">All Day</option>
                                          <option value="breakfast_lunch">Breakfast & Lunch</option>
                                          <option value="breakfast_dinner">Breakfast & Dinner</option>
                                          <option value="lunch_dinner">Lunch & Dinner</option>
                                          <option value="breakfast">Breakfast Only</option>
                                          <option value="lunch">Lunch Only</option>
                                          <option value="dinner">Dinner Only</option>
                                        </select>
                                        
                                        {/* Day Checkboxes */}
                                        <div className="flex items-center gap-1 flex-wrap">
                                          {(["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const).map((day) => {
                                            const dayLabels = { sun: "D", mon: "L", tue: "M", wed: "W", thu: "J", fri: "V", sat: "S" }
                                            const availableDays = item.available_days || { sun: true, mon: true, tue: true, wed: true, thu: true, fri: true, sat: true }
                                            const isChecked = availableDays[day] !== false
                                            return (
                                              <label
                                                key={day}
                                                title={({ sun: "Domingo", mon: "Lunes", tue: "Martes", wed: "Miercoles", thu: "Jueves", fri: "Viernes", sat: "Sabado" } as const)[day]}
                                                className={`inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-medium cursor-pointer transition-colors ${
                                                  isChecked ? "bg-emerald-500 text-white" : "bg-gray-200 text-gray-400"
                                                }`}
                                              >
                                                <input
                                                  type="checkbox"
                                                  checked={isChecked}
                                                  onChange={async (e) => {
                                                    const newDays = { ...availableDays, [day]: e.target.checked }
                                                    try {
                                                      await updateMenuItem(item.id, { available_days: newDays })
                                                      setMenuItems(prev => prev.map(mi => mi.id === item.id ? { ...mi, available_days: newDays } : mi))
                                                    } catch (error) {
                                                      toast({ title: "Error", description: "Failed to update availability", variant: "destructive" })
                                                    }
                                                  }}
                                                  className="sr-only"
                                                />
                                                {dayLabels[day]}
                                              </label>
                                            )
                                          })}
                                        </div>
                                      </div>
                                      <div className="flex gap-2 mt-3">
                                        <Button 
                                          size="sm" 
                                          variant="outline" 
                                          onClick={() => handleManageOptions(item)}
                                          className={item.option_count > 0 ? "border-green-500 text-green-700" : ""}
                                        >
                                          <Settings className="h-3 w-3 mr-1" />
                                          Options
                                          {item.option_count > 0 && (
                                            <span className="ml-1.5 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                                              {item.option_count}
                                            </span>
                                          )}
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={() => handleManageSizes(item)}>
                                          <Settings className="h-3 w-3 mr-1" />
                                          Sizes
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={() => handleEditMenuItem(item)}>
                                          <Pencil className="h-3 w-3 mr-1" />
                                          Edit
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleDeleteMenuItem(item.id)}
                                        >
                                          <Trash2 className="h-3 w-3 mr-1" />
                                          Delete
                                        </Button>
                                        {/* Checkbox for bulk selection */}
                                        <input
                                          type="checkbox"
                                          checked={selectedMenuItemIds.includes(item.id)}
                                          onChange={() => toggleMenuItemSelection(item.id)}
                                          className="form-checkbox h-4 w-4 text-blue-600"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Branches Tab */}
          {settingsForm.is_chain && (
            <TabsContent value="branches" className="space-y-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2"><Building className="h-5 w-5" /> Sucursales</CardTitle>
                    <CardDescription>Administra las sucursales de esta cadena</CardDescription>
                  </div>
                  <Button onClick={() => handleOpenBranchDialog()} className="bg-[#5d1f1f] hover:bg-[#4a1818]">
                    <Plus className="h-4 w-4 mr-2" /> Agregar Sucursal
                  </Button>
                </CardHeader>
                <CardContent>
                  {branches.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Building className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No hay sucursales. Agrega la primera sucursal para comenzar.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {branches.map((branch) => (
                        <div key={branch.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                          <div className="flex items-center gap-4">
                            {branch.image_url ? (
                              <img src={branch.image_url} alt={branch.name} className="w-14 h-14 rounded-lg object-cover" />
                            ) : (
                              <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center">
                                <Building className="h-6 w-6 text-muted-foreground" />
                              </div>
                            )}
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">{branch.name}</span>
                                {!branch.is_active && <Badge variant="secondary">Inactiva</Badge>}
                              </div>
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
  <MapPin className="h-3 w-3" />
  {branch.city}{branch.state ? `, ${branch.state}` : ""}{branch.area ? ` - ${branch.area}` : ""}
  </div>
                              {branch.phone && (
                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                  <Phone className="h-3 w-3" />
                                  {branch.phone}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleOpenOverrides(branch)}>
                              Menu
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleOpenBranchDialog(branch)}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleDeleteBranch(branch.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Service Packages Tab */}
          <TabsContent value="packages">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Service Packages</CardTitle>
                <Button
                  onClick={() => {
                    setEditingPackage(null)
                    resetPackageForm()
                    setShowPackageModal(true)
                  }}
                  className="bg-[#5d1f1f] hover:bg-[#4a1818]"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Service Package
                </Button>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">Drag to reorder service packages</p>
                <div className="space-y-4">
                  {servicePackages.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">
                      No service packages yet. Click "Add Service Package" to create one.
                    </p>
                  ) : (
                    servicePackages.map((pkg, index) => (
                      <Card
                        key={pkg.id}
                        draggable
                        onDragStart={(e) => handlePackageDragStart(e, index)}
                        onDragOver={(e) => handlePackageDragOver(e, index)}
                        onDragEnd={handlePackageDragEnd}
                        className={`cursor-move hover:shadow-md transition-shadow ${
                          draggedPackageIndex === index ? "ring-2 ring-blue-500 bg-blue-50" : ""
                        }`}
                      >
                        <CardContent className="p-4">
                          <div className="flex gap-4">
                            <GripVertical className="h-5 w-5 text-gray-400 mt-2 flex-shrink-0" />
                            {pkg.image_url && (
                              <img
                                src={pkg.image_url || "/placeholder.svg"}
                                alt={pkg.name}
                                className="w-20 h-20 object-cover rounded"
                              />
                            )}
                            <div className="flex-1">
                              <div className="flex items-start justify-between">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h3 className="font-semibold">{pkg.name}</h3>
                                    {!pkg.is_active && <Badge variant="secondary">Inactive</Badge>}
                                  </div>
                                  <p className="text-sm text-gray-600">{pkg.description}</p>
                                  <p className="text-lg font-bold text-[#5d1f1f] mt-1">${pkg.base_price.toFixed(2)}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm">{pkg.is_active ? "Active" : "Inactive"}</span>
                                    <Switch
                                      checked={pkg.is_active}
                                      onCheckedChange={() => handleToggleServicePackage(pkg.id, pkg.is_active)}
                                    />
                                  </div>
                                  <Button size="sm" variant="outline" onClick={() => handleEditPackage(pkg)}>
                                    <Pencil className="h-3 w-3 mr-1" />
                                    Edit
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => handleDeletePackage(pkg.id)}>
                                    <Trash2 className="h-3 w-3 mr-1" />
                                    Delete
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders">
            {(() => {
const deliveryOrders = orders.filter((o: any) => o.order_type === "delivery" || o.delivery_type === "delivery")
const pickupOrders = orders.filter((o: any) => o.order_type === "pickup" || o.delivery_type === "pickup")
              const allOrders = orders
              const sumField = (arr: any[], field: string) => arr.reduce((s: number, o: any) => s + (Number(o[field]) || 0), 0)

              // Phone order mode
              if (showPhoneOrder) {
                return (
                  <div className="space-y-4">
                    <PhoneOrderForm
                      restaurantId={restaurantId}
                      menuItems={menuItems}
                      branches={branches}
                      taxRate={Number(settingsForm.tax_rate) || 0}
                      onClose={() => setShowPhoneOrder(false)}
                    />
                  </div>
                )
              }

              // Helper: get the date key for an order (delivery_date preferred, else created_at)
              const getOrderDateKey = (order: any): string => {
                if (order.delivery_date) return order.delivery_date
                return new Date(order.created_at).toISOString().split("T")[0]
              }

              // Build a map of date -> orders for the calendar
              const ordersByDate: Record<string, any[]> = {}
              for (const order of allOrders) {
                const key = getOrderDateKey(order)
                if (!ordersByDate[key]) ordersByDate[key] = []
                ordersByDate[key].push(order)
              }

              // Calendar helpers
              const calYear = calendarMonth.getFullYear()
              const calMonthIdx = calendarMonth.getMonth()
              const firstDayOfMonth = new Date(calYear, calMonthIdx, 1)
              const lastDayOfMonth = new Date(calYear, calMonthIdx + 1, 0)
              const startDayOfWeek = firstDayOfMonth.getDay()
              const daysInMonth = lastDayOfMonth.getDate()

              const todayStr = new Date().toISOString().split("T")[0]
              const monthLabel = calendarMonth.toLocaleDateString("es-PR", { month: "long", year: "numeric" })

              // Build calendar grid cells
              const calendarCells: Array<{ day: number; dateStr: string } | null> = []
              for (let i = 0; i < startDayOfWeek; i++) calendarCells.push(null)
              for (let d = 1; d <= daysInMonth; d++) {
                const dateStr = `${calYear}-${String(calMonthIdx + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`
                calendarCells.push({ day: d, dateStr })
              }

              // Orders for selected day
              const selectedDayOrders = selectedCalendarDay ? (ordersByDate[selectedCalendarDay] || []) : []

              // Monthly totals for the visible month
              const monthOrders = allOrders.filter((o) => {
                const key = getOrderDateKey(o)
                return key.startsWith(`${calYear}-${String(calMonthIdx + 1).padStart(2, "0")}`)
              })

              return (
                <div className="space-y-6">
                  {/* Top bar: View toggle + Branch Filter + Nueva Orden */}
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
                        <Button
                          variant={ordersView === "list" ? "default" : "ghost"}
                          size="sm"
                          className="gap-1.5"
                          onClick={() => { setOrdersView("list"); setSelectedCalendarDay(null) }}
                        >
                          <List className="h-4 w-4" />
                          Lista
                        </Button>
                        <Button
                          variant={ordersView === "calendar" ? "default" : "ghost"}
                          size="sm"
                          className="gap-1.5"
                          onClick={() => setOrdersView("calendar")}
                        >
                          <CalendarDays className="h-4 w-4" />
                          Calendario
                        </Button>
                      </div>
                      
                      {/* Branch Filter */}
                      {branches.length > 1 && (
                        <Select
                          value={selectedBranchFilter || "all"}
                          onValueChange={(val) => setSelectedBranchFilter(val === "all" ? null : val)}
                        >
                          <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Filtrar por sucursal" />
                          </SelectTrigger>
                          <SelectContent>
                            {isSuperAdmin && <SelectItem value="all">Todas las Sucursales</SelectItem>}
                            {branches.map((branch) => (
                              <SelectItem key={branch.id} value={branch.id}>
                                {branch.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    <Button onClick={() => setShowPhoneOrder(true)} className="gap-2">
                      <Phone className="w-4 h-4" />
                      Nueva Orden (Telefono)
                    </Button>
                  </div>

                  {/* Financial Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">
                          {ordersView === "calendar" ? `Pedidos en ${monthLabel}` : "Todos los Pedidos"}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-2xl font-bold">{ordersView === "calendar" ? monthOrders.length : allOrders.length}</p>
                        <div className="mt-2 space-y-1 text-sm text-gray-600">
                          <div className="flex justify-between"><span>Subtotal Comida</span><span>${sumField(ordersView === "calendar" ? monthOrders : allOrders, "food_subtotal").toFixed(2)}</span></div>
                          <div className="flex justify-between"><span>Servicio</span><span>${sumField(ordersView === "calendar" ? monthOrders : allOrders, "service_revenue").toFixed(2)}</span></div>
                          <div className="flex justify-between font-medium"><span>Total</span><span>${sumField(ordersView === "calendar" ? monthOrders : allOrders, "total").toFixed(2)}</span></div>
                          <div className="flex justify-between text-green-700 font-medium border-t pt-1"><span>Pago al Restaurante</span><span>${sumField(ordersView === "calendar" ? monthOrders : allOrders, "restaurant_payout").toFixed(2)}</span></div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="border-blue-200">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-blue-600">Delivery</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-2xl font-bold text-blue-700">{(ordersView === "calendar" ? monthOrders : deliveryOrders).filter((o: any) => o.order_type === "delivery" || o.delivery_type === "delivery").length}</p>
                        <div className="mt-2 space-y-1 text-sm text-gray-600">
                          <div className="flex justify-between"><span>Subtotal Comida</span><span>${sumField((ordersView === "calendar" ? monthOrders : deliveryOrders).filter((o: any) => o.order_type === "delivery" || o.delivery_type === "delivery"), "food_subtotal").toFixed(2)}</span></div>
                          <div className="flex justify-between font-medium"><span>Total</span><span>${sumField((ordersView === "calendar" ? monthOrders : deliveryOrders).filter((o: any) => o.order_type === "delivery" || o.delivery_type === "delivery"), "total").toFixed(2)}</span></div>
                          <div className="flex justify-between text-green-700 font-medium border-t pt-1"><span>Pago al Restaurante</span><span>${sumField((ordersView === "calendar" ? monthOrders : deliveryOrders).filter((o: any) => o.order_type === "delivery" || o.delivery_type === "delivery"), "restaurant_payout").toFixed(2)}</span></div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="border-amber-200">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-amber-600">Pick-Up</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-2xl font-bold text-amber-700">{(ordersView === "calendar" ? monthOrders : pickupOrders).filter((o: any) => o.order_type === "pickup" || o.delivery_type === "pickup").length}</p>
                        <div className="mt-2 space-y-1 text-sm text-gray-600">
                          <div className="flex justify-between"><span>Subtotal Comida</span><span>${sumField((ordersView === "calendar" ? monthOrders : pickupOrders).filter((o: any) => o.order_type === "pickup" || o.delivery_type === "pickup"), "food_subtotal").toFixed(2)}</span></div>
                          <div className="flex justify-between font-medium"><span>Total</span><span>${sumField((ordersView === "calendar" ? monthOrders : pickupOrders).filter((o: any) => o.order_type === "pickup" || o.delivery_type === "pickup"), "total").toFixed(2)}</span></div>
                          <div className="flex justify-between text-green-700 font-medium border-t pt-1"><span>Pago al Restaurante</span><span>${sumField((ordersView === "calendar" ? monthOrders : pickupOrders).filter((o: any) => o.order_type === "pickup" || o.delivery_type === "pickup"), "restaurant_payout").toFixed(2)}</span></div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* ===== CALENDAR VIEW ===== */}
                  {ordersView === "calendar" && (
                    <div className="space-y-4">
                      {/* Month navigation */}
                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between mb-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCalendarMonth(new Date(calYear, calMonthIdx - 1, 1))}
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <div className="flex items-center gap-3">
                              <h3 className="text-lg font-semibold capitalize">{monthLabel}</h3>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs"
                                onClick={() => {
                                  setCalendarMonth(new Date())
                                  setSelectedCalendarDay(todayStr)
                                }}
                              >
                                Hoy
                              </Button>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCalendarMonth(new Date(calYear, calMonthIdx + 1, 1))}
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>

                          {/* Day-of-week headers */}
                          <div className="grid grid-cols-7 gap-px mb-1">
                            {["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"].map((d) => (
                              <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-2">{d}</div>
                            ))}
                          </div>

                          {/* Calendar grid */}
                          <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
                            {calendarCells.map((cell, idx) => {
                              if (!cell) {
                                return <div key={`empty-${idx}`} className="bg-muted/30 min-h-[80px]" />
                              }
                              const dayOrders = ordersByDate[cell.dateStr] || []
                              const dayTotal = dayOrders.reduce((s: number, o: any) => s + (Number(o.total) || 0), 0)
                              const isToday = cell.dateStr === todayStr
                              const isSelected = cell.dateStr === selectedCalendarDay
                              const hasOrders = dayOrders.length > 0

                              return (
                                <button
                                  key={cell.dateStr}
                                  className={`min-h-[80px] p-1.5 text-left transition-colors relative flex flex-col ${
                                    isSelected
                                      ? "bg-primary/10 ring-2 ring-primary ring-inset"
                                      : hasOrders
                                        ? "bg-background hover:bg-accent"
                                        : "bg-background hover:bg-accent/50"
                                  }`}
                                  onClick={() => setSelectedCalendarDay(isSelected ? null : cell.dateStr)}
                                >
                                  <span className={`text-xs font-medium inline-flex items-center justify-center w-6 h-6 rounded-full ${
                                    isToday ? "bg-primary text-primary-foreground" : "text-foreground"
                                  }`}>
                                    {cell.day}
                                  </span>
                                  {hasOrders && (
                                    <div className="mt-auto space-y-0.5">
                                      <div className="flex items-center gap-1">
                                        <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-1 py-0.5 rounded">
                                          {dayOrders.length} {dayOrders.length === 1 ? "orden" : "ordenes"}
                                        </span>
                                      </div>
                                      <p className="text-[10px] font-medium text-green-700">${dayTotal.toFixed(0)}</p>
                                    </div>
                                  )}
                                </button>
                              )
                            })}
                          </div>
                        </CardContent>
                      </Card>

                      {/* Daily detail view */}
                      {selectedCalendarDay && (
                        <Card>
                          <CardHeader className="flex flex-row items-center justify-between pb-3">
                            <div>
                              <CardTitle className="text-base">
                                Ordenes del {new Date(selectedCalendarDay + "T12:00:00").toLocaleDateString("es-PR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                              </CardTitle>
                              <CardDescription>
                                {selectedDayOrders.length} {selectedDayOrders.length === 1 ? "orden" : "ordenes"} &middot; Total: ${selectedDayOrders.reduce((s: number, o: any) => s + (Number(o.total) || 0), 0).toFixed(2)}
                              </CardDescription>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => setSelectedCalendarDay(null)}>
                              Cerrar
                            </Button>
                          </CardHeader>
                          <CardContent>
                            {selectedDayOrders.length === 0 ? (
                              <p className="text-center text-muted-foreground py-6">No hay ordenes para este dia.</p>
                            ) : (
                              <div className="space-y-3">
                                {selectedDayOrders.map((order: any) => (
                                  <div key={order.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="font-semibold text-sm">#{order.order_number || order.id?.slice(0, 8)}</span>
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                                          (order.order_type || order.delivery_type) === "delivery" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"
                                        }`}>
                                          {(order.order_type || order.delivery_type) === "delivery" ? "Delivery" : "Pick-Up"}
                                        </span>
                                        {order.order_source === "phone" && (
                                          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-purple-100 text-purple-700">Tel</span>
                                        )}
                                      </div>
                                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                        {order.customer_name || "Cliente"} &middot; {order.customer_phone || ""} {order.delivery_address ? ` &middot; ${order.delivery_address}` : ""}
                                      </p>
                                    </div>
                                    <div className="text-right shrink-0 ml-3">
                                      <p className="font-semibold text-sm">${Number(order.total || 0).toFixed(2)}</p>
                                      {order.restaurant_payout > 0 && (
                                        <p className="text-[10px] text-green-700">Pago: ${Number(order.restaurant_payout).toFixed(2)}</p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  )}

                  {/* ===== LIST VIEW ===== */}
                  {ordersView === "list" && (
                    <>
                  {/* Order Type Filter */}
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle>Pedidos</CardTitle>
                      <div className="flex gap-2">
                        <Button variant={orderTypeFilter === "all" ? "default" : "outline"} size="sm" onClick={() => setOrderTypeFilter("all")}>
                          Todos ({allOrders.length})
                        </Button>
                        <Button variant={orderTypeFilter === "delivery" ? "default" : "outline"} size="sm" className={orderTypeFilter === "delivery" ? "bg-blue-600 hover:bg-blue-700" : ""} onClick={() => setOrderTypeFilter("delivery")}>
                          Delivery ({deliveryOrders.length})
                        </Button>
                        <Button variant={orderTypeFilter === "pickup" ? "default" : "outline"} size="sm" className={orderTypeFilter === "pickup" ? "bg-amber-600 hover:bg-amber-700" : ""} onClick={() => setOrderTypeFilter("pickup")}>
                          Pick-Up ({pickupOrders.length})
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {(orderTypeFilter === "all" ? allOrders : orderTypeFilter === "delivery" ? deliveryOrders : pickupOrders).map((order: any) => (
                          <Card key={order.id}>
                            <CardContent className="p-4">
                              <div className="flex gap-4">
                                <div className="flex-1">
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <h3 className="font-semibold">Pedido #{order.id?.slice(0, 8)}</h3>
<span className={`text-xs px-2 py-0.5 rounded-full font-medium ${(order.order_type === "delivery" || order.delivery_type === "delivery") ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>
{(order.order_type === "delivery" || order.delivery_type === "delivery") ? "Delivery" : "Pick-Up"}
                                        </span>
                                        {order.order_source === "phone" && (
                                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-purple-100 text-purple-700">
                                            Telefono
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-sm text-gray-600">
                                        {order.customer_name || "Cliente"} - {new Date(order.created_at).toLocaleString()}
                                      </p>
                                    </div>
                                    <div className="text-right">
                                      <p className="font-semibold">${Number(order.total || 0).toFixed(2)}</p>
                                      {order.restaurant_discount_percent > 0 && (
                                        <p className="text-xs text-gray-500">Descuento: {order.restaurant_discount_percent}%</p>
                                      )}
                                      {order.restaurant_payout > 0 && (
                                        <p className="text-xs text-green-700">Pago: ${Number(order.restaurant_payout).toFixed(2)}</p>
                                      )}
                                    </div>
                                  </div>
{/* Shipday Button -- visible for delivery orders */}
  {(order.order_type === "delivery" || order.delivery_type === "delivery") && (
  <div className="mt-2 pt-2 border-t flex items-center gap-2">
  <Button
  variant="outline"
  size="sm"
  className="gap-1.5 text-xs"
  disabled={shipdayTestStatus === "testing"}
  onClick={async () => {
    setShipdayTestStatus("testing")
    setShipdayTestMessage("Sending to Shipday...")
    try {
      const res = await fetch("/api/shipday/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId: restaurant.id,
          orderId: order.id,
          mode: "send",
        }),
      })
      const data = await res.json()
      if (data.success) {
        setShipdayTestStatus("success")
        setShipdayTestMessage(`Sent! Shipday ID: ${data.shipdayOrderId}`)
        toast({ title: "Shipday", description: `Order sent to Shipday. ID: ${data.shipdayOrderId}` })
      } else {
        setShipdayTestStatus("error")
        setShipdayTestMessage(data.error || "Failed")
        toast({ title: "Shipday Error", description: data.error || "Failed to send to Shipday", variant: "destructive" })
      }
    } catch (err) {
      setShipdayTestStatus("error")
      setShipdayTestMessage(err instanceof Error ? err.message : "Error")
      toast({ title: "Shipday Error", description: "Failed to connect to Shipday", variant: "destructive" })
    }
  }}
  >
  <Truck className="h-3.5 w-3.5" />
  {shipdayTestStatus === "testing" ? "Sending..." : "Send to Shipday"}
  </Button>
  {shipdayTestStatus === "success" && <span className="text-xs text-green-600">{shipdayTestMessage}</span>}
  {shipdayTestStatus === "error" && <span className="text-xs text-red-600">{shipdayTestMessage}</span>}
  </div>
  )}
  {/* Edit & Transfer Buttons */}
  <div className="mt-2 pt-2 border-t flex items-center gap-2 flex-wrap">
    {/* Edit Order Button -- only visible when viewing from the original branch where order was placed */}
    {(selectedBranchFilter === order.original_branch_id || 
      (!selectedBranchFilter && order.original_branch_id === order.branch_id) ||
      isSuperAdmin) && (
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 text-xs"
        onClick={() => {
          setEditingOrder(order)
          setEditOrderItems(order.items || [])
        }}
      >
        <Pencil className="h-3.5 w-3.5" />
        Editar Orden
      </Button>
    )}
    {/* Transfer Button -- visible when multiple branches exist */}
    {branches.length > 1 && (
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 text-xs"
        onClick={() => setTransferDialog({ open: true, orderId: order.id, targetBranchId: "", reason: "" })}
      >
        <ArrowRightLeft className="h-3.5 w-3.5" />
        Transferir Sucursal
      </Button>
    )}
  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                        {orders.length === 0 && (
                          <p className="text-center text-gray-500 py-8">No hay pedidos todavia.</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                    </>
                  )}
                </div>
              )
            })()}
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Restaurant Settings
                </CardTitle>
                <CardDescription>Configure your restaurant's operational settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="border-b pb-6">
                  <Label className="text-base font-semibold">Design Template</Label>
                  <p className="text-sm text-gray-500 mb-4">Choose a visual style for your customer portal</p>

                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {(Object.keys(TEMPLATE_INFO) as DesignTemplate[]).map((template) => (
                      <TemplatePreview
                        key={template}
                        template={template}
                        isSelected={settingsForm.design_template === template}
                        onSelect={() => setSettingsForm({ ...settingsForm, design_template: template })}
                      />
                    ))}
                  </div>
                </div>

                {/* Branding & Domain section */}
                <div className="border-b pb-6">
                  <Label className="text-base font-semibold">Branding & Domain</Label>
                  <p className="text-sm text-gray-500 mb-4">Customize your restaurant's appearance and custom domain</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <Label>Restaurant Name</Label>
                      <Input
                        placeholder="Your Restaurant Name"
                        value={settingsForm.name || ""}
                        onChange={(e) => setSettingsForm({ ...settingsForm, name: e.target.value })}
                        className="mt-1"
                      />
                      <p className="text-xs text-gray-500 mt-1">Displayed in the header and throughout the site</p>
                    </div>
                    <div>
  <ImageUpload
  label="Logo del Marketplace (cuadrado)"
  value={settingsForm.logo_url || ""}
  onChange={(url) => setSettingsForm({ ...settingsForm, logo_url: url })}
  onRemove={() => setSettingsForm({ ...settingsForm, logo_url: "" })}
  />
  <p className="text-xs text-gray-500 mt-1">Logo cuadrado usado en el tile del marketplace. Recomendado: 200x200px.</p>
  </div>
  <div>
  <ImageUpload
  label="Logo del Banner (rectangular)"
  value={settingsForm.banner_logo_url || ""}
  onChange={(url) => setSettingsForm({ ...settingsForm, banner_logo_url: url })}
  onRemove={() => setSettingsForm({ ...settingsForm, banner_logo_url: "" })}
  />
  <p className="text-xs text-gray-500 mt-1">Logo rectangular para la barra superior del portal. Si no se sube, se mostrara el nombre del restaurante en texto. Recomendado: 400x100px.</p>
  </div>
  </div>

                  <div>
                    <ImageUpload
                      label="Hero Image (Branch Selector Background)"
                      value={settingsForm.hero_image_url || ""}
                      onChange={(url) => setSettingsForm({ ...settingsForm, hero_image_url: url })}
                      onRemove={() => setSettingsForm({ ...settingsForm, hero_image_url: "" })}
                    />
                    <p className="text-xs text-gray-500 mt-1">Full-width background image shown on the branch/location selector page. Recommended: 1920x1080 or larger.</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="hide_branch_selector_title"
                      checked={settingsForm.hide_branch_selector_title}
                      onChange={(e) => setSettingsForm({ ...settingsForm, hide_branch_selector_title: e.target.checked })}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <Label htmlFor="hide_branch_selector_title" className="cursor-pointer">
                      Hide restaurant name text on branch selector
                    </Label>
                    <p className="text-xs text-gray-500 ml-1">(when logos are already displayed above)</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Primary Brand Color</Label>
                      <div className="flex gap-2 items-center mt-1">
                        <input
                          type="color"
                          value={settingsForm.primary_color || "#6B1F1F"}
                          onChange={(e) => setSettingsForm({ ...settingsForm, primary_color: e.target.value })}
                          className="w-12 h-10 rounded border cursor-pointer"
                        />
                        <Input
                          value={settingsForm.primary_color || "#6B1F1F"}
                          onChange={(e) => setSettingsForm({ ...settingsForm, primary_color: e.target.value })}
                          placeholder="#6B1F1F"
                          className="flex-1"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Used for buttons, accents, and highlights</p>
                    </div>
                    <div>
                      <Label>Custom Domain</Label>
                      <Input
                        placeholder="yourdomain.com"
                        value={settingsForm.standalone_domain || ""}
                        onChange={(e) => setSettingsForm({ ...settingsForm, standalone_domain: e.target.value })}
                        className="mt-1"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Enter your custom domain (without www or https). Add this domain in Vercel project settings.
                      </p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <Label>Packages Section Title</Label>
                    <Input
                      placeholder="Service Packages"
                      value={settingsForm.packages_section_title || ""}
                      onChange={(e) => setSettingsForm({ ...settingsForm, packages_section_title: e.target.value })}
                      className="mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Customize the heading for the packages section in checkout (e.g., "Service Packages", "Optional
                      Add-ons")
                    </p>
                  </div>
                </div>

                {/* Restaurant Address */}
                <div>
                  <Label className="text-base font-semibold">Order Notification Emails</Label>
                  <p className="text-sm text-gray-500 mb-3">Orders will be sent to these email addresses (up to 5)</p>
                  <div className="space-y-2">
                    {(settingsForm.email || "").split(",").filter(Boolean).map((emailAddr, idx, arr) => (
                      <div key={idx} className="flex gap-2">
                        <Input
                          type="email"
                          placeholder="orders@myrestaurant.com"
                          value={emailAddr.trim()}
                          onChange={(e) => {
                            const emails = (settingsForm.email || "").split(",").filter(Boolean).map(s => s.trim())
                            emails[idx] = e.target.value
                            setSettingsForm({ ...settingsForm, email: emails.join(",") })
                          }}
                        />
                        {arr.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 px-2 text-red-500 hover:text-red-700"
                            onClick={() => {
                              const emails = (settingsForm.email || "").split(",").filter(Boolean).map(s => s.trim())
                              emails.splice(idx, 1)
                              setSettingsForm({ ...settingsForm, email: emails.join(",") })
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    {/* Show empty input if no emails yet */}
                    {!(settingsForm.email || "").split(",").filter(Boolean).length && (
                      <Input
                        type="email"
                        placeholder="orders@myrestaurant.com"
                        value=""
                        onChange={(e) => setSettingsForm({ ...settingsForm, email: e.target.value })}
                      />
                    )}
                    {(settingsForm.email || "").split(",").filter(Boolean).length < 5 && (settingsForm.email || "").split(",").filter(Boolean).length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          const current = settingsForm.email || ""
                          setSettingsForm({ ...settingsForm, email: current ? current + "," : "" })
                        }}
                      >
                        <Plus className="h-3 w-3 mr-1" /> Add Another Email
                      </Button>
                    )}
                  </div>
                </div>
                <div>
                  <Label className="text-base font-semibold">Restaurant Address</Label>
                  <p className="text-sm text-gray-500 mb-3">
                    Used for delivery distance calculations. Saving a new address auto-geocodes coordinates.
                  </p>
                  <Input
                    placeholder="303 Ave De Diego, Puerto Nuevo, San Juan, PR 00920"
                    value={settingsForm.restaurant_address || ""}
                    onChange={(e) => setSettingsForm({ ...settingsForm, restaurant_address: e.target.value })}
                  />
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div>
                      <Label className="text-xs text-gray-500 mb-1 block">Latitud</Label>
                      <Input
                        type="number"
                        step="any"
                        placeholder="18.4270"
                        value={settingsForm.latitude || ""}
                        onChange={(e) => setSettingsForm({ ...settingsForm, latitude: e.target.value })}
                        className="font-mono text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500 mb-1 block">Longitud</Label>
                      <Input
                        type="number"
                        step="any"
                        placeholder="-66.0513"
                        value={settingsForm.longitude || ""}
                        onChange={(e) => setSettingsForm({ ...settingsForm, longitude: e.target.value })}
                        className="font-mono text-sm"
                      />
                    </div>
                  </div>
                  {settingsForm.latitude && settingsForm.longitude && (
                    <a
                      href={`https://www.google.com/maps?q=${settingsForm.latitude},${settingsForm.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline mt-2 inline-block"
                    >
                      Verificar ubicacion en Google Maps →
                    </a>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    Puedes obtener coordenadas exactas en{" "}
                    <a href="https://maps.google.com" target="_blank" rel="noopener noreferrer" className="underline">
                      maps.google.com
                    </a>{" "}
                    ��� clic derecho en el mapa → "¿Qué hay aquí?"
                  </p>
                </div>

                {/* Existing settings fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Tax Rate (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={settingsForm.tax_rate || ""}
                      onChange={(e) => setSettingsForm({ ...settingsForm, tax_rate: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Default Delivery Fee ($)</Label>
                    <p className="text-xs text-gray-500">Used when no delivery zones are configured</p>
                    <Input
                      type="number"
                      step="0.01"
                      value={settingsForm.delivery_fee || ""}
                      onChange={(e) => setSettingsForm({ ...settingsForm, delivery_fee: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">General Turnaround Time (hours) - Fallback</Label>
                    <Input
                      type="number"
                      value={settingsForm.lead_time_hours || ""}
                      onChange={(e) => setSettingsForm({ ...settingsForm, lead_time_hours: e.target.value })}
                      placeholder="24"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Delivery Turnaround (hours)</Label>
                      <Input
                        type="number"
                        value={settingsForm.delivery_lead_time_hours || ""}
                        onChange={(e) => setSettingsForm({ ...settingsForm, delivery_lead_time_hours: e.target.value })}
                        placeholder={`Fallback: ${settingsForm.lead_time_hours || 24}h`}
                      />
                      <p className="text-xs text-muted-foreground mt-1">Min hours before delivery. Empty = uses general.</p>
                    </div>
                    <div>
                      <Label>Pickup Turnaround (hours)</Label>
                      <Input
                        type="number"
                        value={settingsForm.pickup_lead_time_hours || ""}
                        onChange={(e) => setSettingsForm({ ...settingsForm, pickup_lead_time_hours: e.target.value })}
                        placeholder={`Fallback: ${settingsForm.lead_time_hours || 24}h`}
                      />
                      <p className="text-xs text-muted-foreground mt-1">Min hours before pickup. Empty = uses general.</p>
                    </div>
                  </div>
                  <div>
                    <Label>Max Advance Booking (days)</Label>
                    <Input
                      type="number"
                      value={settingsForm.max_advance_days || ""}
                      onChange={(e) => setSettingsForm({ ...settingsForm, max_advance_days: e.target.value })}
                      placeholder="14"
                    />
                    <p className="text-xs text-muted-foreground mt-1">How many days ahead customers can schedule. Empty = 14 days default.</p>
                  </div>
                  <div>
                    <Label>Min. Delivery Order ($)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={settingsForm.min_delivery_order || ""}
                      onChange={(e) => setSettingsForm({ ...settingsForm, min_delivery_order: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Min. Pickup Order ($)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={settingsForm.min_pickup_order || ""}
                      onChange={(e) => setSettingsForm({ ...settingsForm, min_pickup_order: e.target.value })}
                    />
                  </div>
                  {/* CHANGE> Removed list_columns input field - using separate templates instead */}
                </div>

                {/* Tip Options */}
                <div>
                  <Label className="text-base font-semibold">Tip Options (%)</Label>
                  <p className="text-xs text-muted-foreground mt-1">Enter whole numbers, e.g. 12 for 12%, 15 for 15%</p>
                  <div className="grid grid-cols-3 gap-4 mt-2">
                    <div>
                      <Label className="text-sm">Option 1</Label>
                      <Input
                        type="number"
                        step="1"
                        min="0"
                        max="100"
                        placeholder="12"
                        value={settingsForm.tip_option_1 || ""}
                        onChange={(e) => setSettingsForm({ ...settingsForm, tip_option_1: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Option 2</Label>
                      <Input
                        type="number"
                        step="1"
                        min="0"
                        max="100"
                        placeholder="15"
                        value={settingsForm.tip_option_2 || ""}
                        onChange={(e) => setSettingsForm({ ...settingsForm, tip_option_2: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Option 3</Label>
                      <Input
                        type="number"
                        step="1"
                        min="0"
                        max="100"
                        placeholder="18"
                        value={settingsForm.tip_option_3 || ""}
                        onChange={(e) => setSettingsForm({ ...settingsForm, tip_option_3: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Order Type Settings */}
                <div className="border-t pt-6">
                  <Label className="text-base font-semibold">Order Settings</Label>
                  <div className="grid grid-cols-2 gap-6 mt-3">
                    <div className="flex items-center gap-3">
                      <Switch
                        id="pickup-enabled"
                        checked={settingsForm.pickup_enabled}
                        onCheckedChange={(checked) => setSettingsForm({ ...settingsForm, pickup_enabled: checked })}
                      />
                      <Label htmlFor="pickup-enabled">Enable Pick-Up</Label>
                    </div>
                    <div className="flex items-center gap-3">
                      <Switch
                        id="delivery-enabled"
                        checked={settingsForm.delivery_enabled}
                        onCheckedChange={(checked) => setSettingsForm({ ...settingsForm, delivery_enabled: checked })}
                      />
                      <Label htmlFor="delivery-enabled">Enable Delivery</Label>
                    </div>
                  </div>
                  {settingsForm.delivery_enabled && (
                    <div className="mt-4">
                      <Label>Shipday API Key</Label>
                      <Input
                        type="password"
                        value={settingsForm.shipday_api_key || ""}
                        onChange={(e) => setSettingsForm({ ...settingsForm, shipday_api_key: e.target.value })}
                        placeholder="Leave empty to use platform default"
                      />
                      <div className="flex items-center gap-2 mt-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleTestShipday()}
                          disabled={shipdayTestStatus === "testing"}
                        >
                          {shipdayTestStatus === "testing" ? "Testing..." : "Test Connection"}
                        </Button>
                        {shipdayTestStatus === "success" && (
                          <span className="text-sm text-green-600">{shipdayTestMessage}</span>
                        )}
                        {shipdayTestStatus === "error" && (
                          <span className="text-sm text-red-600">{shipdayTestMessage}</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {settingsForm.shipday_api_key
                          ? "Using restaurant-specific key."
                          : "Using platform default key. Only set a value here if this restaurant needs its own Shipday account."}
                      </p>
                    </div>
                  )}
                </div>

                {/* Payment Provider Settings */}
                <div className="border-t pt-6">
                  <Label className="text-base font-semibold">Proveedor de Pagos</Label>
                  <p className="text-sm text-gray-500 mb-4">
                    Configura el proveedor de pagos para este restaurante. Si tienes sucursales, cada una puede tener su propia configuracion.
                  </p>
                  
                  {/* Payment Provider Selection */}
                  <div className="mb-4">
                    <Label>Metodo de Pago</Label>
                    <select
                      className="w-full border rounded-md px-3 py-2 mt-1"
                      value={settingsForm.payment_provider}
                      onChange={(e) => setSettingsForm({ ...settingsForm, payment_provider: e.target.value as "stripe" | "square" | "stripe_athmovil" | "square_athmovil" })}
                    >
                      <option value="stripe">Solo Stripe (Tarjeta)</option>
                      <option value="square">Solo Square (Tarjeta)</option>
                      <option value="stripe_athmovil">Stripe + ATH Móvil</option>
                      <option value="square_athmovil">Square + ATH Móvil</option>
                    </select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Selecciona tu procesador de tarjetas y si deseas ofrecer ATH Móvil como opcion adicional.
                    </p>
                  </div>

                  {/* Cash Payment Toggle */}
                  <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-green-800">Pago en Efectivo</h4>
                        <p className="text-xs text-green-600 mt-0.5">
                          Permite que los clientes paguen en efectivo al momento de la entrega o recogida.
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settingsForm.cash_payment_enabled}
                          onChange={(e) => setSettingsForm({ ...settingsForm, cash_payment_enabled: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                      </label>
                    </div>
                  </div>

                  {/* Stripe Settings */}
                  {(settingsForm.payment_provider === "stripe" || settingsForm.payment_provider === "stripe_athmovil") && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                      <h4 className="text-sm font-medium mb-2">Configuracion Stripe</h4>
                      <div>
                        <Label>Stripe Account ID</Label>
                        <Input 
                          type="text" 
                          value={settingsForm.stripe_account_id} 
                          onChange={(e) => setSettingsForm({ ...settingsForm, stripe_account_id: e.target.value })} 
                          placeholder="acct_XXXXXXXXXXXXX" 
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          ID de cuenta conectada de Stripe. Si se deja vacio, los pagos iran a la cuenta principal.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Square Settings */}
                  {(settingsForm.payment_provider === "square" || settingsForm.payment_provider === "square_athmovil") && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                      <h4 className="text-sm font-medium mb-2">Configuracion Square</h4>
                      <div className="space-y-3">
                        <div>
                          <Label>Square Access Token</Label>
                          <Input 
                            type="password" 
                            value={settingsForm.square_access_token} 
                            onChange={(e) => setSettingsForm({ ...settingsForm, square_access_token: e.target.value })} 
                            placeholder="EAAAl..." 
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Access token de la cuenta de Square.
                          </p>
                        </div>
                        <div>
                          <Label>Square Location ID</Label>
                          <Input 
                            type="text" 
                            value={settingsForm.square_location_id} 
                            onChange={(e) => setSettingsForm({ ...settingsForm, square_location_id: e.target.value })} 
                            placeholder="LID..." 
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            ID de ubicacion de Square donde se procesaran los pagos.
                          </p>
                        </div>
                        <div>
                          <Label>Ambiente</Label>
                          <select
                            className="w-full border rounded-md px-3 py-2 mt-1"
                            value={settingsForm.square_environment}
                            onChange={(e) => setSettingsForm({ ...settingsForm, square_environment: e.target.value as "sandbox" | "production" })}
                          >
                            <option value="production">Produccion</option>
                            <option value="sandbox">Sandbox (Pruebas)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ATH Móvil Settings */}
                  {(settingsForm.payment_provider === "stripe_athmovil" || settingsForm.payment_provider === "square_athmovil") && (
                    <div className="mb-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
                      <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                        <span className="w-6 h-6 bg-orange-500 rounded text-white text-xs flex items-center justify-center font-bold">ATH</span>
                        Configuracion ATH Móvil
                      </h4>
                      <div className="space-y-3">
                        <div>
                          <Label>Public Token</Label>
                          <Input 
                            type="password" 
                            value={settingsForm.athmovil_public_token} 
                            onChange={(e) => setSettingsForm({ ...settingsForm, athmovil_public_token: e.target.value })} 
                            placeholder="Token público de ATH Business" 
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Token público de tu cuenta ATH Business. Lo encuentras en el portal de ATH Business.
                          </p>
                        </div>
                        <div>
                          <Label>Ecommerce ID (Opcional)</Label>
                          <Input 
                            type="text" 
                            value={settingsForm.athmovil_ecommerce_id} 
                            onChange={(e) => setSettingsForm({ ...settingsForm, athmovil_ecommerce_id: e.target.value })} 
                            placeholder="ID de ecommerce" 
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Identificador de tu ecommerce en ATH Business (opcional).
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Order Notification Settings */}
<OrderNotificationSettings
  settings={{
  order_notification_method: settingsForm.order_notification_method,
  chowly_api_key: settingsForm.chowly_api_key,
  chowly_location_id: settingsForm.chowly_location_id,
  chowly_enabled: settingsForm.chowly_enabled,
  square_kds_enabled: settingsForm.square_kds_enabled,
  square_access_token: settingsForm.square_access_token,
  square_location_id: settingsForm.square_location_id,
  kds_access_token: settingsForm.kds_access_token,
  }}
  onChange={(newSettings) => setSettingsForm({ ...settingsForm, ...newSettings })}
  restaurantSlug={restaurant?.slug || ""}
  entityType="restaurant"
  />

                {/* Default Delivery Radius */}
                <div className="border-t pt-6">
                  <Label className="text-base font-semibold">Radio de Delivery (Default)</Label>
                  <p className="text-sm text-gray-500 mb-4">
                    Radio maximo de entrega en millas para todas las sucursales. Cada sucursal puede sobrescribir este valor.
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Radio (millas)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.5"
                        value={settingsForm.delivery_radius}
                        onChange={(e) => setSettingsForm({ ...settingsForm, delivery_radius: e.target.value })}
                        placeholder="7.0"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Si el cliente esta fuera de este radio, recibira una alerta.</p>
                    </div>
                  </div>

                  {/* Delivery Zip Codes */}
                  <div className="mt-6">
                    <Label className="text-sm font-semibold">Códigos Postales con Servicio de Delivery</Label>
                    <p className="text-xs text-muted-foreground mb-3 mt-1">
                      Selecciona los códigos postales donde este restaurante hace entrega. Si se selecciona al menos uno, se usa esta lista en lugar del radio de millas.
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 border rounded-lg p-4 bg-slate-50">
                      {[
                        { zip: "00901", area: "Viejo San Juan" },
                        { zip: "00907", area: "Condado" },
                        { zip: "00909", area: "Santurce" },
                        { zip: "00917", area: "Hato Rey" },
                        { zip: "00918", area: "Hato Rey Norte" },
                        { zip: "00920", area: "Río Piedras" },
                        { zip: "00923", area: "Cupey" },
                        { zip: "00926", area: "Cupey Gardens" },
                        { zip: "00949", area: "Toa Baja" },
                        { zip: "00956", area: "Bayamón" },
                        { zip: "00959", area: "Bayamón Este" },
                        { zip: "00965", area: "Guaynabo" },
                        { zip: "00968", area: "Guaynabo Norte" },
                        { zip: "00969", area: "Garden Hills" },
                        { zip: "00976", area: "Trujillo Alto" },
                        { zip: "00979", area: "Carolina" },
                        { zip: "00983", area: "Isla Verde" },
                      ].map(({ zip, area }) => {
                        const checked = settingsForm.delivery_zip_codes.includes(zip)
                        return (
                          <label key={zip} className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                const next = checked
                                  ? settingsForm.delivery_zip_codes.filter((z) => z !== zip)
                                  : [...settingsForm.delivery_zip_codes, zip]
                                setSettingsForm({ ...settingsForm, delivery_zip_codes: next })
                              }}
                              className="rounded border-slate-300 text-black focus:ring-black"
                            />
                            <span className="text-sm">
                              <span className="font-mono font-medium">{zip}</span>
                              <span className="text-muted-foreground ml-1 text-xs">{area}</span>
                            </span>
                          </label>
                        )
                      })}
                    </div>
                    {settingsForm.delivery_zip_codes.length > 0 && (
                      <p className="text-xs text-green-700 mt-2">
                        {settingsForm.delivery_zip_codes.length} código{settingsForm.delivery_zip_codes.length !== 1 ? "s" : ""} seleccionado{settingsForm.delivery_zip_codes.length !== 1 ? "s" : ""}. El radio de millas se ignorará para clientes con código postal.
                      </p>
                    )}
                  </div>
                </div>

                {/* Container-Based Delivery Fee */}
                <div className="border-t pt-6">
                  <Label className="text-base font-semibold">Tarifa de Delivery por Contenedores</Label>
                  <p className="text-sm text-gray-500 mb-4">
                    Configura la tarifa base de delivery y los cargos adicionales por tipo de contenedor (bandeja, bolsa, caja, etc.)
                  </p>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <Label>Tarifa Base ($)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.50"
                        value={settingsForm.delivery_base_fee}
                        onChange={(e) => setSettingsForm({ ...settingsForm, delivery_base_fee: e.target.value })}
                        placeholder="28.00"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Tarifa base que cubre los contenedores incluidos.</p>
                    </div>
                    <div>
                      <Label>Contenedores Incluidos</Label>
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        value={settingsForm.delivery_included_containers}
                        onChange={(e) => setSettingsForm({ ...settingsForm, delivery_included_containers: e.target.value })}
                        placeholder="4"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Cantidad cubierta por la tarifa base.</p>
                    </div>
                  </div>

                  {/* Container Rates Table */}
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2 border-b">
                      <h4 className="text-sm font-semibold">Tarifa por Tipo de Contenedor Adicional</h4>
                    </div>
                    {containerRates.length > 0 ? (
                      <div className="divide-y">
                        {containerRates.map((rate) => (
                          <div key={rate.id} className="flex items-center justify-between px-4 py-3">
                            <div>
                              <span className="font-medium text-sm">{rate.label}</span>
                              <span className="text-xs text-muted-foreground ml-2">({rate.container_type})</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-medium">${Number(rate.extra_fee_per_unit).toFixed(2)} c/u</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingContainerRate(rate)
                                  setContainerRateForm({
                                    container_type: rate.container_type,
                                    label: rate.label,
                                    extra_fee_per_unit: rate.extra_fee_per_unit.toString(),
                                  })
                                }}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700"
                                onClick={async () => {
                                  await deleteContainerRate(rate.id)
                                  setContainerRates((prev) => prev.filter((r) => r.id !== rate.id))
                                  toast({ title: "Tarifa eliminada" })
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="px-4 py-4 text-sm text-muted-foreground italic">No hay tarifas configuradas.</p>
                    )}

                    {/* Add/Edit Container Rate Form */}
                    <div className="border-t bg-gray-50 p-4">
                      <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                        {editingContainerRate ? "Editar Tarifa" : "Agregar Tarifa"}
                      </h4>
                      <div className="flex gap-2 items-end">
                        <div className="flex-1">
                          <Label className="text-xs">Tipo</Label>
                          <select
                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                            value={containerRateForm.container_type}
                            onChange={(e) => {
                              const type = e.target.value
  setContainerRateForm({ ...containerRateForm, container_type: type, label: containerRateForm.label || getContainerShortLabel(type) })
  }}
  >
  <option value="">Seleccionar...</option>
  {CONTAINER_TYPES.map((c) => (
    <option key={c.key} value={c.key}>{c.label}</option>
  ))}
  </select>
                        </div>
                        <div className="flex-1">
                          <Label className="text-xs">Etiqueta</Label>
                          <Input
                            value={containerRateForm.label}
                            onChange={(e) => setContainerRateForm({ ...containerRateForm, label: e.target.value })}
                            placeholder="Bandeja"
                            className="h-9"
                          />
                        </div>
                        <div className="w-28">
                          <Label className="text-xs">$/unidad</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.25"
                            value={containerRateForm.extra_fee_per_unit}
                            onChange={(e) => setContainerRateForm({ ...containerRateForm, extra_fee_per_unit: e.target.value })}
                            placeholder="2.75"
                            className="h-9"
                          />
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          className="bg-[#5d1f1f] hover:bg-[#4a1818] h-9"
                          onClick={async () => {
                            if (!containerRateForm.container_type || !containerRateForm.label || !containerRateForm.extra_fee_per_unit) {
                              toast({ title: "Completa todos los campos", variant: "destructive" })
                              return
                            }
                            const saved = await upsertContainerRate({
                              id: editingContainerRate?.id,
                              restaurant_id: restaurantId,
                              container_type: containerRateForm.container_type,
                              label: containerRateForm.label,
                              extra_fee_per_unit: Number.parseFloat(containerRateForm.extra_fee_per_unit),
                            })
                            if (editingContainerRate) {
                              setContainerRates((prev) => prev.map((r) => (r.id === saved.id ? saved : r)))
                            } else {
                              setContainerRates((prev) => [...prev, saved])
                            }
                            setEditingContainerRate(null)
                            setContainerRateForm({ container_type: "", label: "", extra_fee_per_unit: "" })
                            toast({ title: editingContainerRate ? "Tarifa actualizada" : "Tarifa agregada" })
                          }}
                        >
                          {editingContainerRate ? "Guardar" : "Agregar"}
                        </Button>
                        {editingContainerRate && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-9"
                            onClick={() => {
                              setEditingContainerRate(null)
                              setContainerRateForm({ container_type: "", label: "", extra_fee_per_unit: "" })
                            }}
                          >
                            Cancelar
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Service Packages Section Toggle */}
                <div className="border-t pt-6">
                  <Label className="text-base font-semibold">Service Packages Section</Label>
                  <div className="flex items-center gap-3 mt-3">
                    <Switch
                      id="service-packages-enabled"
                      checked={settingsForm.show_service_packages}
                      onCheckedChange={(checked) => {
                        setSettingsForm((prev) => ({ ...prev, show_service_packages: checked }))
                        handleServicePackagesToggle(checked)
                      }}
                    />
                    <Label htmlFor="service-packages-enabled">Enable Service Packages Section</Label>
                  </div>
                </div>

                {/* Chain Restaurant Toggle */}
                <div className="border-t pt-6">
                  <Label className="text-base font-semibold">Chain Restaurant</Label>
                  <p className="text-sm text-gray-500 mb-3">
                    Enable if this restaurant has multiple branches/locations. A branch selector will appear for customers.
                  </p>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is-chain"
                      checked={settingsForm.is_chain}
                      onCheckedChange={(checked) => setSettingsForm({ ...settingsForm, is_chain: checked as boolean })}
                    />
                    <Label htmlFor="is-chain">This is a chain restaurant</Label>
                  </div>
                </div>

                {/* Packages Section Title */}
                <div className="border-t pt-6">
                  <Label className="text-base font-semibold">Service Packages Section Title</Label>
                  <p className="text-sm text-gray-500 mb-3">
                    This title appears in the navigation and on the overview page.
                  </p>
                  <Input
                    value={settingsForm.packages_section_title}
                    onChange={(e) => setSettingsForm({ ...settingsForm, packages_section_title: e.target.value })}
                  />
                </div>

                {/* Checkout Upsells Config */}
                <div className="border-t pt-6">
                  <Label className="text-base font-semibold">Upsells del Checkout</Label>
                  <p className="text-sm text-gray-500 mb-3">
                    Selecciona que paquetes de servicio y extras se muestran como upsells en el carrito de compras del cliente.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => setShowUpsellConfigDialog(true)}
                    disabled={servicePackages.length === 0}
                  >
                    Configurar Upsells del Checkout
                  </Button>
                  {servicePackages.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1">Primero crea paquetes de servicio en la seccion de Menu.</p>
                  )}
                </div>

                {/* Footer Settings */}
                <div className="border-t pt-6">
                  <Label className="text-base font-semibold">Footer del Portal</Label>
                  <p className="text-sm text-gray-500 mb-4">
                    Configura la informacion que aparece en el pie de pagina del portal de clientes.
                  </p>

                  <div className="space-y-4">
                    <div>
                      <Label>Descripcion</Label>
                      <Input
                        placeholder="Servicios de catering premium para todos tus eventos especiales..."
                        value={settingsForm.footer_description}
                        onChange={(e) => setSettingsForm({ ...settingsForm, footer_description: e.target.value })}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Telefono</Label>
                        <Input
                          placeholder="787.792.2625"
                          value={settingsForm.footer_phone}
                          onChange={(e) => setSettingsForm({ ...settingsForm, footer_phone: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Email</Label>
                        <Input
                          type="email"
                          placeholder="info@turestaurante.com"
                          value={settingsForm.footer_email}
                          onChange={(e) => setSettingsForm({ ...settingsForm, footer_email: e.target.value })}
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Enlaces del Footer</Label>
                      <p className="text-xs text-muted-foreground mb-2">Links que aparecen en la columna de enlaces.</p>
                      <div className="space-y-2">
                        {settingsForm.footer_links.map((link, idx) => (
                          <div key={idx} className="flex gap-2 items-center">
                            <div className="flex flex-col gap-0.5 shrink-0">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 w-5 p-0"
                                disabled={idx === 0}
                                onClick={() => {
                                  const updated = [...settingsForm.footer_links]
                                  const [moved] = updated.splice(idx, 1)
                                  updated.splice(idx - 1, 0, moved)
                                  setSettingsForm({ ...settingsForm, footer_links: updated })
                                }}
                              >
                                <ChevronUp className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 w-5 p-0"
                                disabled={idx === settingsForm.footer_links.length - 1}
                                onClick={() => {
                                  const updated = [...settingsForm.footer_links]
                                  const [moved] = updated.splice(idx, 1)
                                  updated.splice(idx + 1, 0, moved)
                                  setSettingsForm({ ...settingsForm, footer_links: updated })
                                }}
                              >
                                <ChevronDown className="h-3 w-3" />
                              </Button>
                            </div>
                            <Input
                              placeholder="Texto del enlace"
                              className="flex-1"
                              value={link.label}
                              onChange={(e) => {
                                const updated = [...settingsForm.footer_links]
                                updated[idx] = { ...updated[idx], label: e.target.value }
                                setSettingsForm({ ...settingsForm, footer_links: updated })
                              }}
                            />
                            <Input
                              placeholder="https://..."
                              className="flex-1"
                              value={link.url}
                              onChange={(e) => {
                                const updated = [...settingsForm.footer_links]
                                updated[idx] = { ...updated[idx], url: e.target.value }
                                setSettingsForm({ ...settingsForm, footer_links: updated })
                              }}
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-9 px-2 text-red-500"
                              onClick={() => {
                                setSettingsForm({
                                  ...settingsForm,
                                  footer_links: settingsForm.footer_links.filter((_, i) => i !== idx),
                                })
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSettingsForm({
                              ...settingsForm,
                              footer_links: [...settingsForm.footer_links, { label: "", url: "" }],
                            })
                          }}
                        >
                          <Plus className="h-3 w-3 mr-1" /> Agregar Enlace
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

<Button type="button" onClick={handleSaveSettings} className="bg-[#5d1f1f] hover:bg-[#4a1818]">
              Save Settings
              </Button>
              </CardContent>
              </Card>

              {/* Tools & Import Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Herramientas e Importacion
                  </CardTitle>
                  <CardDescription>Importar datos y herramientas adicionales</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <a 
                      href="/admin/import-customers" 
                      target="_blank"
                      className="flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <User className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">Importar Clientes</p>
                        <p className="text-sm text-gray-500">Cargar clientes desde archivo CSV</p>
                      </div>
                      <ExternalLink className="h-4 w-4 text-gray-400 ml-auto" />
                    </a>
                  </div>
                </CardContent>
              </Card>
              
              {/* Copy Menu From Another Restaurant */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Copy className="h-5 w-5" />
                  Copiar Menu de Otro Restaurante
                </CardTitle>
                <CardDescription>
                  Copia categorias, items, opciones y precios desde otro restaurante. Util para cadenas o sucursales que comparten el mismo menu.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Direction selector */}
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="copyDirection"
                      checked={copyMenuDirection === "pull"}
                      onChange={() => setCopyMenuDirection("pull")}
                      className="accent-primary"
                    />
                    <span className="text-sm">Copiar DE otro restaurante</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="copyDirection"
                      checked={copyMenuDirection === "push"}
                      onChange={() => setCopyMenuDirection("push")}
                      className="accent-primary"
                    />
                    <span className="text-sm">Copiar A otro(s) restaurante(s)</span>
                  </label>
                </div>

                <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                  <div className="flex-1">
                    <Label>
                      {copyMenuDirection === "pull" ? "Restaurante Origen" : "Restaurantes Destino"}
                    </Label>
                    {copyMenuDirection === "pull" ? (
                      <Select
                        value={copyMenuSourceId}
                        onValueChange={setCopyMenuSourceId}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Seleccionar restaurante..." />
                        </SelectTrigger>
                        <SelectContent>
                          {allRestaurantsForCopy
                            .filter((r) => r.id !== restaurantId)
                            .map((r) => (
                              <SelectItem key={r.id} value={r.id}>
                                {r.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="mt-1 space-y-2 max-h-48 overflow-y-auto border rounded-md p-2">
                        {allRestaurantsForCopy
                          .filter((r) => r.id !== restaurantId)
                          .map((r) => (
                            <label key={r.id} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded">
                              <Checkbox
                                checked={copyMenuTargetIds.includes(r.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setCopyMenuTargetIds([...copyMenuTargetIds, r.id])
                                  } else {
                                    setCopyMenuTargetIds(copyMenuTargetIds.filter((id) => id !== r.id))
                                  }
                                }}
                              />
                              <span className="text-sm">{r.name}</span>
                            </label>
                          ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="clearExisting"
                      checked={copyMenuClearExisting}
                      onCheckedChange={(checked) => setCopyMenuClearExisting(checked === true)}
                    />
                    <Label htmlFor="clearExisting" className="text-sm cursor-pointer">
                      Borrar menu existente primero
                    </Label>
                  </div>
                </div>
                <Button
                  onClick={handleCopyMenu}
                  disabled={(copyMenuDirection === "pull" ? !copyMenuSourceId : copyMenuTargetIds.length === 0) || isCopyingMenu}
                  variant="outline"
                  className="gap-2"
                >
                  {isCopyingMenu ? (
                    <>
                      <span className="animate-spin">⏳</span> Copiando...
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" /> 
                      {copyMenuDirection === "pull" 
                        ? "Copiar Menu" 
                        : `Copiar a ${copyMenuTargetIds.length} restaurante(s)`}
                    </>
                  )}
                </Button>
                {copyMenuResult && (
                  <div className={`text-sm p-3 rounded-lg ${copyMenuResult.success ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
                    {copyMenuResult.message}
                    {copyMenuResult.results && (
                      <div className="mt-1 text-xs">
                        {copyMenuResult.results.categories} categorias, {copyMenuResult.results.items} items, {copyMenuResult.results.options} opciones, {copyMenuResult.results.choices} opciones de seleccion
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Operating Hours Section - Meal Periods */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Horario de Operacion
                </CardTitle>
                <CardDescription>
                  Define los horarios de Desayuno, Almuerzo y Cena para cada dia. Use "Cerrado" para indicar que el periodo no esta disponible.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {restaurantHoursLoaded ? (
                  <>
                    {/* Warning banner */}
                    <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-3 text-sm text-cyan-800">
                      Los horarios de cada periodo no pueden superponerse. Si ve un error, verifique que los horarios no se solapen.
                    </div>
                    
                    {/* Table header */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 px-2 w-24"></th>
                            <th className="text-center py-2 px-2" colSpan={2}>Desayuno</th>
                            <th className="text-center py-2 px-2" colSpan={2}>Almuerzo</th>
                            <th className="text-center py-2 px-2" colSpan={2}>Cena</th>
                            <th className="py-2 px-2 w-24"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {restaurantHours.map((day, idx) => (
                            <tr key={day.day_of_week} className="border-b hover:bg-muted/30">
                              <td className="py-3 px-2 font-medium">{DAY_NAMES[day.day_of_week]}</td>
                              
                              {/* Breakfast */}
                              <td className="py-3 px-1">
                                <Select
                                  value={day.breakfast_open || "closed"}
                                  onValueChange={(val) => {
                                    const updated = [...restaurantHours]
                                    updated[idx] = { ...updated[idx], breakfast_open: val === "closed" ? null : val }
                                    setRestaurantHours(updated)
                                  }}
                                >
                                  <SelectTrigger className="w-24 h-8 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="closed">Cerrado</SelectItem>
                                    {Array.from({ length: 24 }, (_, h) => [`${h.toString().padStart(2, "0")}:00`, `${h.toString().padStart(2, "0")}:30`]).flat().map((t) => {
                                      const hour = parseInt(t.split(":")[0])
                                      const min = t.split(":")[1]
                                      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
                                      const ampm = hour < 12 ? "AM" : "PM"
                                      return <SelectItem key={`bo-${t}`} value={t}>{displayHour}:{min} {ampm}</SelectItem>
                                    })}
                                  </SelectContent>
                                </Select>
                              </td>
                              <td className="py-3 px-1">
                                <Select
                                  value={day.breakfast_close || "closed"}
                                  onValueChange={(val) => {
                                    const updated = [...restaurantHours]
                                    updated[idx] = { ...updated[idx], breakfast_close: val === "closed" ? null : val }
                                    setRestaurantHours(updated)
                                  }}
                                  disabled={!day.breakfast_open}
                                >
                                  <SelectTrigger className="w-24 h-8 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="closed">Cerrado</SelectItem>
                                    {Array.from({ length: 24 }, (_, h) => [`${h.toString().padStart(2, "0")}:00`, `${h.toString().padStart(2, "0")}:30`]).flat().map((t) => {
                                      const hour = parseInt(t.split(":")[0])
                                      const min = t.split(":")[1]
                                      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
                                      const ampm = hour < 12 ? "AM" : "PM"
                                      return <SelectItem key={`bc-${t}`} value={t}>{displayHour}:{min} {ampm}</SelectItem>
                                    })}
                                  </SelectContent>
                                </Select>
                              </td>
                              
                              {/* Lunch */}
                              <td className="py-3 px-1">
                                <Select
                                  value={day.lunch_open || "closed"}
                                  onValueChange={(val) => {
                                    const updated = [...restaurantHours]
                                    updated[idx] = { ...updated[idx], lunch_open: val === "closed" ? null : val }
                                    setRestaurantHours(updated)
                                  }}
                                >
                                  <SelectTrigger className="w-24 h-8 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="closed">Cerrado</SelectItem>
                                    {Array.from({ length: 24 }, (_, h) => [`${h.toString().padStart(2, "0")}:00`, `${h.toString().padStart(2, "0")}:30`]).flat().map((t) => {
                                      const hour = parseInt(t.split(":")[0])
                                      const min = t.split(":")[1]
                                      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
                                      const ampm = hour < 12 ? "AM" : "PM"
                                      return <SelectItem key={`lo-${t}`} value={t}>{displayHour}:{min} {ampm}</SelectItem>
                                    })}
                                  </SelectContent>
                                </Select>
                              </td>
                              <td className="py-3 px-1">
                                <Select
                                  value={day.lunch_close || "closed"}
                                  onValueChange={(val) => {
                                    const updated = [...restaurantHours]
                                    updated[idx] = { ...updated[idx], lunch_close: val === "closed" ? null : val }
                                    setRestaurantHours(updated)
                                  }}
                                  disabled={!day.lunch_open}
                                >
                                  <SelectTrigger className="w-24 h-8 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="closed">Cerrado</SelectItem>
                                    {Array.from({ length: 24 }, (_, h) => [`${h.toString().padStart(2, "0")}:00`, `${h.toString().padStart(2, "0")}:30`]).flat().map((t) => {
                                      const hour = parseInt(t.split(":")[0])
                                      const min = t.split(":")[1]
                                      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
                                      const ampm = hour < 12 ? "AM" : "PM"
                                      return <SelectItem key={`lc-${t}`} value={t}>{displayHour}:{min} {ampm}</SelectItem>
                                    })}
                                  </SelectContent>
                                </Select>
                              </td>
                              
                              {/* Dinner */}
                              <td className="py-3 px-1">
                                <Select
                                  value={day.dinner_open || "closed"}
                                  onValueChange={(val) => {
                                    const updated = [...restaurantHours]
                                    updated[idx] = { ...updated[idx], dinner_open: val === "closed" ? null : val }
                                    setRestaurantHours(updated)
                                  }}
                                >
                                  <SelectTrigger className="w-24 h-8 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="closed">Cerrado</SelectItem>
                                    {Array.from({ length: 24 }, (_, h) => [`${h.toString().padStart(2, "0")}:00`, `${h.toString().padStart(2, "0")}:30`]).flat().map((t) => {
                                      const hour = parseInt(t.split(":")[0])
                                      const min = t.split(":")[1]
                                      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
                                      const ampm = hour < 12 ? "AM" : "PM"
                                      return <SelectItem key={`do-${t}`} value={t}>{displayHour}:{min} {ampm}</SelectItem>
                                    })}
                                  </SelectContent>
                                </Select>
                              </td>
                              <td className="py-3 px-1">
                                <Select
                                  value={day.dinner_close || "closed"}
                                  onValueChange={(val) => {
                                    const updated = [...restaurantHours]
                                    updated[idx] = { ...updated[idx], dinner_close: val === "closed" ? null : val }
                                    setRestaurantHours(updated)
                                  }}
                                  disabled={!day.dinner_open}
                                >
                                  <SelectTrigger className="w-24 h-8 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="closed">Cerrado</SelectItem>
                                    {Array.from({ length: 24 }, (_, h) => [`${h.toString().padStart(2, "0")}:00`, `${h.toString().padStart(2, "0")}:30`]).flat().map((t) => {
                                      const hour = parseInt(t.split(":")[0])
                                      const min = t.split(":")[1]
                                      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
                                      const ampm = hour < 12 ? "AM" : "PM"
                                      return <SelectItem key={`dc-${t}`} value={t}>{displayHour}:{min} {ampm}</SelectItem>
                                    })}
                                  </SelectContent>
                                </Select>
                              </td>
                              
                              {/* Copy To All button */}
                              <td className="py-3 px-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-xs bg-cyan-500 text-white hover:bg-cyan-600 border-0"
                                  onClick={() => copyRestaurantHoursToAll(idx)}
                                >
                                  Copy To All
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    <Button
                      onClick={handleSaveRestaurantHours}
                      disabled={savingRestaurantHours}
                      className="bg-[#5d1f1f] hover:bg-[#4a1818]"
                    >
                      {savingRestaurantHours ? "Guardando..." : "Guardar Horario"}
                    </Button>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Cargando horario...</p>
                )}
              </CardContent>
            </Card>

            {/* Delivery Zones Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      Delivery Zones
                    </CardTitle>
                    <CardDescription>Configure distance-based delivery pricing tiers</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowTierGrid((v) => !v)}
                    >
                      {showTierGrid ? "Hide" : "Quick Setup — Tier Grid"}
                    </Button>
                    <Button
                      onClick={() => {
                        setEditingZone(null)
                        setZoneForm({
                          zone_name: "",
                          min_distance: "0",
                          max_distance: "",
                          base_fee: "",
                          per_item_surcharge: "0",
                          min_items_for_surcharge: "50",
                          is_active: true,
                        })
                        setShowZoneModal(true)
                      }}
                      className="bg-[#5d1f1f] hover:bg-[#4a1818]"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Zone
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Tier Grid bulk setup */}
                {showTierGrid && (
                  <div className="border rounded-lg p-4 bg-slate-50 space-y-4">
                    <div>
                      <p className="text-sm font-semibold">Quick Setup — Tier Grid</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Enter a base fee for each distance tier. Clicking "Apply All Tiers" will replace all existing zones instantly. Leave a tier blank to skip it.
                      </p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left font-medium pb-2 pr-3 text-muted-foreground">Tier</th>
                            <th className="text-left font-medium pb-2 pr-3 text-muted-foreground">Distance</th>
                            <th className="text-left font-medium pb-2 text-muted-foreground">Base Fee ($)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {tierGrid.map((tier, i) => (
                            <tr key={i}>
                              <td className="py-1.5 pr-3 font-mono text-muted-foreground">T{i + 1}</td>
                              <td className="py-1.5 pr-3 text-muted-foreground whitespace-nowrap">
                                {tier.minDistance}–{tier.maxDistance} mi
                              </td>
                              <td className="py-1.5">
                                <div className="flex items-center gap-1">
                                  <span className="text-muted-foreground">$</span>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={tier.baseFee}
                                    onChange={(e) => {
                                      const next = [...tierGrid]
                                      next[i] = { ...next[i], baseFee: e.target.value }
                                      setTierGrid(next)
                                    }}
                                    className="h-8 w-24"
                                  />
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button
                        disabled={isBulkApplying}
                        onClick={async () => {
                          if (!confirm("This will replace ALL existing delivery zones with these tiers. Continue?")) return
                          setIsBulkApplying(true)
                          try {
                            await bulkApplyDeliveryTiers(
                              restaurantId,
                              tierGrid.map((t) => ({
                                minDistance: t.minDistance,
                                maxDistance: t.maxDistance,
                                baseFee: Number.parseFloat(t.baseFee) || 0,
                              })),
                            )
                            toast({ title: "Tiers applied successfully" })
                            fetchDeliveryZones()
                            setShowTierGrid(false)
                          } catch (err: any) {
                            toast({ title: "Error applying tiers", description: err.message, variant: "destructive" })
                          } finally {
                            setIsBulkApplying(false)
                          }
                        }}
                        className="bg-[#5d1f1f] hover:bg-[#4a1818]"
                      >
                        {isBulkApplying ? "Applying..." : "Apply All Tiers"}
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => setTierGrid(DEFAULT_TIERS)}
                      >
                        Reset
                      </Button>
                    </div>
                  </div>
                )}

                {/* Existing zones list */}
                {deliveryZones.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <MapPin className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No delivery zones configured</p>
                    <p className="text-sm">Add zones to enable distance-based pricing</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {deliveryZones.map((zone) => (
                      <div key={zone.id} className="flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50">
                        <GripVertical className="h-5 w-5 text-gray-400" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">{zone.zone_name}</h4>
                            {!zone.is_active && <span className="text-xs bg-gray-200 px-2 py-1 rounded">Inactive</span>}
                          </div>
                          <p className="text-sm text-gray-600">
                            {zone.min_distance} - {zone.max_distance} miles • Base: ${Number(zone.base_fee).toFixed(2)}
                          </p>
                          {zone.per_item_surcharge > 0 && (
                            <p className="text-xs text-gray-500">
                              +${Number(zone.per_item_surcharge).toFixed(2)}/item over {zone.min_items_for_surcharge}{" "}
                              items
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingZone(zone)
                              setZoneForm({
                                zone_name: zone.zone_name,
                                min_distance: zone.min_distance.toString(),
                                max_distance: zone.max_distance.toString(),
                                base_fee: zone.base_fee.toString(),
                                per_item_surcharge: zone.per_item_surcharge.toString(),
                                min_items_for_surcharge: zone.min_items_for_surcharge.toString(),
                                is_active: zone.is_active,
                              })
                              setShowZoneModal(true)
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleDeleteZone(zone.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

{/* Comunicaciones Tab Content */}
          <TabsContent value="communications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Plantillas de Comunicacion</CardTitle>
                <CardDescription>
                  Personaliza los mensajes de correo electronico que se envian a los clientes.
                  Usa las variables disponibles para incluir informacion dinamica del pedido.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {emailTemplates.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No hay plantillas configuradas. Las plantillas predeterminadas se crearan automaticamente.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {emailTemplates.map((template) => (
                      <div key={template.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <h3 className="font-medium">
                              {template.template_type === "order_confirmation" && "Confirmacion de Pedido"}
                              {template.template_type === "order_ready" && "Pedido Listo"}
                              {template.template_type === "order_shipped" && "Pedido en Camino"}
                              {template.template_type === "order_cancelled" && "Pedido Cancelado"}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {template.template_type === "order_confirmation" && "Se envia cuando el cliente completa su pedido"}
                              {template.template_type === "order_ready" && "Se envia cuando el pedido esta listo para recoger"}
                              {template.template_type === "order_shipped" && "Se envia cuando el pedido sale para entrega"}
                              {template.template_type === "order_cancelled" && "Se envia cuando se cancela el pedido"}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 text-xs rounded ${template.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
                              {template.is_active ? "Activo" : "Inactivo"}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingTemplate(template)
                                setTemplateForm({ subject: template.subject, body: template.body })
                              }}
                            >
                              <Pencil className="h-4 w-4 mr-1" />
                              Editar
                            </Button>
                          </div>
                        </div>
                        <div className="bg-gray-50 rounded p-3 mt-2">
                          <p className="text-sm font-medium text-gray-700">Asunto: {template.subject}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Variables Reference */}
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Variables Disponibles</h4>
                  <p className="text-sm text-blue-800 mb-2">Usa estas variables en tus plantillas. Se reemplazaran con la informacion real del pedido:</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                    <code className="bg-blue-100 px-2 py-1 rounded">{"{{order_number}}"}</code>
                    <code className="bg-blue-100 px-2 py-1 rounded">{"{{customer_name}}"}</code>
                    <code className="bg-blue-100 px-2 py-1 rounded">{"{{restaurant_name}}"}</code>
                    <code className="bg-blue-100 px-2 py-1 rounded">{"{{order_total}}"}</code>
                    <code className="bg-blue-100 px-2 py-1 rounded">{"{{order_date}}"}</code>
                    <code className="bg-blue-100 px-2 py-1 rounded">{"{{order_time}}"}</code>
                    <code className="bg-blue-100 px-2 py-1 rounded">{"{{delivery_address}}"}</code>
                    <code className="bg-blue-100 px-2 py-1 rounded">{"{{order_items}}"}</code>
                    <code className="bg-blue-100 px-2 py-1 rounded">{"{{order_type}}"}</code>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Edit Template Modal */}
            <Dialog open={!!editingTemplate} onOpenChange={(open) => !open && setEditingTemplate(null)}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Editar Plantilla de Correo</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Asunto del Correo</Label>
                    <Input
                      value={templateForm.subject}
                      onChange={(e) => setTemplateForm({ ...templateForm, subject: e.target.value })}
                      placeholder="Ej: Tu pedido #{{order_number}} ha sido confirmado"
                    />
                  </div>
                  <div>
                    <Label>Cuerpo del Mensaje</Label>
                    <Textarea
                      value={templateForm.body}
                      onChange={(e) => setTemplateForm({ ...templateForm, body: e.target.value })}
                      rows={12}
                      placeholder="Escribe el contenido del correo aqui..."
                      className="font-mono text-sm"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setEditingTemplate(null)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleSaveTemplate} disabled={savingTemplate} className="bg-[#5d1f1f] hover:bg-[#4a1818]">
                      {savingTemplate ? "Guardando..." : "Guardar Cambios"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>

{/* Acceso Tab Content - Restaurant Admin Management */}
          <TabsContent value="access" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Key className="h-5 w-5" />
                      Acceso al Panel de Administracion
                    </CardTitle>
                    <CardDescription>
                      Administra los usuarios que pueden acceder a este panel de restaurante.
                    </CardDescription>
                  </div>
                  {isSuperAdmin && (
                    <Dialog open={showCreateAdminDialog} onOpenChange={setShowCreateAdminDialog}>
                      <DialogTrigger asChild>
                        <Button onClick={() => setAdminForm({ username: "", email: "", password: generatePassword() })}>
                          <Plus className="h-4 w-4 mr-2" />
                          Crear Usuario
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Crear Usuario Administrador</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label>Nombre de Usuario *</Label>
                            <Input
                              placeholder="ej: restaurante.admin"
                              value={adminForm.username}
                              onChange={(e) => setAdminForm({ ...adminForm, username: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Correo Electronico *</Label>
                            <Input
                              type="email"
                              placeholder="ej: admin@restaurante.com"
                              value={adminForm.email}
                              onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Contrasena *</Label>
                            <div className="flex gap-2">
                              <div className="relative flex-1">
                                <Input
                                  type={showAdminPassword ? "text" : "password"}
                                  value={adminForm.password}
                                  onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="absolute right-0 top-0 h-full px-3"
                                  onClick={() => setShowAdminPassword(!showAdminPassword)}
                                >
                                  {showAdminPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                  navigator.clipboard.writeText(adminForm.password)
                                  toast({ title: "Copiado", description: "Contrasena copiada al portapapeles" })
                                }}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setAdminForm({ ...adminForm, password: generatePassword() })}
                              >
                                Generar
                              </Button>
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setShowCreateAdminDialog(false)}>Cancelar</Button>
                          <Button onClick={handleCreateAdmin} disabled={savingAdmin} className="bg-[#5d1f1f] hover:bg-[#4a1818]">
                            {savingAdmin ? "Creando..." : "Crear Usuario"}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {restaurantAdmins.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No hay usuarios administradores configurados para este restaurante.</p>
                    {isSuperAdmin && (
                      <p className="text-sm mt-2">Haz clic en "Crear Usuario" para agregar uno.</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {restaurantAdmins.map((admin) => (
                      <div key={admin.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium">{admin.username}</h3>
                              <span className="px-2 py-0.5 text-xs rounded bg-blue-100 text-blue-800">
                                Restaurant Admin
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">{admin.email}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Creado: {new Date(admin.created_at).toLocaleDateString("es-PR")}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Dialog open={editingAdmin?.id === admin.id} onOpenChange={(open) => {
                              if (open) {
                                setEditingAdmin(admin)
                                setAdminForm({ ...adminForm, password: generatePassword() })
                              } else {
                                setEditingAdmin(null)
                              }
                            }}>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <Key className="h-4 w-4 mr-1" />
                                  Cambiar Contrasena
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Cambiar Contrasena</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                  <p className="text-sm text-muted-foreground">
                                    Cambiando contrasena para: <strong>{admin.username}</strong>
                                  </p>
                                  <div className="space-y-2">
                                    <Label>Nueva Contrasena</Label>
                                    <div className="flex gap-2">
                                      <div className="relative flex-1">
                                        <Input
                                          type={showAdminPassword ? "text" : "password"}
                                          value={adminForm.password}
                                          onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                                        />
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="absolute right-0 top-0 h-full px-3"
                                          onClick={() => setShowAdminPassword(!showAdminPassword)}
                                        >
                                          {showAdminPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </Button>
                                      </div>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                          navigator.clipboard.writeText(adminForm.password)
                                          toast({ title: "Copiado", description: "Contrasena copiada al portapapeles" })
                                        }}
                                      >
                                        <Copy className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setAdminForm({ ...adminForm, password: generatePassword() })}
                                      >
                                        Generar
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex justify-end gap-2">
                                  <Button variant="outline" onClick={() => setEditingAdmin(null)}>Cancelar</Button>
                                  <Button 
                                    onClick={() => handleResetAdminPassword(admin.id, adminForm.password)} 
                                    className="bg-[#5d1f1f] hover:bg-[#4a1818]"
                                  >
                                    Guardar Contrasena
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Login URL Info */}
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">URL de Acceso al Panel Admin</h4>
                  <p className="text-sm text-blue-800 mb-2">
                    Los usuarios pueden acceder al panel de administracion en:
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="bg-blue-100 px-3 py-1 rounded text-sm flex-1 truncate">
                      {typeof window !== "undefined" ? `${window.location.origin}/${restaurant.slug}/admin` : `/${restaurant.slug}/admin`}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/${restaurant.slug}/admin`)
                        toast({ title: "Copiado", description: "URL copiada al portapapeles" })
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* KDS Access Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="h-5 w-5" />
                  Acceso al KDS (Pantalla de Cocina)
                </CardTitle>
                <CardDescription>
                  El KDS usa tokens de acceso en lugar de usuario/contrasena. Esto permite que las tablets de cocina accedan directamente sin iniciar sesion.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Main Restaurant KDS Token */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-medium">{restaurant.name}</h3>
                      <p className="text-sm text-muted-foreground">Token de acceso principal</p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded ${settingsForm.kds_access_token ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
                      {settingsForm.kds_access_token ? "Configurado" : "Sin configurar"}
                    </span>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Input
                        value={settingsForm.kds_access_token || ""}
                        onChange={(e) => setSettingsForm({ ...settingsForm, kds_access_token: e.target.value })}
                        placeholder="Token de acceso (ej: cocina123)"
                        className="flex-1"
                      />
                      <Button
                        variant="outline"
                        onClick={() => {
                          const token = Math.random().toString(36).substring(2, 10)
                          setSettingsForm({ ...settingsForm, kds_access_token: token })
                        }}
                      >
                        Generar
                      </Button>
                      <Button
                        onClick={async () => {
                          const { error } = await supabase
                            .from("restaurants")
                            .update({ kds_access_token: settingsForm.kds_access_token || null })
                            .eq("id", restaurantId)
                          if (error) {
                            toast({ title: "Error", description: "Error al guardar token", variant: "destructive" })
                          } else {
                            toast({ title: "Guardado", description: "Token de KDS actualizado" })
                          }
                        }}
                        className="bg-[#5d1f1f] hover:bg-[#4a1818]"
                      >
                        Guardar
                      </Button>
                    </div>
                    
                    {settingsForm.kds_access_token && (
                      <div className="bg-gray-50 rounded p-3">
                        <p className="text-sm font-medium mb-2">URL de acceso directo al KDS:</p>
                        <div className="flex items-center gap-2">
                          <code className="bg-white border px-3 py-1 rounded text-sm flex-1 truncate">
                            {typeof window !== "undefined" 
                              ? `${window.location.origin}/${restaurant.slug}/kds?token=${settingsForm.kds_access_token}`
                              : `/${restaurant.slug}/kds?token=${settingsForm.kds_access_token}`
                            }
                          </code>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const url = `${window.location.origin}/${restaurant.slug}/kds?token=${settingsForm.kds_access_token}`
                              navigator.clipboard.writeText(url)
                              toast({ title: "Copiado", description: "URL del KDS copiada" })
                            }}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Branch KDS Tokens (if has branches) */}
                {branches.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm text-muted-foreground">Tokens por Sucursal</h4>
                    {branches.map((branch: any) => (
                      <div key={branch.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h3 className="font-medium">{branch.name}</h3>
                            <p className="text-sm text-muted-foreground">Token de acceso de sucursal</p>
                          </div>
                          <span className={`px-2 py-1 text-xs rounded ${branch.kds_access_token ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
                            {branch.kds_access_token ? "Configurado" : "Sin configurar"}
                          </span>
                        </div>
                        
                        {branch.kds_access_token && (
                          <div className="bg-gray-50 rounded p-3">
                            <p className="text-sm font-medium mb-2">URL de acceso directo:</p>
                            <div className="flex items-center gap-2">
                              <code className="bg-white border px-3 py-1 rounded text-sm flex-1 truncate">
                                {typeof window !== "undefined" 
                                  ? `${window.location.origin}/${restaurant.slug}/kds?branch=${branch.id}&token=${branch.kds_access_token}`
                                  : `/${restaurant.slug}/kds?branch=${branch.id}&token=${branch.kds_access_token}`
                                }
                              </code>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const url = `${window.location.origin}/${restaurant.slug}/kds?branch=${branch.id}&token=${branch.kds_access_token}`
                                  navigator.clipboard.writeText(url)
                                  toast({ title: "Copiado", description: "URL del KDS copiada" })
                                }}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                        
                        {!branch.kds_access_token && (
                          <p className="text-sm text-amber-600">
                            Configura el token en la pestana Sucursales para esta sucursal.
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Instructions */}
                <div className="p-4 bg-amber-50 rounded-lg">
                  <h4 className="font-medium text-amber-900 mb-2">Como usar el KDS</h4>
                  <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside">
                    <li>Genera o ingresa un token de acceso arriba</li>
                    <li>Guarda el token</li>
                    <li>Copia la URL de acceso directo</li>
                    <li>Abre esa URL en la tablet de cocina o guardala como favorito</li>
                    <li>La cocina podra ver los pedidos sin necesidad de usuario/contrasena</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

{/* KDS Tab Content */}
  <TabsContent value="kds" className="space-y-6">
  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Monitor className="h-5 w-5" />
                        Kitchen Display System (KDS)
                      </CardTitle>
                      <CardDescription>
                        Accede al sistema de pantalla de cocina para visualizar y gestionar pedidos en tiempo real.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Main Restaurant KDS */}
                      <div className="p-4 border rounded-lg bg-slate-50">
                        <h3 className="font-medium mb-3">{restaurant.name}</h3>
                        <div className="flex flex-col sm:flex-row gap-3">
                          <Button
                            asChild
                            className="gap-2"
                          >
                            <Link 
                              href={`/${restaurant.slug}/kds${settingsForm.kds_access_token ? `?token=${settingsForm.kds_access_token}` : ''}`}
                              target="_blank"
                            >
                              <Monitor className="h-4 w-4" />
                              Abrir KDS
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          </Button>
                          <Button
                            variant="outline"
                            className="gap-2"
                            onClick={() => {
                              const kdsUrl = `${window.location.origin}/${restaurant.slug}/kds${settingsForm.kds_access_token ? `?token=${settingsForm.kds_access_token}` : ''}`
                              navigator.clipboard.writeText(kdsUrl)
                              toast({
                                title: "URL Copiada",
                                description: "El enlace del KDS ha sido copiado al portapapeles.",
                              })
                            }}
                          >
                            <Copy className="h-4 w-4" />
                            Copiar URL
                          </Button>
                        </div>
                        {settingsForm.kds_access_token && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Token de acceso configurado. El KDS puede abrirse sin iniciar sesión.
                          </p>
                        )}
                        {!settingsForm.kds_access_token && (
                          <p className="text-xs text-amber-600 mt-2">
                            No hay token de acceso configurado. Se requiere iniciar sesión para acceder al KDS.
                          </p>
                        )}
                      </div>

                      {/* Branch KDS Links */}
                      {settingsForm.is_chain && branches.length > 0 && (
                        <div className="space-y-3">
                          <h3 className="font-medium">Sucursales</h3>
                          {branches.map((branch) => (
                            <div key={branch.id} className="p-4 border rounded-lg">
                              <h4 className="font-medium mb-3">{branch.name}</h4>
                              <div className="flex flex-col sm:flex-row gap-3">
                                <Button
                                  asChild
                                  variant="outline"
                                  className="gap-2"
                                >
                                  <Link 
                                    href={`/${restaurant.slug}/kds?branch=${branch.id}${branch.kds_access_token ? `&token=${branch.kds_access_token}` : ''}`}
                                    target="_blank"
                                  >
                                    <Monitor className="h-4 w-4" />
                                    Abrir KDS
                                    <ExternalLink className="h-3 w-3" />
                                  </Link>
                                </Button>
                                <Button
                                  variant="ghost"
                                  className="gap-2"
                                  onClick={() => {
                                    const kdsUrl = `${window.location.origin}/${restaurant.slug}/kds?branch=${branch.id}${branch.kds_access_token ? `&token=${branch.kds_access_token}` : ''}`
                                    navigator.clipboard.writeText(kdsUrl)
                                    toast({
                                      title: "URL Copiada",
                                      description: `El enlace del KDS para ${branch.name} ha sido copiado.`,
                                    })
                                  }}
                                >
                                  <Copy className="h-4 w-4" />
                                  Copiar URL
                                </Button>
                              </div>
                              {branch.kds_access_token ? (
                                <p className="text-xs text-muted-foreground mt-2">
                                  Token de acceso configurado.
                                </p>
                              ) : (
                                <p className="text-xs text-amber-600 mt-2">
                                  Sin token de acceso.
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Help Text */}
                      <div className="text-sm text-muted-foreground border-t pt-4">
                        <p className="font-medium mb-2">Instrucciones:</p>
                        <ul className="list-disc list-inside space-y-1">
                          <li>Usa el botón "Abrir KDS" para abrir la pantalla de cocina en una nueva ventana.</li>
                          <li>Usa "Copiar URL" para obtener el enlace y configurarlo en una tablet o pantalla dedicada.</li>
                          <li>El token de acceso permite abrir el KDS sin necesidad de iniciar sesión.</li>
                          <li>Para configurar el token de acceso, ve a la pestaña Settings {">"} Order Notifications.</li>
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* CHANGE> Marketplace Tab Content */}
                <TabsContent value="marketplace" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Marketplace Settings
                </CardTitle>
                <CardDescription>Configure how your restaurant appears in the marketplace</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <Switch
                      id="show-in-marketplace"
                      checked={marketplaceSettings.show_in_marketplace}
                      onCheckedChange={(checked) =>
                        setMarketplaceSettings((prev) => ({ ...prev, show_in_marketplace: checked }))
                      }
                    />
                    <Label htmlFor="show-in-marketplace">Show in Marketplace</Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch
                      id="is-featured"
                      checked={marketplaceSettings.is_featured}
                      onCheckedChange={(checked) =>
                        setMarketplaceSettings((prev) => ({ ...prev, is_featured: checked }))
                      }
                    />
                    <Label htmlFor="is-featured">Mark as Featured</Label>
                  </div>
                </div>

                <div>
                  <Label>Marketplace Tagline</Label>
                  <Input
                    placeholder="Your restaurant's unique selling proposition"
                    value={marketplaceSettings.marketplace_tagline}
                    onChange={(e) =>
                      setMarketplaceSettings((prev) => ({ ...prev, marketplace_tagline: e.target.value }))
                    }
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">Una frase corta y atractiva para describir tu restaurante.</p>
                </div>

                <div className="space-y-4">
                  {/* Main Cuisine Type Dropdown */}
                  <div>
                    <Label>Tipo de Cocina Principal</Label>
                    <p className="text-xs text-muted-foreground mt-0.5 mb-2">
                      Este es el tipo de cocina que se mostrará en la tarjeta del restaurante.
                    </p>
                    <select
                      className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm mt-1"
                      value={marketplaceSettings.main_cuisine_type}
                      onChange={(e) => {
                        const newMain = e.target.value
                        setMarketplaceSettings((prev) => ({
                          ...prev,
                          main_cuisine_type: newMain,
                          // Ensure main cuisine is always in the cuisine_types array
                          cuisine_types: newMain && !prev.cuisine_types.includes(newMain)
                            ? [...prev.cuisine_types, newMain]
                            : prev.cuisine_types
                        }))
                      }}
                    >
                      <option value="">Seleccionar tipo principal...</option>
                      {cuisineTypes.map((ct) => (
                        <option key={ct.id} value={ct.name}>{ct.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Additional Cuisine Types Checkboxes */}
                  <div>
                    <Label>Tipos de Cocina Adicionales</Label>
                    <p className="text-xs text-muted-foreground mt-0.5 mb-2">
                      Selecciona otros tipos de cocina para aparecer en más filtros de busqueda.
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 border rounded-lg p-3 bg-slate-50 mt-1">
                      {cuisineTypes.map((ct) => {
                        const checked = marketplaceSettings.cuisine_types.includes(ct.name)
                        const isMain = marketplaceSettings.main_cuisine_type === ct.name
                        return (
                          <label key={ct.id} className={`flex items-center gap-2 cursor-pointer select-none ${isMain ? "opacity-50" : ""}`}>
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={isMain}
                              onChange={() => {
                                const next = checked
                                  ? marketplaceSettings.cuisine_types.filter((c) => c !== ct.name)
                                  : [...marketplaceSettings.cuisine_types, ct.name]
                                setMarketplaceSettings((prev) => ({ ...prev, cuisine_types: next }))
                              }}
                              className="rounded border-slate-300 text-black focus:ring-black disabled:opacity-50"
                            />
                            <span className="text-sm">{ct.name} {isMain && "(Principal)"}</span>
                          </label>
                        )
                      })}
                    </div>
                    {marketplaceSettings.cuisine_types.length > 0 && (
                      <p className="text-xs text-green-700 mt-1.5">
                        Filtros activos: {marketplaceSettings.cuisine_types.join(", ")}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <Label>Area / Zona</Label>
                  <select
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm mt-1"
                    value={marketplaceSettings.area}
                    onChange={(e) => setMarketplaceSettings((prev) => ({ ...prev, area: e.target.value }))}
                  >
                    <option value="">Seleccionar area...</option>
                    {MARKETPLACE_AREAS.map((area) => (
                      <option key={area} value={area}>{area}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">La zona donde se ubica tu restaurante para filtrar en el marketplace.</p>
                </div>

                <Button onClick={handleSaveMarketplaceSettings} className="bg-[#5d1f1f] hover:bg-[#4a1818]">
                  Guardar Configuracion del Mercado
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs */}

      {/* Menu Item Modal */}
      <Dialog open={showMenuItemModal} onOpenChange={setShowMenuItemModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Menu Item" : "Add Menu Item"}</DialogTitle>
            <DialogDescription>
              {editingItem ? "Update the details for your menu item." : "Enter the details for your new menu item."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              placeholder="Item Name"
              value={menuItemForm.name}
              onChange={(e) => setMenuItemForm({ ...menuItemForm, name: e.target.value })}
              required
            />
            <Textarea
              placeholder="Description"
              value={menuItemForm.description}
              onChange={(e) => setMenuItemForm({ ...menuItemForm, description: e.target.value })}
            />
            {/* Add bulk order fields to menu item form around line 2290 */}
            <Input
              placeholder="Price"
              type="number"
              step="0.01"
              value={menuItemForm.price}
              onChange={(e) => setMenuItemForm({ ...menuItemForm, price: e.target.value })}
              required
            />
            <div className="space-y-4 border p-4 rounded-lg bg-gray-50">
              <h4 className="text-sm font-semibold text-gray-700">Selling Unit & Pricing</h4>
              <div>
                <Label className="text-sm text-gray-600">Selling Unit</Label>
                <Select
                  value={menuItemForm.pricing_unit}
                  onValueChange={(value) => {
                    const isUnit = value !== "each"
                    setMenuItemForm({
                      ...menuItemForm,
                      pricing_unit: value,
                      is_bulk_order: value === "person" ? true : menuItemForm.is_bulk_order,
                      quantity_unit: getQuantityUnitValue(value),
                      per_unit_pricing: isUnit ? true : false,
                    })
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select selling unit" />
                  </SelectTrigger>
                  <SelectContent position="popper" className="max-h-[300px] overflow-y-auto">
                    {SELLING_UNITS.map((u) => (
                      <SelectItem key={u.key} value={u.key}>{u.adminLabel}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Choose how this item is sold: by tray, pound, per person, or as individual units.
                </p>
              </div>

              {/* Serves: show for non-each, non-person units */}
              {menuItemForm.pricing_unit && menuItemForm.pricing_unit !== "each" && menuItemForm.pricing_unit !== "person" && (
                <div className="pl-2 border-l-2 border-gray-200 ml-2">
                  <div>
                    <Label className="text-sm text-gray-600">Serves</Label>
                    <Input
                      type="text"
                      placeholder="e.g., 10 or 20-25"
                      value={menuItemForm.serves}
                      onChange={(e) => setMenuItemForm({ ...menuItemForm, serves: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      How many people does this serve? Use a range like 20-25 if needed.
                    </p>
                  </div>
                </div>
              )}
              {/* Minimum Quantity - available for ALL selling units */}
              <div className="pl-2 border-l-2 border-gray-200 ml-2 space-y-3">
                <div>
                  <Label className="text-sm text-gray-600">Cantidad Minima (Opcional)</Label>
                  <Input
                    type="number"
                    min="1"
                    placeholder="Dejar vacio si no aplica"
                    value={menuItemForm.min_quantity}
                    onChange={(e) => setMenuItemForm({ ...menuItemForm, min_quantity: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Si el item requiere una cantidad minima de orden. Ej: minimo 6 unidades, minimo 10 personas, minimo 2 bandejas.</p>
                </div>
                {/* Price per unit: for person, pound, and each/standard */}
                {(menuItemForm.pricing_unit === "person" || menuItemForm.pricing_unit === "pound" || menuItemForm.pricing_unit === "each" || !menuItemForm.pricing_unit) && (
                  <div>
                    <Label className="text-sm text-gray-600">Precio por {menuItemForm.pricing_unit === "person" ? "persona" : menuItemForm.pricing_unit === "pound" ? "libra" : "unidad"} ($)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder={menuItemForm.pricing_unit === "person" ? "e.g., 7.90 per guest" : menuItemForm.pricing_unit === "pound" ? "e.g., 12.00 per pound" : "e.g., 2.50 por unidad"}
                      value={menuItemForm.per_unit_price}
                      onChange={(e) => setMenuItemForm({ ...menuItemForm, per_unit_price: e.target.value })}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4 border p-4 rounded-lg bg-blue-50">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_cart_upsell"
                  checked={menuItemForm.is_cart_upsell || false}
                  onChange={(e) =>
                    setMenuItemForm({
                      ...menuItemForm,
                      is_cart_upsell: e.target.checked,
                    })
                  }
                  className="h-4 w-4"
                />
                <label htmlFor="is_cart_upsell" className="text-sm font-medium">
                  Show as Cart Upsell (displayed in cart as optional add-on like cooler bags, utensils, etc.)
                </label>
              </div>
              <p className="text-xs text-gray-600 pl-6">
                Cart upsells appear at the bottom of the shopping cart and can be added with one click. Perfect for
                items like cooler bags, utensil sets, or beverages.
              </p>
            </div>

            {/* Container / Delivery Section */}
            <div className="border-t pt-4 space-y-3">
              <Label className="text-sm font-semibold">Contenedor para Delivery</Label>
              <p className="text-xs text-gray-500">Define como se empaca este item para calcular la tarifa de delivery.</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Tipo de Contenedor</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                    value={menuItemForm.container_type}
                    onChange={(e) => setMenuItemForm({ ...menuItemForm, container_type: e.target.value })}
                  >
  <option value="none">Ninguno (no cuenta para delivery)</option>
  {CONTAINER_TYPES.map((c) => (
    <option key={c.key} value={c.key}>{c.label}</option>
  ))}
  </select>
                </div>
                {menuItemForm.container_type !== "none" && (
                  <div>
                    <Label className="text-xs">Contenedores por Unidad</Label>
                    <Input
                      type="number"
                      min="1"
                      step="1"
                      value={menuItemForm.containers_per_unit}
                      onChange={(e) => setMenuItemForm({ ...menuItemForm, containers_per_unit: e.target.value })}
                      className="h-9"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Normalmente 1. Usa 2 si un item grande ocupa 2 contenedores.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lead_time_hours">
                Custom Lead Time (hours)
                <span className="text-sm text-muted-foreground ml-2">
                  Optional - Leave empty to use restaurant default ({settingsForm.lead_time_hours || 24}h)
                </span>
              </Label>
              <Input
                id="lead_time_hours"
                type="number"
                min="0"
                placeholder={`Default: ${settingsForm.lead_time_hours || 24} hours`}
                value={menuItemForm.lead_time_hours || ""}
                onChange={(e) =>
                  setMenuItemForm({
                    ...menuItemForm,
                    lead_time_hours: e.target.value,
                  })
                }
              />
              <p className="text-xs text-muted-foreground">
                Set a custom preorder requirement for this item (e.g., 48 hours for Jelati cakes). This overrides the
                restaurant's default lead time.
              </p>
            </div>

            <ImageUpload
              label="Item Image"
              value={menuItemForm.image_url}
              onChange={(url) => setMenuItemForm({ ...menuItemForm, image_url: url || "" })}
              onRemove={() => setMenuItemForm({ ...menuItemForm, image_url: "" })}
            />
            <Select
              onValueChange={(value) => setMenuItemForm({ ...menuItemForm, category_id: value })}
              value={menuItemForm.category_id}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Category" />
              </SelectTrigger>
              <SelectContent>
                {categories
                  .filter((cat) => cat.id !== "SERVICE_PACKAGES") // Exclude SERVICE_PACKAGES from menu item categories
                  .map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowMenuItemModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveMenuItem}>
              {editingItem ? "Save Changes" : "Add Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Service Package Add/Edit Modal */}
      <Dialog open={showPackageModal} onOpenChange={setShowPackageModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPackage ? "Edit Service Package" : "Add Service Package"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Package Name</Label>
                <Input
                  placeholder="e.g., Full Service, Drop-Off"
                  value={packageForm.name}
                  onChange={(e) => setPackageForm({ ...packageForm, name: e.target.value })}
                />
              </div>
              <div>
                <Label>Base Price ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={packageForm.base_price || ""}
                  onChange={(e) => setPackageForm({ ...packageForm, base_price: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <textarea
                className="w-full border rounded-lg p-3 text-sm focus:outline-none focus:ring-2 resize-y min-h-[60px]"
                placeholder="Describe what this package includes..."
                value={packageForm.description}
                onChange={(e) => setPackageForm({ ...packageForm, description: e.target.value })}
                rows={2}
              />
            </div>
            <div>
              <Label>Package Image (optional)</Label>
              <ImageUpload
                value={packageForm.image_url}
                onChange={(url) => setPackageForm({ ...packageForm, image_url: url })}
                onRemove={() => setPackageForm({ ...packageForm, image_url: "" })}
                label="Package Image"
              />
            </div>

            {/* Inclusions */}
            <div>
              <Label className="text-sm font-semibold">Inclusions</Label>
              <p className="text-xs text-muted-foreground mb-2">What is included in this package</p>
              <div className="space-y-2">
                {packageForm.inclusions.map((inc, idx) => (
                  <div key={inc.id} className={`flex gap-2 items-center ${inc.is_active === false ? "opacity-50" : ""}`}>
                    <div className="flex flex-col">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0"
                        disabled={idx === 0}
                        onClick={() => {
                          const updated = [...packageForm.inclusions]
                          ;[updated[idx - 1], updated[idx]] = [updated[idx], updated[idx - 1]]
                          setPackageForm({ ...packageForm, inclusions: updated })
                        }}
                      >
                        <ChevronUp className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0"
                        disabled={idx === packageForm.inclusions.length - 1}
                        onClick={() => {
                          const updated = [...packageForm.inclusions]
                          ;[updated[idx], updated[idx + 1]] = [updated[idx + 1], updated[idx]]
                          setPackageForm({ ...packageForm, inclusions: updated })
                        }}
                      >
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    </div>
                    <Switch
                      checked={inc.is_active !== false}
                      onCheckedChange={(checked) => {
                        const updated = [...packageForm.inclusions]
                        updated[idx] = { ...updated[idx], is_active: checked }
                        setPackageForm({ ...packageForm, inclusions: updated })
                      }}
                    />
                    <Input
                      placeholder="e.g., Plates & Utensils, Setup & Cleanup"
                      className="flex-1"
                      value={inc.description}
                      onChange={(e) => {
                        const updated = [...packageForm.inclusions]
                        updated[idx] = { ...updated[idx], description: e.target.value }
                        setPackageForm({ ...packageForm, inclusions: updated })
                      }}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 px-2 text-red-500"
                      onClick={() => {
                        setPackageForm({ ...packageForm, inclusions: packageForm.inclusions.filter((_, i) => i !== idx) })
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    setPackageForm({
                      ...packageForm,
                      inclusions: [...packageForm.inclusions, { id: crypto.randomUUID(), description: "", is_active: true }],
                    })
                  }}
                >
                  <Plus className="h-3 w-3 mr-1" /> Add Inclusion
                </Button>
              </div>
            </div>

            {/* Addons */}
            <div>
              <Label className="text-sm font-semibold">Add-ons</Label>
              <p className="text-xs text-muted-foreground mb-2">Optional extras customers can add</p>
              <div className="space-y-3">
                {packageForm.addons.map((addon, idx) => (
                  <div key={addon.id} className={`border rounded-lg p-3 bg-gray-50 space-y-2 ${addon.is_active === false ? "opacity-50" : ""}`}>
                    <div className="flex gap-2 items-start">
                      <div className="flex flex-col mt-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0"
                          disabled={idx === 0}
                          onClick={() => {
                            const updated = [...packageForm.addons]
                            ;[updated[idx - 1], updated[idx]] = [updated[idx], updated[idx - 1]]
                            setPackageForm({ ...packageForm, addons: updated })
                          }}
                        >
                          <ChevronUp className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0"
                          disabled={idx === packageForm.addons.length - 1}
                          onClick={() => {
                            const updated = [...packageForm.addons]
                            ;[updated[idx], updated[idx + 1]] = [updated[idx + 1], updated[idx]]
                            setPackageForm({ ...packageForm, addons: updated })
                          }}
                        >
                          <ChevronDown className="h-3 w-3" />
                        </Button>
                      </div>
                      <Switch
                        className="mt-1"
                        checked={addon.is_active !== false}
                        onCheckedChange={(checked) => {
                          const updated = [...packageForm.addons]
                          updated[idx] = { ...updated[idx], is_active: checked }
                          setPackageForm({ ...packageForm, addons: updated })
                        }}
                      />
                      <div className="flex-1 grid grid-cols-3 gap-2">
                        <Input
                          placeholder="Add-on name"
                          value={addon.name}
                          onChange={(e) => {
                            const updated = [...packageForm.addons]
                            updated[idx] = { ...updated[idx], name: e.target.value }
                            setPackageForm({ ...packageForm, addons: updated })
                          }}
                        />
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Price per unit"
                          value={addon.price_per_unit || ""}
                          onChange={(e) => {
                            const updated = [...packageForm.addons]
                            updated[idx] = { ...updated[idx], price_per_unit: parseFloat(e.target.value) || 0 }
                            setPackageForm({ ...packageForm, addons: updated })
                          }}
                        />
                        <Input
                          placeholder="Unit (e.g., person, item)"
                          value={addon.unit}
                          onChange={(e) => {
                            const updated = [...packageForm.addons]
                            updated[idx] = { ...updated[idx], unit: e.target.value }
                            setPackageForm({ ...packageForm, addons: updated })
                          }}
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 px-2 text-red-500"
                        onClick={() => {
                          setPackageForm({ ...packageForm, addons: packageForm.addons.filter((_, i) => i !== idx) })
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    {/* Addon Choices */}
                    {addon.choices && addon.choices.length > 0 && (
                      <div className="ml-4 space-y-1">
                        <Label className="text-xs">Choices</Label>
                        {addon.choices.map((choice, cidx) => (
                          <div key={choice.id} className="flex gap-2 items-center">
                            <div className="flex flex-col gap-0.5 shrink-0">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-4 w-4 p-0"
                                disabled={cidx === 0}
                                onClick={() => {
                                  const updated = [...packageForm.addons]
                                  const updatedChoices = [...(updated[idx].choices || [])]
                                  const [moved] = updatedChoices.splice(cidx, 1)
                                  updatedChoices.splice(cidx - 1, 0, moved)
                                  updated[idx] = { ...updated[idx], choices: updatedChoices }
                                  setPackageForm({ ...packageForm, addons: updated })
                                }}
                              >
                                <ChevronUp className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-4 w-4 p-0"
                                disabled={cidx === (addon.choices?.length || 0) - 1}
                                onClick={() => {
                                  const updated = [...packageForm.addons]
                                  const updatedChoices = [...(updated[idx].choices || [])]
                                  const [moved] = updatedChoices.splice(cidx, 1)
                                  updatedChoices.splice(cidx + 1, 0, moved)
                                  updated[idx] = { ...updated[idx], choices: updatedChoices }
                                  setPackageForm({ ...packageForm, addons: updated })
                                }}
                              >
                                <ChevronDown className="h-3 w-3" />
                              </Button>
                            </div>
                            <Input
                              placeholder="Choice name"
                              className="flex-1 h-8 text-xs"
                              value={choice.name}
                              onChange={(e) => {
                                const updated = [...packageForm.addons]
                                const updatedChoices = [...(updated[idx].choices || [])]
                                updatedChoices[cidx] = { ...updatedChoices[cidx], name: e.target.value }
                                updated[idx] = { ...updated[idx], choices: updatedChoices }
                                setPackageForm({ ...packageForm, addons: updated })
                              }}
                            />
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="+$0.00"
                              className="w-20 h-8 text-xs"
                              value={choice.price_modifier || ""}
                              onChange={(e) => {
                                const updated = [...packageForm.addons]
                                const updatedChoices = [...(updated[idx].choices || [])]
                                updatedChoices[cidx] = { ...updatedChoices[cidx], price_modifier: parseFloat(e.target.value) || 0 }
                                updated[idx] = { ...updated[idx], choices: updatedChoices }
                                setPackageForm({ ...packageForm, addons: updated })
                              }}
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-1 text-red-500"
                              onClick={() => {
                                const updated = [...packageForm.addons]
                                updated[idx] = { ...updated[idx], choices: (updated[idx].choices || []).filter((_, i) => i !== cidx) }
                                setPackageForm({ ...packageForm, addons: updated })
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => {
                        const updated = [...packageForm.addons]
                        updated[idx] = {
                          ...updated[idx],
                          choices: [...(updated[idx].choices || []), { id: crypto.randomUUID(), name: "", price_modifier: 0 }],
                        }
                        setPackageForm({ ...packageForm, addons: updated })
                      }}
                    >
                      <Plus className="h-3 w-3 mr-1" /> Add Choice
                    </Button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setPackageForm({
                        ...packageForm,
                        addons: [
                          ...packageForm.addons,
                          { id: crypto.randomUUID(), name: "", price_per_unit: 0, unit: "person", choices: [] },
                        ],
                      })
                    }}
                  >
                    <Plus className="h-3 w-3 mr-1" /> Add Add-on
                  </Button>
                  {servicePackages.length > 1 && editingPackage && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        loadAvailableAddons()
                        setShowBrowseAddons(true)
                      }}
                    >
                      <Search className="h-3 w-3 mr-1" /> Browse Existing
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => { setShowPackageModal(false); resetPackageForm() }}>
              Cancel
            </Button>
            <Button onClick={handleSavePackage}>
              {editingPackage ? "Save Changes" : "Create Package"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category Add/Edit Modal */}
      <Dialog open={showCategoryModal} onOpenChange={setShowCategoryModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCategory ? "Edit Category" : "Add Category"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Category Name</Label>
              <Input
                placeholder="e.g., Arroces, Carnes, Combos"
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Input
                placeholder="Brief description of this category"
                value={categoryForm.description}
                onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-sm font-semibold uppercase tracking-wide">Category Header Image</Label>
              <ImageUpload
                value={categoryForm.header_image_url}
                onChange={(url) => setCategoryForm({ ...categoryForm, header_image_url: url })}
                onRemove={() => setCategoryForm({ ...categoryForm, header_image_url: "" })}
                label="Category Header Image"
              />
            </div>
            <div>
              <Label className="text-sm font-semibold uppercase tracking-wide mb-2 block">Visible on Days</Label>
              <p className="text-xs text-muted-foreground mb-2">For daily specials, select which days this category should appear</p>
              <div className="flex gap-1">
                {[
                  { key: "sun", label: "D" },
                  { key: "mon", label: "L" },
                  { key: "tue", label: "M" },
                  { key: "wed", label: "W" },
                  { key: "thu", label: "J" },
                  { key: "fri", label: "V" },
                  { key: "sat", label: "S" },
                ].map((day) => (
                  <button
                    key={day.key}
                    type="button"
                    onClick={() => {
                      const newDays = { ...categoryForm.available_days, [day.key]: !categoryForm.available_days[day.key] }
                      setCategoryForm({ ...categoryForm, available_days: newDays })
                    }}
                    className={`w-8 h-8 rounded text-xs font-bold transition-colors ${
                      categoryForm.available_days[day.key]
                        ? "bg-emerald-500 text-white"
                        : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowCategoryModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveCategory}>
              {editingCategory ? "Save Changes" : "Add Category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Browse Sizes to Copy Modal */}
      <Dialog open={showBrowseSizes} onOpenChange={setShowBrowseSizes}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Copy Sizes from Another Item</DialogTitle>
            <DialogDescription>
              Select sizes from other menu items to add to {currentItemForSizes?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {loadingAvailableSizes ? (
              <p className="text-center py-8 text-muted-foreground">Loading available sizes...</p>
            ) : availableSizes.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No sizes found on other menu items.</p>
            ) : (
              <div className="space-y-4">
                {/* Group by menu item */}
                {Object.entries(
                  availableSizes.reduce(
                    (groups, item) => {
                      const key = item.menuItemId
                      if (!groups[key]) groups[key] = { name: item.menuItemName, sizes: [] }
                      groups[key].sizes.push(item.size)
                      return groups
                    },
                    {} as Record<string, { name: string; sizes: any[] }>,
                  ),
                ).map(([menuItemId, group]) => {
                  const existingNames = new Set(itemSizes.map((s) => s.name.toLowerCase()))
                  const allAlreadyAdded = group.sizes.every((s) => existingNames.has(s.name.toLowerCase()))

                  return (
                    <div key={menuItemId} className="border rounded-lg overflow-hidden">
                      <div className="flex items-center justify-between bg-gray-50 px-3 py-2 border-b">
                        <h4 className="font-semibold text-sm">{group.name}</h4>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          disabled={allAlreadyAdded}
                          onClick={() => handleCopyAllSizesFromItem(menuItemId)}
                        >
                          {allAlreadyAdded ? "All Added" : "Copy All"}
                        </Button>
                      </div>
                      <div className="divide-y">
                        {group.sizes.map((size) => {
                          const alreadyAdded = existingNames.has(size.name.toLowerCase())
                          return (
                            <div key={size.id} className="flex items-center justify-between px-3 py-2">
                              <div>
                                <span className="text-sm font-medium">{size.name}</span>
                                <span className="text-sm text-muted-foreground ml-2">
                                  ${size.price.toFixed(2)}
                                  {size.serves > 1 && ` - Sirve ${size.serves}`}
                                </span>
                              </div>
                              {alreadyAdded ? (
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-medium">
                                  Already Added
                                </span>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs"
                                  onClick={() => handleAddExistingSize(size)}
                                >
                                  Add
                                </Button>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBrowseSizes(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Browse Addons to Copy Modal */}
      <Dialog open={showBrowseAddons} onOpenChange={setShowBrowseAddons}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Copy Add-ons from Another Package</DialogTitle>
            <DialogDescription>
              Select add-ons from other service packages to add to your current package.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {loadingAvailableAddons ? (
              <p className="text-center py-8 text-muted-foreground">Loading available add-ons...</p>
            ) : availableAddons.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No add-ons found on other service packages.</p>
            ) : (
              <div className="space-y-4">
                {/* Group by package */}
                {Object.entries(
                  availableAddons.reduce(
                    (groups, item) => {
                      const key = item.packageId
                      if (!groups[key]) groups[key] = { name: item.packageName, addons: [] }
                      groups[key].addons.push(item.addon)
                      return groups
                    },
                    {} as Record<string, { name: string; addons: any[] }>,
                  ),
                ).map(([packageId, group]) => {
                  const existingNames = new Set(packageForm.addons.map((a: any) => a.name.toLowerCase()))
                  const allAlreadyAdded = group.addons.every((a) => existingNames.has(a.name.toLowerCase()))

                  return (
                    <div key={packageId} className="border rounded-lg overflow-hidden">
                      <div className="flex items-center justify-between bg-gray-50 px-3 py-2 border-b">
                        <h4 className="font-semibold text-sm">{group.name}</h4>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          disabled={allAlreadyAdded}
                          onClick={() => handleCopyAllAddonsFromPackage(packageId)}
                        >
                          {allAlreadyAdded ? "All Added" : "Copy All"}
                        </Button>
                      </div>
                      <div className="divide-y">
                        {group.addons.map((addon) => {
                          const alreadyAdded = existingNames.has(addon.name.toLowerCase())
                          return (
                            <div key={addon.id} className="flex items-center justify-between px-3 py-2">
                              <div>
                                <span className="text-sm font-medium">{addon.name}</span>
                                <span className="text-sm text-muted-foreground ml-2">
                                  ${Number(addon.price_per_unit || 0).toFixed(2)}/{addon.unit || "unit"}
                                </span>
                              </div>
                              {alreadyAdded ? (
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-medium">
                                  Already Added
                                </span>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs"
                                  onClick={() => handleAddExistingAddon(addon)}
                                >
                                  Add
                                </Button>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBrowseAddons(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Options Manager Modal */}
      <Dialog open={showOptionsModal} onOpenChange={setShowOptionsModal}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Options - {currentItemForOptions?.name}</DialogTitle>
            <DialogDescription>Add, edit, or remove customization options for this item.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Existing Options List */}
            {itemOptions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4 border rounded-lg bg-gray-50">
                No options defined yet. Add an option below or copy from another item.
              </p>
            ) : (
              <div className="space-y-3">
                {itemOptions.map((option) => (
                  <div
                    key={option.id}
                    className="border rounded-lg p-3 hover:bg-gray-50 transition-colors"
                    draggable
                    onDragStart={(e) => handleOptionDragStart(e, option.id)}
                    onDragOver={handleOptionDragOver}
                    onDrop={(e) => handleOptionDrop(e, option.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-4 w-4 text-gray-400 cursor-grab" />
                        <div>
                          <span className="font-semibold text-sm">{option.category}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            {option.is_required ? "(Required)" : "(Optional)"}
                            {" - "}
                            {option.display_type || "pills"}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleCopyOption(option)
                          }}
                        >
                          Copy
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                          onClick={(e) => {
                            e.stopPropagation()
                            setEditingOption(option)
                            setOptionForm({
                              option_name: option.category || "",
                              option_type: (option.max_selection || 1) > 1 ? "multiple" : "single",
                              display_type: option.display_type || "pills",
                              is_required: option.is_required || false,
                              min_selection: String(option.min_selection || 0),
                              max_selection: String(option.max_selection || 1),
                              choices: (option.choices || []).map((c: any) => ({
                                id: c.id || crypto.randomUUID(),
                                choice_name: c.name || "",
                                price_modifier: String(c.price_modifier || 0),
                                parent_choice_id: c.parent_choice_id || "none",
                                description: c.description || "",
                              })),
                            })
                            setShowOptionForm(true)
                          }}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-red-600 hover:text-red-700"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteOption(option.id)
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    {/* Choices preview */}
                    {option.choices && option.choices.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {option.choices.map((choice: any) => (
                          <span key={choice.id} className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                            {choice.name}{choice.price_modifier ? ` (+$${Number(choice.price_modifier).toFixed(2)})` : ""}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Copy options from another item */}
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                loadAvailableOptions()
                setShowBrowseOptions(true)
              }}
            >
              Copy Options from Another Item
            </Button>

            {/* Add / Edit Option Form Toggle */}
            {!showOptionForm ? (
              <Button
                variant="default"
                size="sm"
                className="w-full"
                onClick={() => {
                  resetOptionForm()
                  setShowOptionForm(true)
                }}
              >
                <Plus className="h-3 w-3 mr-1" /> Add New Option
              </Button>
            ) : (
              <div className="border rounded-lg p-4 space-y-3 bg-gray-50">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm">{editingOption ? "Edit Option" : "New Option"}</h4>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { resetOptionForm(); setShowOptionForm(false) }}>
                    Cancel
                  </Button>
                </div>
                <div>
                  <Label className="text-xs">Option Name</Label>
                  <Input
                    placeholder="e.g., Side Choice, Salsa Type, Protein"
                    value={optionForm.option_name}
                    onChange={(e) => setOptionForm({ ...optionForm, option_name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Display Type</Label>
                    <Select value={optionForm.display_type} onValueChange={(v) => setOptionForm({ ...optionForm, display_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pills">Pills</SelectItem>
                        <SelectItem value="dropdown">Dropdown</SelectItem>
                        <SelectItem value="grid">Grid</SelectItem>
                        <SelectItem value="list">List</SelectItem>
                        <SelectItem value="counter">Counter / Cantidad por opcion</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end gap-2 pb-1">
                    <Checkbox
                      id="option-required"
                      checked={optionForm.is_required}
                      onCheckedChange={(checked) => setOptionForm({ ...optionForm, is_required: checked as boolean })}
                    />
                    <Label htmlFor="option-required" className="text-xs">Required</Label>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Min Selections</Label>
                    <Input
                      type="number"
                      min="0"
                      value={optionForm.min_selection}
                      onChange={(e) => setOptionForm({ ...optionForm, min_selection: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Max Selections</Label>
                    <Input
                      type="number"
                      min="1"
                      value={optionForm.max_selection}
                      onChange={(e) => setOptionForm({ ...optionForm, max_selection: e.target.value })}
                    />
                  </div>
                </div>

                {/* Choices */}
                <div>
                  <Label className="text-xs font-semibold">Choices</Label>
                  <div className="space-y-2 mt-1">
                    {optionForm.choices.map((choice, idx) => (
                      <div key={choice.id} className="flex gap-2 items-center">
                        <div className="flex flex-col gap-0.5 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0"
                            disabled={idx === 0}
                            onClick={() => {
                              const newChoices = [...optionForm.choices]
                              const [moved] = newChoices.splice(idx, 1)
                              newChoices.splice(idx - 1, 0, moved)
                              setOptionForm({ ...optionForm, choices: newChoices })
                            }}
                          >
                            <ChevronUp className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0"
                            disabled={idx === optionForm.choices.length - 1}
                            onClick={() => {
                              const newChoices = [...optionForm.choices]
                              const [moved] = newChoices.splice(idx, 1)
                              newChoices.splice(idx + 1, 0, moved)
                              setOptionForm({ ...optionForm, choices: newChoices })
                            }}
                          >
                            <ChevronDown className="h-3 w-3" />
                          </Button>
                        </div>
                        <Input
                          placeholder="Choice name"
                          className="flex-1"
                          value={choice.choice_name}
                          onChange={(e) => {
                            const newChoices = [...optionForm.choices]
                            newChoices[idx] = { ...newChoices[idx], choice_name: e.target.value }
                            setOptionForm({ ...optionForm, choices: newChoices })
                          }}
                        />
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="+$0.00"
                          className="w-24"
                          value={choice.price_modifier}
                          onChange={(e) => {
                            const newChoices = [...optionForm.choices]
                            newChoices[idx] = { ...newChoices[idx], price_modifier: e.target.value }
                            setOptionForm({ ...optionForm, choices: newChoices })
                          }}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-9 px-2 text-red-500"
                          onClick={() => {
                            const newChoices = optionForm.choices.filter((_, i) => i !== idx)
                            setOptionForm({ ...optionForm, choices: newChoices })
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        setOptionForm({
                          ...optionForm,
                          choices: [...optionForm.choices, { id: crypto.randomUUID(), choice_name: "", price_modifier: "0", parent_choice_id: "none", description: "" }],
                        })
                      }}
                    >
                      <Plus className="h-3 w-3 mr-1" /> Add Choice
                    </Button>
                  </div>
                </div>

                <Button className="w-full" onClick={handleSaveOption}>
                  {editingOption ? "Update Option" : "Save Option"}
                </Button>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowOptionsModal(false); setShowOptionForm(false); resetOptionForm() }}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Browse Options to Copy Modal */}
      <Dialog open={showBrowseOptions} onOpenChange={setShowBrowseOptions}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Copy Options from Another Item</DialogTitle>
            <DialogDescription>
              Select options from other menu items to add to {currentItemForOptions?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {loadingAvailableOptions ? (
              <p className="text-center py-8 text-muted-foreground">Loading available options...</p>
            ) : availableOptions.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No options found on other menu items.</p>
            ) : (
              <div className="space-y-4">
                {Object.entries(
                  availableOptions.reduce(
                    (groups, item) => {
                      const key = item.menuItemId
                      if (!groups[key]) groups[key] = { name: item.menuItemName, options: [] }
                      groups[key].options.push(item.option)
                      return groups
                    },
                    {} as Record<string, { name: string; options: any[] }>,
                  ),
                ).map(([menuItemId, group]) => (
                  <div key={menuItemId} className="border rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-3 py-2 border-b">
                      <h4 className="font-semibold text-sm">{group.name}</h4>
                    </div>
                    <div className="divide-y">
                      {group.options.map((option) => {
                        const alreadyAdded = itemOptions.some(
                          (o) => o.category?.toLowerCase() === option.category?.toLowerCase()
                        )
                        return (
                          <div key={option.id} className="flex items-center justify-between px-3 py-2">
                            <div>
                              <span className="text-sm font-medium">{option.category}</span>
                              <span className="text-xs text-muted-foreground ml-2">
                                {option.item_option_choices?.length || 0} choices
                              </span>
                            </div>
                            {alreadyAdded ? (
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-medium">
                                Already Added
                              </span>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => handleAddExistingOption(option.id)}
                              >
                                Add
                              </Button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBrowseOptions(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Copy Option Modal */}
      <Dialog open={showCopyOptionModal} onOpenChange={setShowCopyOptionModal}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Copy Option "{optionToCopy?.category}"</DialogTitle>
            <DialogDescription>Select menu items to copy this option to.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label className="font-semibold mb-3">Select Target Menu Items:</Label>
            <div className="space-y-2 max-h-64 overflow-y-auto border p-3 rounded-md">
              {/* Fetch all menu items for the restaurant */}
              {menuItems.map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedTargetItems.includes(item.id)}
                    onChange={() => toggleTargetItem(item.id)}
                    className="form-checkbox h-4 w-4 text-blue-600"
                  />
                  <Label>
                    {item.name} (Category:{" "}
                    {categories.find((cat) => cat.id === item.category_id)?.name || "Uncategorized"})
                  </Label>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCopyOptionModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmCopyOption} className="bg-[#5d1f1f] hover:bg-[#4a1818]">
              Copy Option
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Size Manager Modal */}
      <Dialog open={showSizesModal} onOpenChange={setShowSizesModal}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Sizes - {currentItemForSizes?.name}</DialogTitle>
            <DialogDescription>
              Add size variants (e.g., Medium, Large) with different prices and serving amounts.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Existing sizes list */}
            {itemSizes.length > 0 && (
              <div className="border rounded-lg divide-y">
                {itemSizes.map((size) => (
                  <div key={size.id} className="flex items-center justify-between px-3 py-2 group hover:bg-gray-50">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{size.name}</span>
                        {size.is_default && (
                          <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">Default</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        ${size.price.toFixed(2)}
                        {size.serves && ` - Serves ${size.serves}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => handleEditSize(size)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                        onClick={() => handleDeleteSize(size.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {itemSizes.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4 border rounded-lg bg-gray-50">
                No sizes defined yet. Add a size below or copy from another item.
              </p>
            )}

            {/* Copy sizes from another item */}
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                loadAvailableSizes()
                setShowBrowseSizes(true)
              }}
            >
              Copy Sizes from Another Item
            </Button>

            {/* Add / Edit size form */}
            <div className="border rounded-lg p-3 bg-gray-50 space-y-3">
              <h4 className="text-sm font-semibold">{editingSizeId ? "Edit Size" : "Add New Size"}</h4>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs">Name</Label>
                  <Input
                    placeholder="e.g., Medium"
                    value={sizeForm.name}
                    onChange={(e) => setSizeForm({ ...sizeForm, name: e.target.value })}
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Price ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="150.00"
                    value={sizeForm.price}
                    onChange={(e) => setSizeForm({ ...sizeForm, price: e.target.value })}
                    className="h-8 text-sm"
                  />
                </div>
                <div>
  <Label className="text-xs">Serves</Label>
  <Input
  type="text"
  placeholder="10 or 20-25"
  value={sizeForm.serves}
  onChange={(e) => setSizeForm({ ...sizeForm, serves: e.target.value })}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="size-is-default"
                  checked={sizeForm.is_default}
                  onChange={(e) => setSizeForm({ ...sizeForm, is_default: e.target.checked })}
                  className="h-4 w-4"
                />
                <label htmlFor="size-is-default" className="text-sm">Default size (pre-selected for customers)</label>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveSize} className="bg-[#5d1f1f] hover:bg-[#4a1818]">
                  {editingSizeId ? "Update Size" : "Add Size"}
                </Button>
                {editingSizeId && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingSizeId(null)
                      setSizeForm({ name: "", price: "", serves: "", is_default: false })
                    }}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSizesModal(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delivery Zone Modal */}
      <Dialog open={showZoneModal} onOpenChange={setShowZoneModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingZone ? "Edit Delivery Zone" : "Add Delivery Zone"}</DialogTitle>
            <DialogDescription>
              {editingZone ? "Update delivery zone details." : "Enter delivery zone details."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              placeholder="Zone Name (e.g., Downtown, Suburb)"
              value={zoneForm.zone_name}
              onChange={(e) => setZoneForm({ ...zoneForm, zone_name: e.target.value })}
              required
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Min Distance (miles)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={zoneForm.min_distance}
                  onChange={(e) => setZoneForm({ ...zoneForm, min_distance: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Max Distance (miles)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={zoneForm.max_distance}
                  onChange={(e) => setZoneForm({ ...zoneForm, max_distance: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Base Delivery Fee ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={zoneForm.base_fee}
                  onChange={(e) => setZoneForm({ ...zoneForm, base_fee: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Per Item Surcharge ($)</Label>
                <p className="text-xs text-gray-500">Applied per item after a certain quantity</p>
                <Input
                  type="number"
                  step="0.01"
                  value={zoneForm.per_item_surcharge}
                  onChange={(e) => setZoneForm({ ...zoneForm, per_item_surcharge: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Min Items for Surcharge</Label>
              <Input
                type="number"
                value={zoneForm.min_items_for_surcharge}
                onChange={(e) => setZoneForm({ ...zoneForm, min_items_for_surcharge: e.target.value })}
                disabled={Number.parseFloat(zoneForm.per_item_surcharge) === 0}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={zoneForm.is_active}
                onCheckedChange={(checked) => setZoneForm({ ...zoneForm, is_active: checked })}
              />
              <Label>Zone is Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowZoneModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveZone} className="bg-[#5d1f1f] hover:bg-[#4a1818]">
              Save Zone
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Import Modal */}
      <CSVUploadModal open={showBulkImportModal} onOpenChange={setShowBulkImportModal} onImport={handleCSVImport} />

      {/* Branch Create/Edit Dialog */}
      <Dialog open={branchDialogOpen} onOpenChange={setBranchDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingBranch ? "Editar Sucursal" : "Nueva Sucursal"}</DialogTitle>
            <DialogDescription>
              {editingBranch ? "Actualiza los detalles de esta sucursal." : "Agrega una nueva sucursal. Deja campos vacios para usar los valores del restaurante principal."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5">

            {/* --- General Info --- */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Informacion General</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nombre *</Label>
                  <Input value={branchForm.name} onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })} placeholder="Nombre de Sucursal" />
                </div>
                <div>
                  <Label>Slug *</Label>
                  <Input value={branchForm.slug} onChange={(e) => setBranchForm({ ...branchForm, slug: e.target.value })} placeholder="bayamon" />
                  <p className="text-xs text-muted-foreground mt-1">Identificador URL (auto-lowercase)</p>
                </div>
              </div>
            </div>

            {/* --- Location & Contact --- */}
            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Ubicacion y Contacto</h3>
              <div className="space-y-3">
                <div>
                  <Label>Direccion</Label>
                  <Input value={branchForm.address} onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })} placeholder="Número de Casa o Edificio, Calle" />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Ciudad</Label>
                    <Input value={branchForm.city} onChange={(e) => setBranchForm({ ...branchForm, city: e.target.value })} placeholder="Bayamon" />
                  </div>
                  <div>
                    <Label>Estado</Label>
                    <Input value={branchForm.state} onChange={(e) => setBranchForm({ ...branchForm, state: e.target.value })} placeholder="PR" />
                  </div>
                  <div>
  <Label>Codigo Postal</Label>
  <Input value={branchForm.zip} onChange={(e) => setBranchForm({ ...branchForm, zip: e.target.value })} placeholder="00959" />
  </div>
  </div>
  <div>
    <Label>Area / Zona</Label>
    <Select value={branchForm.area} onValueChange={(value) => setBranchForm({ ...branchForm, area: value })}>
      <SelectTrigger><SelectValue placeholder="Seleccionar area..." /></SelectTrigger>
      <SelectContent>
        {MARKETPLACE_AREAS.map((area) => (
          <SelectItem key={area} value={area}>{area}</SelectItem>
        ))}
      </SelectContent>
    </Select>
    <p className="text-xs text-muted-foreground mt-1">La zona donde se ubica esta sucursal.</p>
  </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Telefono</Label>
                    <Input value={branchForm.phone} onChange={(e) => setBranchForm({ ...branchForm, phone: e.target.value })} placeholder="787-555-0123" />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input type="email" value={branchForm.email} onChange={(e) => setBranchForm({ ...branchForm, email: e.target.value })} placeholder="sucursal@ejemplo.com" />
                  </div>
                </div>
              </div>
            </div>

            {/* --- Branding & Design --- */}
            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Marca y Diseno</h3>
              <p className="text-xs text-muted-foreground mb-3">Deja vacio para usar los valores del restaurante principal.</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Branch Image</Label>
                  <ImageUpload
                    value={branchForm.image_url || ""}
                    onChange={(url) => setBranchForm({ ...branchForm, image_url: url })}
                    onRemove={() => setBranchForm({ ...branchForm, image_url: "" })}
                    label="Branch Image"
                  />
                </div>
                <div>
                  <Label>Logo (override)</Label>
                  <ImageUpload
                    value={branchForm.logo_url || ""}
                    onChange={(url) => setBranchForm({ ...branchForm, logo_url: url })}
                    onRemove={() => setBranchForm({ ...branchForm, logo_url: "" })}
                    label="Logo"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div>
                  <Label>Color Primario</Label>
                  <div className="flex items-center gap-2">
                    <Input value={branchForm.primary_color} onChange={(e) => setBranchForm({ ...branchForm, primary_color: e.target.value })} placeholder="Default del restaurante" className="flex-1" />
                    {branchForm.primary_color && <div className="w-8 h-8 rounded border" style={{ backgroundColor: branchForm.primary_color }} />}
                  </div>
                </div>
                <div>
                  <Label>Plantilla de Diseno</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={branchForm.design_template}
                    onChange={(e) => setBranchForm({ ...branchForm, design_template: e.target.value })}
                  >
                    <option value="">Default del restaurante</option>
                    <option value="modern">Moderno</option>
                    <option value="classic">Clasico</option>
                    <option value="elegant">Elegante</option>
                  </select>
                </div>
              </div>
              <div className="mt-3">
                <Label>Dominio Independiente</Label>
                <Input value={branchForm.standalone_domain} onChange={(e) => setBranchForm({ ...branchForm, standalone_domain: e.target.value })} placeholder="sucursal.tudominio.com" />
              </div>
            </div>

            {/* --- Taxes & Tips --- */}
            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Impuestos y Propinas</h3>
              <p className="text-xs text-muted-foreground mb-3">Deja vacio para usar los valores del restaurante principal.</p>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <Label>IVU (%)</Label>
                  <Input type="number" step="0.01" value={branchForm.tax_rate} onChange={(e) => setBranchForm({ ...branchForm, tax_rate: e.target.value })} placeholder="Default" />
                </div>
                <div>
                  <Label>Propina 1 (%)</Label>
                  <Input type="number" step="1" value={branchForm.tip_option_1} onChange={(e) => setBranchForm({ ...branchForm, tip_option_1: e.target.value })} placeholder="12" />
                </div>
                <div>
                  <Label>Propina 2 (%)</Label>
                  <Input type="number" step="1" value={branchForm.tip_option_2} onChange={(e) => setBranchForm({ ...branchForm, tip_option_2: e.target.value })} placeholder="15" />
                </div>
                <div>
                  <Label>Propina 3 (%)</Label>
                  <Input type="number" step="1" value={branchForm.tip_option_3} onChange={(e) => setBranchForm({ ...branchForm, tip_option_3: e.target.value })} placeholder="18" />
                </div>
              </div>
            </div>

            {/* --- Operational Settings --- */}
            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Configuracion Operacional</h3>
              <p className="text-xs text-muted-foreground mb-3">Deja vacio para usar los valores del restaurante principal.</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Delivery Fee ($)</Label>
                  <Input type="number" step="0.01" value={branchForm.delivery_fee} onChange={(e) => setBranchForm({ ...branchForm, delivery_fee: e.target.value })} placeholder="Default" />
                </div>
                <div>
                  <Label>Min. Delivery ($)</Label>
                  <Input type="number" step="0.01" value={branchForm.min_delivery_order} onChange={(e) => setBranchForm({ ...branchForm, min_delivery_order: e.target.value })} placeholder="Default" />
                </div>
                <div>
                  <Label>Min. Pickup ($)</Label>
                  <Input type="number" step="0.01" value={branchForm.min_pickup_order} onChange={(e) => setBranchForm({ ...branchForm, min_pickup_order: e.target.value })} placeholder="Default" />
                </div>
                <div>
                  <Label>Lead Time General (hrs)</Label>
                  <Input type="number" value={branchForm.lead_time_hours} onChange={(e) => setBranchForm({ ...branchForm, lead_time_hours: e.target.value })} placeholder="Default" />
                </div>
                <div>
                  <Label>Delivery Lead Time (hrs)</Label>
                  <Input type="number" value={branchForm.delivery_lead_time_hours} onChange={(e) => setBranchForm({ ...branchForm, delivery_lead_time_hours: e.target.value })} placeholder="Default" />
                </div>
                <div>
                  <Label>Pickup Lead Time (hrs)</Label>
                  <Input type="number" value={branchForm.pickup_lead_time_hours} onChange={(e) => setBranchForm({ ...branchForm, pickup_lead_time_hours: e.target.value })} placeholder="Default" />
                </div>
                <div>
                  <Label>Dias Maximo Anticipacion</Label>
                  <Input type="number" value={branchForm.max_advance_days} onChange={(e) => setBranchForm({ ...branchForm, max_advance_days: e.target.value })} placeholder="Default" />
                </div>
              </div>
            </div>

            {/* --- Delivery Zone / Geo --- */}
            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Zona de Delivery</h3>
              <p className="text-xs text-muted-foreground mb-3">Radio de entrega y coordenadas para calcular si la direccion del cliente esta dentro de la zona. Default: 7 millas.</p>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Radio de Delivery (millas)</Label>
                  <Input type="number" step="0.1" value={branchForm.delivery_radius} onChange={(e) => setBranchForm({ ...branchForm, delivery_radius: e.target.value })} placeholder="7.0" />
                </div>
                <div>
                  <Label>Latitud</Label>
                  <Input type="number" step="0.000001" value={branchForm.latitude} onChange={(e) => setBranchForm({ ...branchForm, latitude: e.target.value })} placeholder="18.4655" />
                </div>
                <div>
                  <Label>Longitud</Label>
                  <Input type="number" step="0.000001" value={branchForm.longitude} onChange={(e) => setBranchForm({ ...branchForm, longitude: e.target.value })} placeholder="-66.1057" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Si no se proveen coordenadas, se usara la direccion de la sucursal con Google Maps para calcular distancia.</p>
            </div>

            {/* --- Shipday Integration --- */}
            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Integracion Shipday</h3>
              <p className="text-xs text-muted-foreground mb-3">API key de Shipday para esta sucursal. Si se deja vacio, se usara la API key del restaurante principal.</p>
              <div>
                <Label>Shipday API Key</Label>
                <Input 
                  type="password" 
                  value={branchForm.shipday_api_key} 
                  onChange={(e) => setBranchForm({ ...branchForm, shipday_api_key: e.target.value })} 
                  placeholder="Dejar vacio para usar default del restaurante" 
                />
              </div>
            </div>

            {/* --- Service Packages --- */}
            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Servicios / Paquetes</h3>
              <div className="mb-4">
                <Label>Titulo Seccion Paquetes</Label>
                <Input value={branchForm.packages_section_title} onChange={(e) => setBranchForm({ ...branchForm, packages_section_title: e.target.value })} placeholder="Default del restaurante" />
              </div>
              <div>
                <Label className="mb-2 block">Paquetes disponibles para esta sucursal</Label>
                <p className="text-xs text-muted-foreground mb-3">Selecciona los paquetes que estaran disponibles. Si no seleccionas ninguno, no se mostraran paquetes.</p>
                {servicePackages.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">No hay paquetes creados. Crea paquetes en la seccion de Paquetes de Servicio.</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                    {servicePackages.map((pkg) => {
                      const isChecked = (branchForm.selectedPackageIds || []).includes(pkg.id)
                      return (
                        <label key={pkg.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-50 cursor-pointer">
                          <input
                            type="checkbox"
                            className="rounded border-gray-300 h-4 w-4 accent-[#5d1f1f]"
                            checked={isChecked}
                            onChange={() => {
                              const current = branchForm.selectedPackageIds || []
                              const updated = isChecked
                                ? current.filter((id) => id !== pkg.id)
                                : [...current, pkg.id]
                              setBranchForm({ ...branchForm, selectedPackageIds: updated })
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium">{pkg.name}</span>
                            {pkg.base_price > 0 && (
                              <span className="text-xs text-muted-foreground ml-2">${pkg.base_price.toFixed(2)}</span>
                            )}
                          </div>
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* --- Payment Provider --- */}
            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Proveedor de Pagos</h3>
              
              {/* Payment Provider Selection */}
              <div className="mb-4">
                <Label>Metodo de Pago</Label>
                <select
                  className="w-full border rounded-md px-3 py-2 mt-1"
                  value={branchForm.payment_provider}
                  onChange={(e) => setBranchForm({ ...branchForm, payment_provider: e.target.value as "stripe" | "square" | "stripe_athmovil" | "square_athmovil" })}
                >
                  <option value="stripe">Solo Stripe (Tarjeta)</option>
                  <option value="square">Solo Square (Tarjeta)</option>
                  <option value="stripe_athmovil">Stripe + ATH Móvil</option>
                  <option value="square_athmovil">Square + ATH Móvil</option>
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  Selecciona tu procesador de tarjetas y si deseas ofrecer ATH Móvil como opcion adicional.
                </p>
              </div>

              {/* Stripe Settings */}
              {(branchForm.payment_provider === "stripe" || branchForm.payment_provider === "stripe_athmovil") && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <h4 className="text-sm font-medium mb-2">Configuracion Stripe</h4>
                  <div>
                    <Label>Stripe Account ID</Label>
                    <Input 
                      type="text" 
                      value={branchForm.stripe_account_id} 
                      onChange={(e) => setBranchForm({ ...branchForm, stripe_account_id: e.target.value })} 
                      placeholder="acct_XXXXXXXXXXXXX" 
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      ID de cuenta conectada de Stripe. Si se deja vacio, los pagos iran a la cuenta principal.
                    </p>
                  </div>
                </div>
              )}

              {/* Square Settings */}
              {(branchForm.payment_provider === "square" || branchForm.payment_provider === "square_athmovil") && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <h4 className="text-sm font-medium mb-2">Configuracion Square</h4>
                  <div className="space-y-3">
                    <div>
                      <Label>Square Access Token</Label>
                      <Input 
                        type="password" 
                        value={branchForm.square_access_token} 
                        onChange={(e) => setBranchForm({ ...branchForm, square_access_token: e.target.value })} 
                        placeholder="EAAAl..." 
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Access token de la cuenta de Square.
                      </p>
                    </div>
                    <div>
                      <Label>Square Location ID</Label>
                      <Input 
                        type="text" 
                        value={branchForm.square_location_id} 
                        onChange={(e) => setBranchForm({ ...branchForm, square_location_id: e.target.value })} 
                        placeholder="LID..." 
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        ID de ubicacion de Square donde se procesaran los pagos.
                      </p>
                    </div>
                    <div>
                      <Label>Ambiente</Label>
                      <select
                        className="w-full border rounded-md px-3 py-2 mt-1"
                        value={branchForm.square_environment}
                        onChange={(e) => setBranchForm({ ...branchForm, square_environment: e.target.value as "sandbox" | "production" })}
                      >
                        <option value="production">Produccion</option>
                        <option value="sandbox">Sandbox (Pruebas)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* ATH Móvil Settings */}
              {(branchForm.payment_provider === "stripe_athmovil" || branchForm.payment_provider === "square_athmovil") && (
                <div className="mb-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <span className="w-6 h-6 bg-orange-500 rounded text-white text-xs flex items-center justify-center font-bold">ATH</span>
                    Configuracion ATH Móvil
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <Label>Public Token</Label>
                      <Input 
                        type="password" 
                        value={branchForm.athmovil_public_token} 
                        onChange={(e) => setBranchForm({ ...branchForm, athmovil_public_token: e.target.value })} 
                        placeholder="Token público de ATH Business" 
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Token público de tu cuenta ATH Business.
                      </p>
                    </div>
                    <div>
                      <Label>Ecommerce ID (Opcional)</Label>
                      <Input 
                        type="text" 
                        value={branchForm.athmovil_ecommerce_id} 
                        onChange={(e) => setBranchForm({ ...branchForm, athmovil_ecommerce_id: e.target.value })} 
                        placeholder="ID de ecommerce" 
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Identificador de tu ecommerce en ATH Business (opcional).
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Order Notification Settings for Branch */}
<OrderNotificationSettings
  settings={{
  order_notification_method: branchForm.order_notification_method,
  chowly_api_key: branchForm.chowly_api_key,
  chowly_location_id: branchForm.chowly_location_id,
  chowly_enabled: branchForm.chowly_enabled,
  square_kds_enabled: branchForm.square_kds_enabled,
  square_access_token: branchForm.square_access_token,
  square_location_id: branchForm.square_location_id,
  kds_access_token: branchForm.kds_access_token,
  }}
  onChange={(newSettings) => setBranchForm({ ...branchForm, ...newSettings })}
  restaurantSlug={restaurant?.slug || ""}
  branchId={editingBranch?.id}
  entityType="branch"
  />

            {/* --- Toggles --- */}
            <div className="border-t pt-4 flex items-center gap-6 flex-wrap">
              <div className="flex items-center space-x-2">
                <Switch id="branch-delivery" checked={branchForm.delivery_enabled} onCheckedChange={(c) => setBranchForm({ ...branchForm, delivery_enabled: c as boolean })} />
                <Label htmlFor="branch-delivery">Delivery</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch id="branch-pickup" checked={branchForm.pickup_enabled} onCheckedChange={(c) => setBranchForm({ ...branchForm, pickup_enabled: c as boolean })} />
                <Label htmlFor="branch-pickup">Pickup</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch id="branch-active" checked={branchForm.is_active} onCheckedChange={(c) => setBranchForm({ ...branchForm, is_active: c as boolean })} />
                <Label htmlFor="branch-active">Activa</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBranchDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveBranch} className="bg-[#5d1f1f] hover:bg-[#4a1818]">
              {editingBranch ? "Guardar Cambios" : "Crear Sucursal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer Order Dialog */}
      <Dialog open={transferDialog.open} onOpenChange={(open) => setTransferDialog((prev) => ({ ...prev, open }))}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5" />
              Transferir Orden
            </DialogTitle>
            <DialogDescription>
              Selecciona la sucursal destino para transferir esta orden.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Sucursal Destino *</Label>
              <select
                value={transferDialog.targetBranchId}
                onChange={(e) => setTransferDialog((prev) => ({ ...prev, targetBranchId: e.target.value }))}
                className="w-full mt-1 border border-gray-300 rounded-md p-2 text-sm"
              >
                <option value="">Seleccionar sucursal...</option>
                {branches.filter((b: any) => b.id !== transferDialog.orderId).map((b: any) => (
                  <option key={b.id} value={b.id}>{b.name} {b.city ? `- ${b.city}` : ""}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Razon (opcional)</Label>
              <Textarea
                value={transferDialog.reason}
                onChange={(e) => setTransferDialog((prev) => ({ ...prev, reason: e.target.value }))}
                placeholder="Ej: Cliente mas cerca de esta sucursal, capacidad, etc."
                rows={2}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferDialog({ open: false, orderId: "", targetBranchId: "", reason: "" })}>
              Cancelar
            </Button>
            <Button onClick={handleTransferOrder} className="gap-1.5">
              <ArrowRightLeft className="h-4 w-4" />
              Transferir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Order Dialog */}
      <Dialog open={!!editingOrder} onOpenChange={(open) => !open && setEditingOrder(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              Editar Orden #{editingOrder?.id?.slice(0, 8)}
            </DialogTitle>
            <DialogDescription>
              Modifica los articulos de esta orden. Los cambios se guardaran automaticamente.
            </DialogDescription>
          </DialogHeader>
          
          {editingOrder && (
            <div className="space-y-4">
              {/* Warning for transferred orders */}
              {editingOrder.branch_id !== editingOrder.original_branch_id && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-sm font-medium text-amber-800">
                    Orden Transferida
                  </p>
                  <p className="text-xs text-amber-700 mt-1">
                    Esta orden fue transferida desde otra sucursal. Los cambios de pago (cargos adicionales o reembolsos) deben procesarse desde la sucursal original donde se realizo el pago.
                  </p>
                </div>
              )}
              
              {/* Customer Info */}
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="font-medium">{editingOrder.customer_name || "Cliente"}</p>
                <p className="text-sm text-muted-foreground">{editingOrder.customer_phone}</p>
                <p className="text-sm text-muted-foreground">
                  {editingOrder.order_type === "delivery" ? "Delivery" : "Pick-Up"} - {new Date(editingOrder.created_at).toLocaleString()}
                </p>
              </div>
              
              {/* Order Items */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">Articulos</Label>
                {editOrderItems.map((item: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{item.name}</p>
                      {item.selectedSize && (
                        <p className="text-sm text-muted-foreground">{item.selectedSize}</p>
                      )}
                      {item.addons && item.addons.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          + {item.addons.map((a: any) => a.name).join(", ")}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => {
                            const newItems = [...editOrderItems]
                            const currentQty = newItems[index].quantity || newItems[index].unitQuantity || 1
                            if (currentQty > 1) {
                              const pricePerUnit = (newItems[index].totalPrice || newItems[index].finalPrice) / currentQty
                              newItems[index] = {
                                ...newItems[index],
                                quantity: currentQty - 1,
                                unitQuantity: currentQty - 1,
                                totalPrice: pricePerUnit * (currentQty - 1),
                                finalPrice: pricePerUnit * (currentQty - 1),
                              }
                              setEditOrderItems(newItems)
                            }
                          }}
                          disabled={(item.quantity || item.unitQuantity || 1) <= 1}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-6 text-center font-medium">
                          {item.quantity || item.unitQuantity || 1}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => {
                            const newItems = [...editOrderItems]
                            const currentQty = newItems[index].quantity || newItems[index].unitQuantity || 1
                            const pricePerUnit = (newItems[index].totalPrice || newItems[index].finalPrice) / currentQty
                            newItems[index] = {
                              ...newItems[index],
                              quantity: currentQty + 1,
                              unitQuantity: currentQty + 1,
                              totalPrice: pricePerUnit * (currentQty + 1),
                              finalPrice: pricePerUnit * (currentQty + 1),
                            }
                            setEditOrderItems(newItems)
                          }}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="font-medium w-20 text-right">
                        ${((item.totalPrice || item.finalPrice || 0)).toFixed(2)}
                      </p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => {
                          setEditOrderItems(editOrderItems.filter((_: any, i: number) => i !== index))
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                
                {editOrderItems.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">No hay articulos en la orden</p>
                )}
              </div>
              
              {/* Order Totals */}
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>${editOrderItems.reduce((sum: number, item: any) => sum + (item.totalPrice || item.finalPrice || 0), 0).toFixed(2)}</span>
                </div>
                {editingOrder.delivery_fee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Delivery</span>
                    <span>${Number(editingOrder.delivery_fee).toFixed(2)}</span>
                  </div>
                )}
                {editingOrder.tax > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>IVU</span>
                    <span>${Number(editingOrder.tax).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold text-lg border-t pt-2">
                  <span>Total</span>
                  <span>
                    ${(
                      editOrderItems.reduce((sum: number, item: any) => sum + (item.totalPrice || item.finalPrice || 0), 0) +
                      (editingOrder.delivery_fee || 0) +
                      (editingOrder.tax || 0)
                    ).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingOrder(null)}>
              Cancelar
            </Button>
            <Button 
              onClick={async () => {
                if (!editingOrder) return
                const newSubtotal = editOrderItems.reduce((sum: number, item: any) => sum + (item.totalPrice || item.finalPrice || 0), 0)
                const newTotal = newSubtotal + (editingOrder.delivery_fee || 0) + (editingOrder.tax || 0)
                
                const supabase = createBrowserClient()
                const { error } = await supabase
                  .from("orders")
                  .update({
                    items: editOrderItems,
                    subtotal: newSubtotal,
                    total: newTotal,
                  })
                  .eq("id", editingOrder.id)
                
                if (error) {
                  toast({ title: "Error", description: "No se pudo actualizar la orden", variant: "destructive" })
                } else {
                  toast({ title: "Orden actualizada", description: "Los cambios se han guardado correctamente" })
                  loadOrders()
                  setEditingOrder(null)
                }
              }}
              className="gap-1.5"
            >
              <Check className="h-4 w-4" />
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Branch Menu Overrides Dialog */}
      <Dialog open={branchOverridesDialogOpen} onOpenChange={setBranchOverridesDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Menu Overrides - {selectedBranchForOverrides?.name}</DialogTitle>
            <DialogDescription>
              Hide items or override prices for this branch. Items without overrides use the default menu prices.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {categories.map((category) => {
              const catItems = menuItems.filter((item) => item.category_id === category.id)
              if (catItems.length === 0) return null
              return (
                <div key={category.id} className="border rounded-lg p-3">
                  <h4 className="font-semibold text-sm mb-2">{category.name}</h4>
                  <div className="space-y-2">
                    {catItems.map((item) => {
                      const override = branchOverrides.find((o: any) => o.menu_item_id === item.id)
                      const isHidden = override?.is_hidden || false
                      return (
                        <div key={item.id} className={`flex items-center justify-between py-2 px-3 rounded-md ${isHidden ? "bg-muted/50 opacity-60" : "bg-background"}`}>
                          <div className="flex items-center gap-3 flex-1">
                            <button
                              onClick={() => handleToggleItemHidden(selectedBranchForOverrides?.id, item.id, isHidden)}
                              className="shrink-0"
                              title={isHidden ? "Show item" : "Hide item"}
                            >
                              {isHidden ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-foreground" />}
                            </button>
                            <span className={`text-sm ${isHidden ? "line-through" : ""}`}>{item.name}</span>
                            <span className="text-xs text-muted-foreground">${Number(item.price).toFixed(2)}</span>
                          </div>
                          {!isHidden && (
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="Default price"
                                defaultValue={override?.price_override || ""}
                                onBlur={(e) => {
                                  const val = e.target.value
                                  if (val && Number(val) !== item.price) {
                                    handleSetPriceOverride(selectedBranchForOverrides?.id, item.id, val)
                                  } else if (!val && override?.price_override) {
                                    handleRemoveOverride(selectedBranchForOverrides?.id, item.id)
                                  }
                                }}
                                className="w-28 h-8 text-sm"
                              />
                              {override && (
                                <Button size="sm" variant="ghost" onClick={() => handleRemoveOverride(selectedBranchForOverrides?.id, item.id)} className="h-8 px-2">
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Checkout Upsell Config Dialog */}
      <Dialog open={showUpsellConfigDialog} onOpenChange={setShowUpsellConfigDialog}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configurar Upsells del Checkout</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Selecciona los items que se mostraran como upsells en el carrito de compras.
            </p>
          </DialogHeader>

          <div className="space-y-6 py-2">
            {/* Service Packages */}
            <div>
              <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">Paquetes de Servicio</h4>
              <div className="space-y-2">
                {servicePackages.filter(pkg => pkg.is_active).map((pkg) => (
                  <label
                    key={pkg.id}
                    className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <Checkbox
                      checked={pkg.is_cart_upsell || false}
                      onCheckedChange={async (checked) => {
                        setServicePackages((prev) =>
                          prev.map((p) => (p.id === pkg.id ? { ...p, is_cart_upsell: !!checked } : p))
                        )
                        try {
                          await updateServicePackage(pkg.id, { is_cart_upsell: !!checked })
                        } catch {
                          setServicePackages((prev) =>
                            prev.map((p) => (p.id === pkg.id ? { ...p, is_cart_upsell: !checked } : p))
                          )
                          toast({ title: "Error", description: "No se pudo actualizar", variant: "destructive" })
                        }
                      }}
                    />
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {pkg.image_url && (
                        <div className="flex-shrink-0 w-10 h-10 rounded overflow-hidden bg-gray-100">
                          <img src={pkg.image_url} alt={pkg.name} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{pkg.name}</p>
                        <p className="text-xs text-muted-foreground">${Number(pkg.base_price || 0).toFixed(2)}</p>
                      </div>
                    </div>
                  </label>
                ))}
                {servicePackages.filter(pkg => pkg.is_active).length === 0 && (
                  <p className="text-sm text-muted-foreground italic">No hay paquetes activos.</p>
                )}
              </div>
            </div>

            {/* Package Addons */}
            {servicePackages.some(pkg => pkg.package_addons?.length > 0) && (
              <div>
                <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">Extras / Add-ons</h4>
                <div className="space-y-2">
                  {servicePackages.flatMap((pkg) =>
                    (pkg.package_addons || [])
                      .filter((addon: any) => addon.is_active !== false)
                      .map((addon: any) => (
                        <label
                          key={`${pkg.id}-${addon.id}`}
                          className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-gray-50 transition-colors"
                        >
                          <Checkbox
                            checked={addon.is_cart_upsell || false}
                            onCheckedChange={async (checked) => {
                              const addonTempId = addon.id
                              const addonDbId = addon.db_id || addon.id
                              setServicePackages((prev) =>
                                prev.map((p) => ({
                                  ...p,
                                  package_addons: p.package_addons?.map((a: any) =>
                                    a.id === addonTempId ? { ...a, is_cart_upsell: !!checked } : a
                                  ),
                                }))
                              )
                              try {
                                await updatePackageAddon(addonDbId, { is_cart_upsell: !!checked })
                              } catch {
                                setServicePackages((prev) =>
                                  prev.map((p) => ({
                                    ...p,
                                    package_addons: p.package_addons?.map((a: any) =>
                                      a.id === addonTempId ? { ...a, is_cart_upsell: !checked } : a
                                    ),
                                  }))
                                )
                                toast({ title: "Error", description: "No se pudo actualizar", variant: "destructive" })
                              }
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{addon.name}</p>
                            <p className="text-xs text-muted-foreground">
                              ${Number(addon.price_per_unit || 0).toFixed(2)}/{addon.unit || "por unidad"}
                              <span className="ml-2 text-gray-400">({pkg.name})</span>
                            </p>
                          </div>
                        </label>
                      ))
                  )}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
