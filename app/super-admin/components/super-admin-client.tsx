"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ImageUpload } from "@/components/image-upload"
import {
  Building2,
  ExternalLink,
  Settings,
  ShoppingCart,
  UtensilsCrossed,
  Palette,
  CheckCircle2,
  Search,
  LayoutGrid,
  List,
  Plus,
  Loader2,
  Pencil,
  FileText,
  Images,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createRestaurant, updateRestaurant, deleteRestaurant, fetchCuisineTypes, createCuisineType, deleteCuisineType, updateCuisineType, fetchMarketplaceAreas, createMarketplaceArea, deleteMarketplaceArea, updateMarketplaceArea } from "../actions"
import { Trash2, Shield, Megaphone, Globe, Copy, ArrowUpRight, MapPin, Clock, AlertTriangle, Users, ImageIcon, RefreshCw, Phone, Monitor } from "lucide-react"
import { OperationsTab } from "./operations-tab"
import { AdminUsersTab } from "./admin-users-tab"
import { CuisineTypesTab } from "./cuisine-types-tab"
import { ReportsTab } from "./reports-tab"
import { PromoCardsTab } from "./promo-cards-tab"
import { KDSTab } from "./kds-tab"
import { SuperAdminSidebar } from "./super-admin-sidebar"

interface Restaurant {
  id: string
  name: string
  slug: string
  logo_url: string | null
  marketplace_image_url: string | null
  email: string | null
  phone: string | null
  city: string | null
  state: string | null
  is_active: boolean
  primary_color: string | null
  design_template: string | null
  show_in_marketplace: boolean
  cuisine_type: string | null
  restaurant_discount_percent: number | null
  delivery_discount_percent: number | null
  pickup_discount_percent: number | null
  white_label: boolean
  show_powered_by: boolean
  menu_items_count?: number
  orders_count?: number
  area?: string | null
  payment_type?: "ach" | "pop" | "ath" | null
}

interface CuisineType {
  id: string
  name: string
  display_order: number
  is_active: boolean
}

interface MarketplaceArea {
  id: string
  name: string
  display_order: number
  is_active: boolean
}

interface PlatformSettings {
  id: string
  is_platform_open: boolean
  is_pop_blocked: boolean
  operating_hours_start: string
  operating_hours_end: string
  operating_days: Record<string, boolean>
  emergency_block_active: boolean
  emergency_block_reason: string | null
  pop_reopen_at: string | null
  pop_block_message: string | null
}

interface ScheduledBlock {
  id: string
  restaurant_id: string | null
  block_type: string
  starts_at: string
  ends_at: string
  reason: string | null
  is_active: boolean
  restaurants?: { name: string } | null
}

interface AdminUser {
  id: string
  email: string
  username: string | null
  role: string
  restaurant_id: string | null
  is_active: boolean
  created_at: string
  last_login_at: string | null
  restaurants?: { name: string; slug: string } | null
}

interface SuperAdminClientProps {
  restaurants: Restaurant[]
  marketplaceSettings?: {
    id: string
    hero_image_url: string | null
    hero_title: string
    hero_subtitle: string
  }
  initialCuisineTypes?: CuisineType[]
  initialMarketplaceAreas?: MarketplaceArea[]
  platformSettings?: PlatformSettings
  scheduledBlocks?: ScheduledBlock[]
  adminUsers?: AdminUser[]
}

const DESIGN_TEMPLATES = [
  { id: "modern", name: "Modern", description: "Clean lines, subtle shadows, contemporary feel" },
  { id: "classic", name: "Classic", description: "Timeless elegance, serif fonts, warm tones" },
  { id: "bold", name: "Bold", description: "High contrast, large typography, vibrant colors" },
  { id: "minimal", name: "Minimal", description: "Simple, lots of whitespace, understated" },
  { id: "elegant", name: "Elegant", description: "Luxurious, refined, sophisticated styling" },
]

const DEFAULT_COLORS = [
  { name: "Burgundy", value: "#722F37" },
  { name: "Navy", value: "#1E3A5F" },
  { name: "Forest", value: "#2D5A27" },
  { name: "Slate", value: "#475569" },
  { name: "Amber", value: "#B45309" },
  { name: "Teal", value: "#0D9488" },
]

export function SuperAdminClient({
  restaurants: initialRestaurants,
  marketplaceSettings: initialSettings,
  initialCuisineTypes = [],
  initialMarketplaceAreas = [],
  platformSettings,
  scheduledBlocks = [],
  adminUsers = [],
}: SuperAdminClientProps) {
  const router = useRouter()
  const [restaurants, setRestaurants] = useState<Restaurant[]>(initialRestaurants)
  const [searchQuery, setSearchQuery] = useState("")
  const [cuisineTypes, setCuisineTypes] = useState<CuisineType[]>(initialCuisineTypes)
  const [showCuisineManager, setShowCuisineManager] = useState(false)
  const [newCuisineName, setNewCuisineName] = useState("")
  const [editingCuisineId, setEditingCuisineId] = useState<string | null>(null)
  const [editingCuisineName, setEditingCuisineName] = useState("")
  const [marketplaceAreas, setMarketplaceAreas] = useState<MarketplaceArea[]>(initialMarketplaceAreas)
  const [showAreaManager, setShowAreaManager] = useState(false)
  const [newAreaName, setNewAreaName] = useState("")
  const [editingAreaId, setEditingAreaId] = useState<string | null>(null)
  const [editingAreaName, setEditingAreaName] = useState("")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [isUpdatingImages, setIsUpdatingImages] = useState(false)
  const [imageUpdateResult, setImageUpdateResult] = useState<{ success: boolean; message: string } | null>(null)
  const [newRestaurant, setNewRestaurant] = useState({
    name: "",
    slug: "",
    email: "",
    phone: "",
    city: "",
    state: "",
    area: "",
    design_template: "classic",
    primary_color: "#722F37",
    show_in_marketplace: false,
    cuisine_type: "",
  })

  const AREAS = [
    "Hato Rey", "Condado", "Miramar", "Isla Verde", "Puerto Nuevo",
    "Rio Piedras", "Santurce", "Guaynabo Pueblo", "San Patricio", "Señorial",
  ]

  const [showEditModal, setShowEditModal] = useState(false)
  const [editingRestaurant, setEditingRestaurant] = useState<Restaurant | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [updateError, setUpdateError] = useState<string | null>(null)

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletingRestaurant, setDeletingRestaurant] = useState<Restaurant | null>(null)
  const [deleteConfirmation, setDeleteConfirmation] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({
    name: "",
    standalone_domain: "",
    design_template: "classic",
    primary_color: "#722F37",
    is_active: true,
    show_in_marketplace: false,
    marketplace_image_url: "",
    cuisine_type: "",
    area: "",
    restaurant_discount_percent: 0,
    delivery_discount_percent: 0,
    pickup_discount_percent: 0,
    white_label: false,
    show_powered_by: true,
    payment_type: "ach" as "ach" | "pop" | "ath",
    dispatch_fee_percent: 0,
    cart_disclaimer: "",
  })

  const [activeTab, setActiveTab] = useState<"restaurants" | "marketing" | "operations" | "admin-users" | "cuisine-types" | "reports" | "promo-cards">("restaurants")
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [marketplaceSettings, setMarketplaceSettings] = useState({
    id: initialSettings?.id || "",
    hero_image_url: initialSettings?.hero_image_url || "",
    hero_title: initialSettings?.hero_title || "De Todo para Tu Junte",
    hero_subtitle: initialSettings?.hero_subtitle || "Monta el Party con nuestras deliciosas opciones...",
  })
  const [isSavingSettings, setIsSavingSettings] = useState(false)
  const [settingsError, setSettingsError] = useState<string | null>(null)

  // Handler to update restaurant images from JSON
  const handleUpdateImages = async () => {
    setIsUpdatingImages(true)
    setImageUpdateResult(null)
    try {
      const response = await fetch('/api/update-images', { method: 'POST' })
      const data = await response.json()
      if (data.success) {
        setImageUpdateResult({
          success: true,
          message: `Updated ${data.updated} restaurants. Skipped ${data.skipped}. Errors: ${data.errors}`
        })
        // Refresh the page to show updated images
        router.refresh()
      } else {
        setImageUpdateResult({
          success: false,
          message: data.error || 'Failed to update images'
        })
      }
    } catch (error) {
      setImageUpdateResult({
        success: false,
        message: 'Network error: Could not connect to API'
      })
    } finally {
      setIsUpdatingImages(false)
    }
  }

  const filteredRestaurants = restaurants.filter(
    (r) =>
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.cuisine_type?.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  // Rename stats variables to match changes in updates
  const totalRestaurants = restaurants.length
  const activeRestaurants = restaurants.filter((r) => r.is_active).length
  const totalMenuItems = restaurants.reduce((sum, r) => sum + (r.menu_items_count || 0), 0)
  const totalOrders = restaurants.reduce((sum, r) => sum + (r.orders_count || 0), 0)

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
  }

  const handleCreateRestaurant = async () => {
    if (!newRestaurant.name || !newRestaurant.slug) {
      setCreateError("Restaurant name and URL slug are required")
      return
    }

    setIsCreating(true)
    setCreateError(null)

    const result = await createRestaurant(newRestaurant)

    if (result.success) {
      setShowCreateModal(false)
      setNewRestaurant({
        name: "",
        slug: "",
        email: "",
        phone: "",
        city: "",
        state: "",
        area: "",
        primary_color: "#722F37",
        design_template: "classic",
        show_in_marketplace: false,
        cuisine_type: "",
      })
      router.refresh()
    } else {
      setCreateError(result.error || "Failed to create restaurant")
    }

    setIsCreating(false)
  }

  const handleDeleteClick = (restaurant: Restaurant) => {
    setDeletingRestaurant(restaurant)
    setDeleteConfirmation("")
    setDeleteError(null)
    setShowDeleteModal(true)
  }

  const handleDeleteConfirm = async () => {
    if (!deletingRestaurant) return
    if (deleteConfirmation.toLowerCase() !== deletingRestaurant.name.toLowerCase()) {
      setDeleteError("Restaurant name does not match")
      return
    }

    setIsDeleting(true)
    setDeleteError(null)

    const result = await deleteRestaurant(deletingRestaurant.id, deleteConfirmation)

    if (result.success) {
      setRestaurants((prev) => prev.filter((r) => r.id !== deletingRestaurant.id))
      setShowDeleteModal(false)
      setDeletingRestaurant(null)
      setDeleteConfirmation("")
      router.refresh()
    } else {
      setDeleteError(result.error || "Failed to delete restaurant")
    }

    setIsDeleting(false)
  }

  const handleEditClick = (restaurant: Restaurant) => {
    setEditingRestaurant(restaurant)
    setEditForm({
      name: restaurant.name,
      standalone_domain: "",
      design_template: restaurant.design_template || "list-right",
      primary_color: restaurant.primary_color || "#722F37",
      is_active: restaurant.is_active,
      show_in_marketplace: restaurant.show_in_marketplace || false,
      marketplace_image_url: restaurant.marketplace_image_url || "",
      cuisine_type: restaurant.cuisine_type || "",
      area: restaurant.area || "",
      restaurant_discount_percent: restaurant.restaurant_discount_percent ?? 0,
      delivery_discount_percent: restaurant.delivery_discount_percent ?? 0,
      pickup_discount_percent: restaurant.pickup_discount_percent ?? 0,
      white_label: restaurant.white_label ?? false,
      show_powered_by: restaurant.show_powered_by ?? true,
      payment_type: (restaurant.payment_type as "ach" | "pop" | "ath") || "ach",
      dispatch_fee_percent: (restaurant as any).dispatch_fee_percent ?? 0,
      cart_disclaimer: (restaurant as any).cart_disclaimer || "",
    })
    setShowEditModal(true)
  }

  const handleUpdateRestaurant = async () => {
    if (!editingRestaurant) return

    setIsUpdating(true)
    setUpdateError(null)

    const result = await updateRestaurant(editingRestaurant.id, editForm)

    if (result.success) {
      // Update local state for instant feedback
      setRestaurants((prev) => prev.map((r) => (r.id === editingRestaurant.id ? { ...r, ...editForm } : r)))
      setShowEditModal(false)
      setEditingRestaurant(null)
      router.refresh()
    } else {
      setUpdateError(result.error || "Failed to update restaurant")
    }

    setIsUpdating(false)
  }

  const handleSaveMarketplaceSettings = async () => {
    setIsSavingSettings(true)
    setSettingsError(null)

    try {
      const response = await fetch("/api/marketplace-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(marketplaceSettings),
      })

      if (!response.ok) {
        throw new Error("Failed to save settings")
      }

      setShowSettingsModal(false)
      router.refresh()
    } catch (error) {
      setSettingsError("Error al guardar la configuración. Inténtalo de nuevo.")
      console.error("[v0] Settings save error:", error)
    } finally {
      setIsSavingSettings(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Sidebar Navigation */}
      <SuperAdminSidebar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Content Area - offset by sidebar width */}
      <div className="md:ml-64 min-h-screen transition-all duration-300">
        {/* Top Header Bar */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
          <div className="px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="md:hidden w-10" /> {/* Spacer for mobile menu button */}
              <h2 className="text-lg font-semibold text-slate-900 capitalize">
                {activeTab === "restaurants" && "Restaurantes "}
                {activeTab === "marketing" && "Marketing & Sales"}
                {activeTab === "operations" && "Operations"}
                {activeTab === "admin-users" && "Admin Users"}
                {activeTab === "cuisine-types" && "Tipos de Cocina"}
                {activeTab === "reports" && "Reports"}
                {activeTab === "promo-cards" && "Promo Cards"}
                {activeTab === "kds" && "KDS (Kitchen Display)"}
              </h2>
              <div className="flex items-center gap-3">
                {activeTab === "restaurants" && (
                  <>
                    <Button onClick={() => setShowSettingsModal(true)} variant="outline" className="gap-2">
                      <Settings className="h-4 w-4" />
                      <span className="hidden sm:inline">Configuración del Mercado</span>
                    </Button>
                    <Button onClick={() => setShowCreateModal(true)} className="gap-2">
                      <Plus className="h-4 w-4" />
                      <span className="hidden sm:inline">New Restaurant</span>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

      {activeTab === "restaurants" && (
      <main className="px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <Building2 className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{totalRestaurants}</p>
                  <p className="text-sm text-slate-500">Total Restaurants</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-50 rounded-lg">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{activeRestaurants}</p>
                  <p className="text-sm text-slate-500">Active Instances</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-amber-50 rounded-lg">
                  <UtensilsCrossed className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{totalMenuItems}</p>
                  <p className="text-sm text-slate-500">Total Menu Items</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-50 rounded-lg">
                  <ShoppingCart className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{totalOrders}</p>
                  <p className="text-sm text-slate-500">Total Orders</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and View Toggle */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search restaurants..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowCuisineManager(true)}
              className="gap-2"
            >
              <UtensilsCrossed className="h-4 w-4" />
              Tipos de Cocina
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowAreaManager(true)}
              className="gap-2"
            >
              <MapPin className="h-4 w-4" />
              Areas
            </Button>
            <Button
              variant="outline"
              onClick={handleUpdateImages}
              disabled={isUpdatingImages}
              className="gap-2"
            >
              {isUpdatingImages ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <ImageIcon className="h-4 w-4" />
              )}
              {isUpdatingImages ? "Updating..." : "Update Images"}
            </Button>
            <Button
              variant={viewMode === "grid" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Image Update Result Message */}
        {imageUpdateResult && (
          <div className={`mb-4 p-4 rounded-lg border ${
            imageUpdateResult.success 
              ? 'bg-green-50 border-green-200 text-green-800' 
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <div className="flex items-center justify-between">
              <span>{imageUpdateResult.message}</span>
              <button 
                onClick={() => setImageUpdateResult(null)}
                className="text-current opacity-60 hover:opacity-100"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Restaurant Grid/List */}
        <div
          className={
            viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "flex flex-col gap-4"
          }
        >
          {filteredRestaurants.map((restaurant) => (
            <Card key={restaurant.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <CardContent className={viewMode === "grid" ? "p-6" : "p-4 flex items-center gap-6"}>
                <div className={viewMode === "grid" ? "flex items-start gap-4 mb-4" : "flex items-center gap-4 flex-1"}>
                  {restaurant.logo_url ? (
                    <Image
                      src={restaurant.logo_url || "/placeholder.svg"}
                      alt={restaurant.name}
                      width={viewMode === "grid" ? 64 : 48}
                      height={viewMode === "grid" ? 64 : 48}
                      className="rounded-lg object-cover"
                    />
                  ) : (
                    <div
                      className={`${viewMode === "grid" ? "w-16 h-16" : "w-12 h-12"} rounded-lg flex items-center justify-center`}
                      style={{ backgroundColor: restaurant.primary_color || "#722F37" }}
                    >
                      <UtensilsCrossed className="h-6 w-6 text-white" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-slate-900 truncate">{restaurant.name}</h3>
                      <Badge variant={restaurant.is_active ? "default" : "secondary"} className="text-xs">
                        {restaurant.is_active ? "Active" : "Inactive"}
                      </Badge>
                      {restaurant.white_label && (
                        <Badge variant="outline" className="text-xs border-amber-300 bg-amber-50 text-amber-700">
                          White Label
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-500">/{restaurant.slug}</p>
                  </div>
                </div>

                {viewMode === "grid" && (
                  <>
                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      <div className="text-center p-2 bg-slate-50 rounded-lg">
                        <p className="text-lg font-semibold text-slate-900">{restaurant.categories_count || 0}</p>
                        <p className="text-xs text-slate-500">Categories</p>
                      </div>
                      <div className="text-center p-2 bg-slate-50 rounded-lg">
                        <p className="text-lg font-semibold text-slate-900">{restaurant.menu_items_count || 0}</p>
                        <p className="text-xs text-slate-500">Items</p>
                      </div>
                      <div className="text-center p-2 bg-slate-50 rounded-lg">
                        <p className="text-lg font-semibold text-slate-900">{restaurant.orders_count || 0}</p>
                        <p className="text-xs text-slate-500">Orders</p>
                      </div>
                    </div>

                    {/* Template Badge */}
                    <div className="flex items-center gap-2 mb-4 text-sm text-slate-600">
                      <Palette className="h-4 w-4" />
                      <span className="capitalize">{restaurant.design_template || "Modern"} Template</span>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        <Button variant="outline" className="flex-1 gap-2 bg-transparent" asChild>
                          <Link href={`/${restaurant.slug}`} target="_blank">
                            <ExternalLink className="h-4 w-4" />
                            View Site
                          </Link>
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleEditClick(restaurant)}
                          className="shrink-0"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleDeleteClick(restaurant)}
                          className="shrink-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          title="Delete Restaurant"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" className="flex-1 gap-2 bg-transparent text-xs" asChild>
                          <Link href={`/${restaurant.slug}/admin?view=restricted`} target="_blank">
                            <Settings className="h-4 w-4" />
                            Restaurant Admin
                          </Link>
                        </Button>
<Button className="flex-1 gap-2 text-xs" asChild>
                  <Link href={`/${restaurant.slug}/admin?superadmin=true`} target="_blank">
                    <Shield className="h-4 w-4" />
                    Super Admin
                  </Link>
                </Button>
                      </div>
                    </div>
                  </>
                )}

                {viewMode === "list" && (
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-6 text-sm text-slate-500">
                      <span>{restaurant.categories_count || 0} categories</span>
                      <span>{restaurant.menu_items_count || 0} items</span>
                      <span>{restaurant.orders_count || 0} orders</span>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/${restaurant.slug}`} target="_blank">
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleEditClick(restaurant)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" asChild title="Restaurant Admin">
                        <Link href={`/${restaurant.slug}/admin?view=restricted`} target="_blank">
                          <Settings className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button size="sm" asChild title="Super Admin">
                        <Link href={`/${restaurant.slug}/admin?superadmin=true`} target="_blank">
                          <Shield className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleDeleteClick(restaurant)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        title="Delete Restaurant"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredRestaurants.length === 0 && (
          <div className="text-center py-12">
            <Building2 className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No restaurants found</h3>
            <p className="text-slate-500 mb-4">
              {searchQuery ? "Try adjusting your search terms" : "Get started by creating your first restaurant"}
            </p>
            {!searchQuery && (
              <Button onClick={() => setShowCreateModal(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Create Restaurant
              </Button>
            )}
          </div>
        )}
      </main>
      )}

      {/* Marketing & Sales Tab */}
      {activeTab === "marketing" && (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <Globe className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-500">Sales Mini-Site</p>
                    <p className="text-sm text-slate-900 font-semibold">/partners</p>
                  </div>
                  <a href="/partners" target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm" className="gap-1.5">
                      <ArrowUpRight className="h-3.5 w-3.5" />
                      Visitar
                    </Button>
                  </a>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-50 rounded-lg">
                    <Building2 className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">{restaurants.length}</p>
                    <p className="text-sm text-slate-500">Partners Activos</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-amber-50 rounded-lg">
                    <ShoppingCart className="h-6 w-6 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">{totalOrders}</p>
                    <p className="text-sm text-slate-500">Ordenes Totales</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sales Page Link & Copy */}
            <Card>
              <CardContent className="pt-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Globe className="h-5 w-5 text-blue-600" />
                  Pagina de Ventas
                </h3>
                <p className="text-sm text-slate-600 mb-4">
                  La pagina publica de ventas para atraer nuevos restaurantes a la plataforma. Comparte este enlace con prospectos.
                </p>
                <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border">
                  <code className="flex-1 text-sm text-slate-700 truncate">
                    {typeof window !== "undefined" ? window.location.origin : ""}/partners
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 shrink-0"
                    onClick={() => {
                      const url = `${window.location.origin}/partners`
                      navigator.clipboard.writeText(url)
                    }}
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copiar
                  </Button>
                </div>

                <div className="mt-6 space-y-3">
                  <h4 className="text-sm font-semibold text-slate-700">Secciones de la pagina:</h4>
                  <ul className="space-y-2">
                    {[
                      "Hero con headline y CTAs",
                      "Barra de estadisticas en vivo",
                      "Grid de 12 funcionalidades",
                      "Como funciona en 3 pasos",
                      "Beneficios con checkmarks",
                      "CTA final con WhatsApp y Email",
                    ].map((item) => (
                      <li key={item} className="flex items-center gap-2 text-sm text-slate-600">
                        <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Feature Highlights */}
            <Card>
              <CardContent className="pt-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Megaphone className="h-5 w-5 text-blue-600" />
                  Funcionalidades Destacadas
                </h3>
                <p className="text-sm text-slate-600 mb-4">
                  Lista de funcionalidades activas en la plataforma que se promocionan en la pagina de ventas.
                </p>
                <div className="space-y-2">
                  {[
                    { label: "Portal personalizado por restaurante", active: true },
                    { label: "Menu digital con tamanos y personalizaciones", active: true },
                    { label: "Paquetes de servicio con add-ons", active: true },
                    { label: "Delivery y Pick-Up", active: true },
                    { label: "Carrito con upsells inteligentes", active: true },
                    { label: "Checkout con Stripe", active: true },
                    { label: "Panel de ordenes", active: true },
                    { label: "Ordenes por telefono", active: true },
                    { label: "WhatsApp y SMS", active: true },
                    { label: "Marketplace / directorio", active: true },
                    { label: "Plantillas de diseno", active: true },
                    { label: "Multi-sucursal", active: true },
                  ].map((feature) => (
                    <div
                      key={feature.label}
                      className="flex items-center justify-between p-2.5 rounded-lg border bg-white"
                    >
                      <span className="text-sm text-slate-700">{feature.label}</span>
                      <Badge
                        variant={feature.active ? "default" : "secondary"}
                        className={feature.active ? "bg-green-100 text-green-700 hover:bg-green-100" : ""}
                      >
                        {feature.active ? "Activo" : "Inactivo"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Marketplace Settings Quick Access */}
            <Card className="lg:col-span-2">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                    <Palette className="h-5 w-5 text-blue-600" />
                    Configuracion del Marketplace
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => {
                      setActiveTab("restaurants")
                      setShowSettingsModal(true)
                    }}
                  >
                    <Settings className="h-3.5 w-3.5" />
                    Editar Configuracion
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-slate-50 border">
                    <Label className="text-xs uppercase tracking-wide text-slate-500">Hero Title</Label>
                    <p className="mt-1 text-sm font-medium text-slate-900">{marketplaceSettings.hero_title}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-slate-50 border">
                    <Label className="text-xs uppercase tracking-wide text-slate-500">Hero Subtitle</Label>
                    <p className="mt-1 text-sm font-medium text-slate-900">{marketplaceSettings.hero_subtitle}</p>
                  </div>
                </div>
                <div className="mt-4 flex gap-3">
                  <a href="/marketplace" target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm" className="gap-1.5">
                      <ArrowUpRight className="h-3.5 w-3.5" />
                      Ver Marketplace
                    </Button>
                  </a>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      )}

      {/* Operations Tab */}
      {activeTab === "operations" && (
        <OperationsTab
          restaurants={restaurants}
          platformSettings={platformSettings}
          scheduledBlocks={scheduledBlocks}
        />
      )}

      {/* Admin Users Tab */}
      {activeTab === "admin-users" && (
        <AdminUsersTab
          adminUsers={adminUsers}
          restaurants={restaurants}
        />
      )}

      {/* Cuisine Types Tab */}
      {activeTab === "cuisine-types" && (
        <CuisineTypesTab />
      )}

      {/* Reports Tab */}
      {activeTab === "reports" && (
        <ReportsTab restaurants={restaurants} />
      )}

{/* Promo Cards Tab */}
                {activeTab === "promo-cards" && (
                  <PromoCardsTab />
                )}

                {/* KDS Tab */}
                {activeTab === "kds" && (
                  <KDSTab />
                )}
              </div>{/* End main content wrapper */}

      {/* Create Restaurant Modal - keep existing */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Restaurant</DialogTitle>
            <DialogDescription>
              Set up a new restaurant instance. You can customize settings further in the admin panel after creation.
            </DialogDescription>
          </DialogHeader>

          {createError && <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm">{createError}</div>}

          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Restaurant Name *</Label>
              <Input
                id="name"
                value={newRestaurant.name}
                onChange={(e) => {
                  setNewRestaurant({
                    ...newRestaurant,
                    name: e.target.value,
                    slug: generateSlug(e.target.value),
                  })
                }}
                placeholder="Joe's Kitchen"
              />
            </div>

            <div>
              <Label htmlFor="slug">URL Slug *</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">yoursite.com/</span>
                <Input
                  id="slug"
                  value={newRestaurant.slug}
                  onChange={(e) => setNewRestaurant({ ...newRestaurant, slug: generateSlug(e.target.value) })}
                  placeholder="joes-kitchen"
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">This will be the URL path for the restaurant portal</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newRestaurant.email}
                  onChange={(e) => setNewRestaurant({ ...newRestaurant, email: e.target.value })}
                  placeholder="contact@example.com"
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={newRestaurant.phone}
                  onChange={(e) => setNewRestaurant({ ...newRestaurant, phone: e.target.value })}
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={newRestaurant.city}
                  onChange={(e) => setNewRestaurant({ ...newRestaurant, city: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={newRestaurant.state}
                  onChange={(e) => setNewRestaurant({ ...newRestaurant, state: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="area">Area / Zona</Label>
              <select
                id="area"
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                value={newRestaurant.area}
                onChange={(e) => setNewRestaurant({ ...newRestaurant, area: e.target.value })}
              >
                <option value="">Seleccionar area...</option>
                {AREAS.map((area) => (
                  <option key={area} value={area}>{area}</option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <Label htmlFor="cuisine">Tipo de Cocina</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-xs h-6 px-2"
                  onClick={() => setShowCuisineManager(true)}
                >
                  <Settings className="w-3 h-3 mr-1" />
                  Administrar
                </Button>
              </div>
              <Select
                value={newRestaurant.cuisine_type || ""}
                onValueChange={(value) => setNewRestaurant({ ...newRestaurant, cuisine_type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo de cocina" />
                </SelectTrigger>
                <SelectContent>
                  {cuisineTypes.map((ct) => (
                    <SelectItem key={ct.id} value={ct.name}>{ct.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500 mt-1">Usado para filtros en el mercado</p>
            </div>

            <div>
              <Label>Design Template</Label>
              <Select
                value={newRestaurant.design_template}
                onValueChange={(value) => setNewRestaurant({ ...newRestaurant, design_template: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DESIGN_TEMPLATES.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      <div>
                        <span className="font-medium">{template.name}</span>
                        <span className="text-slate-500 ml-2 text-sm">{template.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Brand Color</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {DEFAULT_COLORS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    className={`w-10 h-10 rounded-full border-2 transition-all ${
                      newRestaurant.primary_color === color.value
                        ? "border-slate-900 scale-110"
                        : "border-transparent hover:scale-105"
                    }`}
                    style={{ backgroundColor: color.value }}
                    onClick={() => setNewRestaurant({ ...newRestaurant, primary_color: color.value })}
                    title={color.name}
                  />
                ))}
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={newRestaurant.primary_color}
                    onChange={(e) => setNewRestaurant({ ...newRestaurant, primary_color: e.target.value })}
                    className="w-10 h-10 rounded-full cursor-pointer"
                  />
                  <span className="text-sm text-slate-500">Custom</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4 border-t">
              <div className="flex-1">
                <Label htmlFor="show-marketplace">Mostrar en Mercado</Label>
                <p className="text-xs text-slate-500 mt-1">
                  Cuando está activado, este restaurante aparecerá en la página principal del mercado
                </p>
              </div>
              <Select
                value={newRestaurant.show_in_marketplace ? "yes" : "no"}
                onValueChange={(value) => setNewRestaurant({ ...newRestaurant, show_in_marketplace: value === "yes" })}
              >
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Sí</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateRestaurant} disabled={isCreating} className="gap-2">
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Create Restaurant
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Restaurant</DialogTitle>
            <DialogDescription>
              Quick edit for {editingRestaurant?.name}. For full settings, use the Admin panel.
            </DialogDescription>
          </DialogHeader>

          {updateError && <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm">{updateError}</div>}

          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Restaurant Name</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="edit-domain">Custom Domain</Label>
              <Input
                id="edit-domain"
                value={editForm.standalone_domain}
                onChange={(e) => setEditForm({ ...editForm, standalone_domain: e.target.value })}
                placeholder="www.example.com"
              />
              <p className="text-xs text-slate-500 mt-1">Remember to add this domain in Vercel project settings</p>
            </div>

            <div>
              <Label>Design Template</Label>
              <Select
                value={editForm.design_template}
                onValueChange={(value) => setEditForm({ ...editForm, design_template: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DESIGN_TEMPLATES.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      <div>
                        <span className="font-medium">{template.name}</span>
                        <span className="text-slate-500 ml-2 text-sm">{template.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Brand Color</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {DEFAULT_COLORS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    className={`w-10 h-10 rounded-full border-2 transition-all ${
                      editForm.primary_color === color.value
                        ? "border-slate-900 scale-110"
                        : "border-transparent hover:scale-105"
                    }`}
                    style={{ backgroundColor: color.value }}
                    onClick={() => setEditForm({ ...editForm, primary_color: color.value })}
                    title={color.name}
                  />
                ))}
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={editForm.primary_color}
                    onChange={(e) => setEditForm({ ...editForm, primary_color: e.target.value })}
                    className="w-10 h-10 rounded-full cursor-pointer"
                  />
                  <span className="text-sm text-slate-500">Custom</span>
                </div>
              </div>
            </div>

            <div>
              <Label>Tipo de Cocina</Label>
              <Select
                value={editForm.cuisine_type || ""}
                onValueChange={(value) => setEditForm({ ...editForm, cuisine_type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo de cocina" />
                </SelectTrigger>
                <SelectContent>
                  {cuisineTypes.map((ct) => (
                    <SelectItem key={ct.id} value={ct.name}>{ct.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Area / Zona</Label>
              <select
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                value={editForm.area}
                onChange={(e) => setEditForm({ ...editForm, area: e.target.value })}
              >
                <option value="">Seleccionar area...</option>
                {AREAS.map((area) => (
                  <option key={area} value={area}>{area}</option>
                ))}
              </select>
            </div>

            {/* Payment Type */}
            <div>
              <Label>Tipo de Pago</Label>
              <p className="text-xs text-slate-500 mb-2">Tipo de pago al restaurante: ACH (transferencia), POP (pago al recoger), ATH (ATH Móvil)</p>
              <Select
                value={editForm.payment_type}
                onValueChange={(value) => setEditForm({ ...editForm, payment_type: value as "ach" | "pop" | "ath" })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo de pago..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ach">ACH (Transferencia Bancaria)</SelectItem>
                  <SelectItem value="pop">POP (Pay on Pickup)</SelectItem>
                  <SelectItem value="ath">ATH (ATH Móvil)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* FoodNetDelivery Internal: Financial Settings */}
            <div className="pt-4 border-t">
              <div className="flex items-center gap-2 mb-3">
                <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Financiero (Interno FoodNetDelivery)</h4>
              </div>
              <div>
                <Label className="text-base font-semibold">Descuentos del Restaurante (%)</Label>
                <p className="text-xs text-slate-500 mt-1 mb-3">
                  Porcentaje de descuento que el restaurante otorga a FoodNetDelivery. Se puede configurar un descuento diferente para Delivery y Pick-Up.
                </p>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="edit-discount" className="text-xs text-slate-500">General</Label>
                    <div className="flex items-center gap-1 mt-1">
                      <Input
                        id="edit-discount"
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        value={editForm.restaurant_discount_percent}
                        onChange={(e) => setEditForm({ ...editForm, restaurant_discount_percent: parseFloat(e.target.value) || 0 })}
                        className="w-20"
                      />
                      <span className="text-sm text-slate-500">%</span>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="edit-delivery-discount" className="text-xs text-slate-500">Delivery</Label>
                    <div className="flex items-center gap-1 mt-1">
                      <Input
                        id="edit-delivery-discount"
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        value={editForm.delivery_discount_percent}
                        onChange={(e) => setEditForm({ ...editForm, delivery_discount_percent: parseFloat(e.target.value) || 0 })}
                        className="w-20"
                      />
                      <span className="text-sm text-slate-500">%</span>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="edit-pickup-discount" className="text-xs text-slate-500">Pick-Up</Label>
                    <div className="flex items-center gap-1 mt-1">
                      <Input
                        id="edit-pickup-discount"
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        value={editForm.pickup_discount_percent}
                        onChange={(e) => setEditForm({ ...editForm, pickup_discount_percent: parseFloat(e.target.value) || 0 })}
                        className="w-20"
                      />
                      <span className="text-sm text-slate-500">%</span>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  Si Delivery o Pick-Up estan en 0, se usa el descuento General.
                </p>
              </div>

              {/* Dispatch Fee % */}
              <div className="mt-4">
                <Label htmlFor="edit-dispatch-fee-percent" className="text-sm font-medium text-slate-700">Dispatch Fee (%)</Label>
                <p className="text-xs text-slate-500 mt-1 mb-2">
                  Porcentaje del subtotal cobrado como cargo de despacho y mostrado como línea en el carrito. El subsidio se aplica internamente y no es visible para el cliente.
                </p>
                <div className="flex items-center gap-1">
                  <Input
                    id="edit-dispatch-fee-percent"
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={editForm.dispatch_fee_percent}
                    onChange={(e) => setEditForm({ ...editForm, dispatch_fee_percent: parseFloat(e.target.value) || 0 })}
                    className="w-28"
                  />
                  <span className="text-sm text-slate-500">%</span>
                </div>
              </div>

              {/* Cart Disclaimer */}
              <div className="mt-4">
                <Label htmlFor="edit-cart-disclaimer" className="text-sm font-medium text-slate-700">Nota en el Carrito</Label>
                <p className="text-xs text-slate-500 mt-1 mb-2">
                  Texto que aparece al pie del carrito del cliente (términos, avisos, etc.). Déjalo vacío para no mostrar nada.
                </p>
                <textarea
                  id="edit-cart-disclaimer"
                  rows={3}
                  value={editForm.cart_disclaimer}
                  onChange={(e) => setEditForm({ ...editForm, cart_disclaimer: e.target.value })}
                  placeholder="Ej: Al realizar tu pedido aceptas los términos del servicio. El IVU final puede variar al momento del cobro."
                  className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 resize-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Label htmlFor="edit-active">Status</Label>
              <Select
                value={editForm.is_active ? "active" : "inactive"}
                onValueChange={(value) => setEditForm({ ...editForm, is_active: value === "active" })}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                      Active
                    </span>
                  </SelectItem>
                  <SelectItem value="inactive">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-slate-400" />
                      Inactive
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-3 pt-4 border-t">
              <div className="flex-1">
                <Label htmlFor="show-marketplace">Mostrar en Mercado</Label>
                <p className="text-xs text-slate-500 mt-1">
                  Cuando está activado, este restaurante aparecerá en la página principal del mercado
                </p>
              </div>
              <Select
                value={editForm.show_in_marketplace ? "yes" : "no"}
                onValueChange={(value) => setEditForm({ ...editForm, show_in_marketplace: value === "yes" })}
              >
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Sí</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="pt-4 border-t">
              <Label>Imagen del Mercado (Tile)</Label>
              <p className="text-xs text-slate-500 mb-2">
                Imagen que aparece en la página principal del mercado (diferente del logo)
              </p>
              <ImageUpload
                value={editForm.marketplace_image_url}
                onChange={(url) => setEditForm({ ...editForm, marketplace_image_url: url })}
                label="Subir Imagen del Mercado"
              />
            </div>

            {/* White Label Settings */}
            <div className="pt-4 border-t space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-1">White Label</h4>
                <p className="text-xs text-slate-500">
                  Configuracion de marca blanca para este restaurante
                </p>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border bg-slate-50">
                <div className="flex-1">
                  <Label htmlFor="white-label">Modo White Label</Label>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Oculta el logo y branding de FoodNetDelivery del header del portal del restaurante
                  </p>
                </div>
                <Select
                  value={editForm.white_label ? "yes" : "no"}
                  onValueChange={(value) => setEditForm({ ...editForm, white_label: value === "yes" })}
                >
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Activado</SelectItem>
                    <SelectItem value="no">Desactivado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border bg-slate-50">
                <div className="flex-1">
                  <Label htmlFor="show-powered-by">{"Mostrar \"Powered by FoodNetDelivery\""}</Label>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Muestra una linea sutil en el footer del portal. Puede estar activo incluso en modo white label.
                  </p>
                </div>
                <Select
                  value={editForm.show_powered_by ? "yes" : "no"}
                  onValueChange={(value) => setEditForm({ ...editForm, show_powered_by: value === "yes" })}
                >
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Mostrar</SelectItem>
                    <SelectItem value="no">Ocultar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateRestaurant} disabled={isUpdating} className="gap-2">
              {isUpdating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Delete Restaurant
            </DialogTitle>
            <DialogDescription>
              This action is <strong>permanent and cannot be undone</strong>. All data including menu items, orders, branches, and settings will be deleted.
            </DialogDescription>
          </DialogHeader>

          {deleteError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-md text-sm">
              {deleteError}
            </div>
          )}

          <div className="space-y-4 py-4">
            <div className="bg-slate-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-slate-700">Restaurant to delete:</p>
              <p className="text-lg font-bold text-slate-900 mt-1">{deletingRestaurant?.name}</p>
              <p className="text-sm text-slate-500">/{deletingRestaurant?.slug}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="delete-confirm">
                Type <span className="font-bold">{deletingRestaurant?.name}</span> to confirm:
              </Label>
              <Input
                id="delete-confirm"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                placeholder="Enter restaurant name"
                className="border-red-200 focus:border-red-400 focus:ring-red-400"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteModal(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isDeleting || deleteConfirmation.toLowerCase() !== deletingRestaurant?.name?.toLowerCase()}
              className="gap-2"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Delete Permanently
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showSettingsModal} onOpenChange={setShowSettingsModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Configuración del Mercado</DialogTitle>
            <DialogDescription>Personaliza la imagen y el texto del hero del mercado principal</DialogDescription>
          </DialogHeader>

          {settingsError && <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm">{settingsError}</div>}

          <div className="space-y-4">
            <div>
              <ImageUpload
                value={marketplaceSettings.hero_image_url}
                onChange={(url) => setMarketplaceSettings({ ...marketplaceSettings, hero_image_url: url })}
                label="Imagen del Hero"
              />
              <p className="text-xs text-slate-500 mt-2">Tamaño recomendado: 1920x250px para mejor calidad</p>
            </div>

            <div>
              <Label htmlFor="hero-title">Título del Hero</Label>
              <Input
                id="hero-title"
                value={marketplaceSettings.hero_title}
                onChange={(e) => setMarketplaceSettings({ ...marketplaceSettings, hero_title: e.target.value })}
                placeholder="De Todo para Tu Junte"
              />
            </div>

            <div>
              <Label htmlFor="hero-subtitle">Subtítulo del Hero</Label>
              <Input
                id="hero-subtitle"
                value={marketplaceSettings.hero_subtitle}
                onChange={(e) => setMarketplaceSettings({ ...marketplaceSettings, hero_subtitle: e.target.value })}
                placeholder="Monta el Party con nuestras deliciosas opciones..."
              />
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setShowSettingsModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveMarketplaceSettings} disabled={isSavingSettings} className="gap-2">
              {isSavingSettings ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Guardar Cambios"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cuisine Type Manager Dialog */}
      <Dialog open={showCuisineManager} onOpenChange={setShowCuisineManager}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Administrar Tipos de Cocina</DialogTitle>
            <DialogDescription>Agrega, edita o elimina los tipos de cocina disponibles para los restaurantes.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Add new cuisine */}
            <div className="flex gap-2">
              <Input
                placeholder="Nueva cocina (ej: Peruana)"
                value={newCuisineName}
                onChange={(e) => setNewCuisineName(e.target.value)}
                onKeyDown={async (e) => {
                  if (e.key === "Enter" && newCuisineName.trim()) {
                    const result = await createCuisineType(newCuisineName.trim())
                    if (result.success) {
                      const refreshed = await fetchCuisineTypes()
                      if (refreshed.success) setCuisineTypes(refreshed.cuisineTypes)
                      setNewCuisineName("")
                    }
                  }
                }}
              />
              <Button
                size="sm"
                className="shrink-0"
                disabled={!newCuisineName.trim()}
                onClick={async () => {
                  if (!newCuisineName.trim()) return
                  const result = await createCuisineType(newCuisineName.trim())
                  if (result.success) {
                    const refreshed = await fetchCuisineTypes()
                    if (refreshed.success) setCuisineTypes(refreshed.cuisineTypes)
                    setNewCuisineName("")
                  }
                }}
              >
                <Plus className="w-4 h-4 mr-1" />
                Agregar
              </Button>
            </div>

            {/* List existing cuisines */}
            <div className="border rounded-lg divide-y max-h-80 overflow-y-auto">
              {cuisineTypes.length === 0 && (
                <p className="text-sm text-muted-foreground p-4 text-center">No hay tipos de cocina definidos.</p>
              )}
              {cuisineTypes.map((ct) => (
                <div key={ct.id} className="flex items-center justify-between px-3 py-2 group hover:bg-gray-50">
                  {editingCuisineId === ct.id ? (
                    <Input
                      value={editingCuisineName}
                      onChange={(e) => setEditingCuisineName(e.target.value)}
                      className="h-7 text-sm"
                      autoFocus
                      onKeyDown={async (e) => {
                        if (e.key === "Enter" && editingCuisineName.trim()) {
                          await updateCuisineType(ct.id, editingCuisineName.trim())
                          const refreshed = await fetchCuisineTypes()
                          if (refreshed.success) setCuisineTypes(refreshed.cuisineTypes)
                          setEditingCuisineId(null)
                        } else if (e.key === "Escape") {
                          setEditingCuisineId(null)
                        }
                      }}
                      onBlur={async () => {
                        if (editingCuisineName.trim() && editingCuisineName.trim() !== ct.name) {
                          await updateCuisineType(ct.id, editingCuisineName.trim())
                          const refreshed = await fetchCuisineTypes()
                          if (refreshed.success) setCuisineTypes(refreshed.cuisineTypes)
                        }
                        setEditingCuisineId(null)
                      }}
                    />
                  ) : (
                    <span
                      className="text-sm cursor-pointer hover:text-blue-600"
                      onClick={() => {
                        setEditingCuisineId(ct.id)
                        setEditingCuisineName(ct.name)
                      }}
                      title="Clic para editar"
                    >
                      {ct.name}
                    </span>
                  )}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-gray-400 hover:text-blue-600"
                      onClick={() => {
                        setEditingCuisineId(ct.id)
                        setEditingCuisineName(ct.name)
                      }}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-gray-400 hover:text-red-600"
                      onClick={async () => {
                        const result = await deleteCuisineType(ct.id)
                        if (result.success) {
                          setCuisineTypes((prev) => prev.filter((c) => c.id !== ct.id))
                        }
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCuisineManager(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Area Manager Dialog */}
      <Dialog open={showAreaManager} onOpenChange={setShowAreaManager}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Administrar Areas / Zonas</DialogTitle>
            <DialogDescription>Agrega, edita o elimina las areas disponibles para los restaurantes y sucursales.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Add new area */}
            <div className="flex gap-2">
              <Input
                placeholder="Nueva area (ej: Bayamon)"
                value={newAreaName}
                onChange={(e) => setNewAreaName(e.target.value)}
                onKeyDown={async (e) => {
                  if (e.key === "Enter" && newAreaName.trim()) {
                    const result = await createMarketplaceArea(newAreaName.trim())
                    if (result.success) {
                      const refreshed = await fetchMarketplaceAreas()
                      if (refreshed.success) setMarketplaceAreas(refreshed.areas)
                      setNewAreaName("")
                    }
                  }
                }}
              />
              <Button
                size="sm"
                className="shrink-0"
                disabled={!newAreaName.trim()}
                onClick={async () => {
                  if (!newAreaName.trim()) return
                  const result = await createMarketplaceArea(newAreaName.trim())
                  if (result.success) {
                    const refreshed = await fetchMarketplaceAreas()
                    if (refreshed.success) setMarketplaceAreas(refreshed.areas)
                    setNewAreaName("")
                  }
                }}
              >
                <Plus className="w-4 h-4 mr-1" />
                Agregar
              </Button>
            </div>

            {/* List existing areas */}
            <div className="border rounded-lg divide-y max-h-80 overflow-y-auto">
              {marketplaceAreas.length === 0 && (
                <p className="text-sm text-muted-foreground p-4 text-center">No hay areas definidas.</p>
              )}
              {marketplaceAreas.map((area) => (
                <div key={area.id} className="flex items-center justify-between px-3 py-2 group hover:bg-gray-50">
                  {editingAreaId === area.id ? (
                    <Input
                      value={editingAreaName}
                      onChange={(e) => setEditingAreaName(e.target.value)}
                      className="h-7 text-sm"
                      autoFocus
                      onKeyDown={async (e) => {
                        if (e.key === "Enter" && editingAreaName.trim()) {
                          await updateMarketplaceArea(area.id, editingAreaName.trim())
                          const refreshed = await fetchMarketplaceAreas()
                          if (refreshed.success) setMarketplaceAreas(refreshed.areas)
                          setEditingAreaId(null)
                        } else if (e.key === "Escape") {
                          setEditingAreaId(null)
                        }
                      }}
                      onBlur={async () => {
                        if (editingAreaName.trim() && editingAreaName.trim() !== area.name) {
                          await updateMarketplaceArea(area.id, editingAreaName.trim())
                          const refreshed = await fetchMarketplaceAreas()
                          if (refreshed.success) setMarketplaceAreas(refreshed.areas)
                        }
                        setEditingAreaId(null)
                      }}
                    />
                  ) : (
                    <span
                      className="text-sm cursor-pointer hover:text-blue-600"
                      onClick={() => {
                        setEditingAreaId(area.id)
                        setEditingAreaName(area.name)
                      }}
                      title="Clic para editar"
                    >
                      {area.name}
                    </span>
                  )}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-gray-400 hover:text-blue-600"
                      onClick={() => {
                        setEditingAreaId(area.id)
                        setEditingAreaName(area.name)
                      }}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-gray-400 hover:text-red-600"
                      onClick={async () => {
                        const result = await deleteMarketplaceArea(area.id)
                        if (result.success) {
                          setMarketplaceAreas((prev) => prev.filter((a) => a.id !== area.id))
                        }
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAreaManager(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
