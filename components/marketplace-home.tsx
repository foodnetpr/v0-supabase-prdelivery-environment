"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"
import Image from "next/image"
import { useState, useMemo, useEffect, useRef } from "react"
import { ChevronLeft, ChevronRight, ArrowRight, Search, X, RotateCcw } from "lucide-react"
import { type UserLocation, type OrderMode } from "./location-bar"
import { CuisineBar } from "./cuisine-bar"
import { GlobalNavbar } from "./global-navbar"

type Restaurant = {
  id: string
  name: string
  slug: string
  logo_url: string | null
  marketplace_image_url: string | null
  primary_color: string | null
  city: string | null
  state: string | null
  cuisine_type: string | null
  cuisine_types: string[] | null
  latitude?: string | null
  longitude?: string | null
  delivery_radius_miles?: number | null
  delivery_zip_codes?: string[] | null
  delivery_enabled?: boolean
}

type RestaurantWithDistance = Restaurant & {
  calculatedDistance: number | null
  inDeliveryZone: boolean
}

type MarketplaceSettings = {
  id: string
  hero_image_url: string | null
  hero_title: string
  hero_subtitle: string
}

type CuisineType = {
  id: string
  name: string
  icon_url: string | null
  display_order: number
}

interface MarketplaceHomeProps {
  restaurants: Restaurant[]
  marketplaceSettings?: MarketplaceSettings
  cuisineTypes: CuisineType[]
  blockedZipCodes?: string[]
}

// Haversine formula to calculate distance between two points
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959 // Earth's radius in miles
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180)
}

export function MarketplaceHome({
  restaurants,
  marketplaceSettings,
  cuisineTypes,
  blockedZipCodes = [],
}: MarketplaceHomeProps) {
  const heroImage = marketplaceSettings?.hero_image_url || "/images/partners-hero.jpg"
  const heroTitle = marketplaceSettings?.hero_title || "De Todo para Tu Junte"
  const heroSubtitle = marketplaceSettings?.hero_subtitle || "Monta el Party con nuestras deliciosas opciones..."

  const [userLocation, setUserLocation] = useState<UserLocation | null>(null)
  const [orderMode, setOrderMode] = useState<OrderMode>("delivery")
  const [cuisineFilter, setCuisineFilter] = useState<string>("all")
  const [locationFilter, setLocationFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState<string>("")

  const AREAS = [
    "Hato Rey", "Condado", "Miramar", "Isla Verde", "Puerto Nuevo",
    "Rio Piedras", "Santurce", "Guaynabo Pueblo", "San Patricio", "Señorial",
  ]

  // Compute distance + delivery zone for every restaurant, then filter/sort
  const restaurantsWithDistance = useMemo((): RestaurantWithDistance[] => {
    return restaurants.map((restaurant) => {
      if (!userLocation || !restaurant.latitude || !restaurant.longitude) {
        return { ...restaurant, calculatedDistance: null, inDeliveryZone: true }
      }

      const distance = calculateDistance(
        userLocation.lat,
        userLocation.lng,
        parseFloat(restaurant.latitude),
        parseFloat(restaurant.longitude)
      )

      // Check delivery zip code match if available
      let inDeliveryZone: boolean
      if (restaurant.delivery_zip_codes && restaurant.delivery_zip_codes.length > 0 && userLocation.zip) {
        inDeliveryZone = restaurant.delivery_zip_codes.includes(userLocation.zip)
      } else {
        const deliveryRadius = restaurant.delivery_radius_miles ?? 10
        inDeliveryZone = distance <= deliveryRadius
      }

      return { ...restaurant, calculatedDistance: distance, inDeliveryZone }
    })
  }, [restaurants, userLocation])

  const filteredRestaurants = useMemo((): RestaurantWithDistance[] => {
    const filtered = restaurantsWithDistance.filter((restaurant) => {
      // Search filter - match name or cuisine
      const query = searchQuery.toLowerCase().trim()
      const cuisineList = restaurant.cuisine_types?.length
        ? restaurant.cuisine_types
        : restaurant.cuisine_type ? [restaurant.cuisine_type] : []
      
      const matchesSearch = query === "" || 
        restaurant.name.toLowerCase().includes(query) ||
        cuisineList.some((c) => c.toLowerCase().includes(query))
      
      const matchesCuisine =
        cuisineFilter === "all" ||
        cuisineList.some((c) => c.toLowerCase() === cuisineFilter.toLowerCase())
      const matchesLocation = locationFilter === "all" || (restaurant as any).area === locationFilter
      return matchesSearch && matchesCuisine && matchesLocation
    })

    // Sort: available (in zone) first by distance, then out-of-zone last
    return [...filtered].sort((a, b) => {
      if (a.inDeliveryZone && !b.inDeliveryZone) return -1
      if (!a.inDeliveryZone && b.inDeliveryZone) return 1
      const dA = a.calculatedDistance ?? Infinity
      const dB = b.calculatedDistance ?? Infinity
      return dA - dB
    })
  }, [restaurantsWithDistance, cuisineFilter, locationFilter, searchQuery])

  return (
    <div className="flex flex-col min-h-screen bg-white font-sans">
      {/* Global Navigation with spacer bar */}
      <GlobalNavbar 
        showLocationBar={true}
        onLocationChange={setUserLocation}
        onModeChange={setOrderMode}
      />

      {/* Cuisine Type Icons Bar */}
      <CuisineBar
        selectedCuisine={cuisineFilter}
        onCuisineChange={setCuisineFilter}
        cuisineTypes={cuisineTypes}
        restaurantCuisines={restaurants.flatMap(r =>
          r.cuisine_types?.length ? r.cuisine_types : (r.cuisine_type ? [r.cuisine_type] : [])
        )}
      />

      {/* Hero - Full-width banner matching partners style */}
      <PromoBar 
        searchQuery={searchQuery} 
        onSearchChange={setSearchQuery}
        resultCount={filteredRestaurants.length}
        cuisineFilter={cuisineFilter}
        onResetFilters={() => {
          setCuisineFilter("all")
          setLocationFilter("all")
          setSearchQuery("")
        }}
      />

      {/* Blocked zip code banner */}
      {userLocation?.zip && blockedZipCodes.includes(userLocation.zip) && (
        <div className="bg-red-600 text-white px-4 py-3">
          <div className="mx-auto max-w-7xl flex items-start gap-3">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            <div>
              <p className="font-semibold text-sm">Zona temporalmente no disponible</p>
              <p className="text-sm text-red-100 mt-0.5">
                El código postal <span className="font-mono font-bold">{userLocation.zip}</span> está temporalmente bloqueado para entregas debido a un evento o cierre de vías. Por favor intenta más tarde.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* No location banner */}
      {!userLocation && (
        <div className="bg-amber-50 border-b border-amber-100 px-4 py-2.5">
          <div className="mx-auto max-w-7xl flex items-center gap-2 text-sm text-amber-800">
            <svg className="w-4 h-4 flex-shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Ingresa tu dirección para ver qué restaurantes entregan en tu zona.</span>
          </div>
        </div>
      )}

      {/* Restaurant Grid */}
      {restaurants.length > 0 && (
        <section id="restaurantes" className="pt-4 sm:pt-6 pb-12 sm:pb-16">
          <div className="px-4 mx-auto max-w-7xl">
            <div className="grid grid-cols-2 gap-3 sm:gap-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {filteredRestaurants.map((restaurant) => (
                <RestaurantCard
                  key={restaurant.id}
                  restaurant={restaurant}
                  distance={restaurant.calculatedDistance}
                  inDeliveryZone={restaurant.inDeliveryZone}
                  hasLocation={!!userLocation}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {filteredRestaurants.length === 0 && restaurants.length > 0 && (
        <div className="px-4 py-12 sm:py-20 text-center">
          <Card className="p-6 sm:p-12 max-w-2xl mx-auto border-slate-200">
            <h3 className="text-lg sm:text-2xl font-bold mb-3 sm:mb-4 text-slate-900">
              {searchQuery ? "No encontramos restaurantes" : "No Se Encontraron Restaurantes"}
            </h3>
            <p className="text-sm sm:text-base text-slate-600 mb-4 sm:mb-6">
              {searchQuery 
                ? `No encontramos restaurantes con "${searchQuery}". Intenta con otra busqueda.`
                : "No hay restaurantes que coincidan con los filtros seleccionados."
              }
            </p>
            <Button
              onClick={() => {
                setSearchQuery("")
                setCuisineFilter("all")
                setLocationFilter("all")
              }}
              variant="outline"
              className="border-slate-300"
            >
              {searchQuery ? "Limpiar Busqueda" : "Limpiar Filtros"}
            </Button>
          </Card>
        </div>
      )}

      {filteredRestaurants.length === 0 && restaurants.length === 0 && (
        <div className="px-4 py-12 sm:py-20 text-center">
          <Card className="p-6 sm:p-12 max-w-2xl mx-auto border-slate-200">
            <h3 className="text-lg sm:text-2xl font-bold mb-3 sm:mb-4 text-slate-900">No Hay Restaurantes Disponibles</h3>
            <p className="text-sm sm:text-base text-slate-600">Vuelva pronto mientras los restaurantes se unen a nuestro mercado.</p>
          </Card>
        </div>
      )}

      <MarketplaceFooter />
    </div>
  )
}

interface PromoCardData {
  id: string
  title: string
  subtitle: string | null
  badge_text: string | null
  badge_color: string
  image_url: string | null
  href: string | null
  display_order: number
  is_active: boolean
}

function PromoBar({ 
  searchQuery, 
  onSearchChange,
  resultCount,
  cuisineFilter,
  onResetFilters
}: { 
  searchQuery: string
  onSearchChange: (query: string) => void
  resultCount: number
  cuisineFilter: string
  onResetFilters: () => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showLeftArrow, setShowLeftArrow] = useState(false)
  const [showRightArrow, setShowRightArrow] = useState(true)
  const [promos, setPromos] = useState<PromoCardData[]>([])

  useEffect(() => {
    fetch("/api/super-admin/promo-cards")
      .then((r) => r.json())
      .then((data: PromoCardData[]) =>
        setPromos(data.filter((c) => c.is_active))
      )
      .catch(() => {})
  }, [])

  const handleScroll = () => {
    if (!scrollRef.current) return
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
    setShowLeftArrow(scrollLeft > 10)
    setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10)
  }

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return
    const scrollAmount = 320
    scrollRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    })
  }

  return (
    <section className="relative bg-white py-4 sm:py-6">
      <div className="px-4 mx-auto max-w-7xl">
        {/* Section header */}
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h2 className="text-base sm:text-lg font-bold text-slate-900">Ofertas y Promociones</h2>
          {/* Restaurant search and filter controls */}
          <div className="flex items-center gap-2">
            {/* Ver Todos button - shows when filters are active */}
            {(cuisineFilter !== "all" || searchQuery) && (
              <button
                onClick={onResetFilters}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Ver Todos</span>
              </button>
            )}
            {/* Search input */}
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 rounded-lg bg-white hover:border-slate-300 focus-within:border-slate-400 focus-within:ring-1 focus-within:ring-slate-200 transition-colors min-w-[200px] sm:min-w-[280px]">
              <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Busqueda de Restaurantes"
                className="flex-1 text-sm text-slate-700 placeholder:text-slate-400 bg-transparent border-none outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange("")}
                  className="p-0.5 hover:bg-slate-100 rounded-full transition-colors"
                  aria-label="Limpiar busqueda"
                >
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              )}
            </div>
            {searchQuery && (
              <span className="text-xs text-slate-500">
                {resultCount} restaurante{resultCount !== 1 ? "s" : ""} encontrado{resultCount !== 1 ? "s" : ""}
              </span>
            )}
            </div>
          </div>
        </div>

        {/* Promo cards - show 4 cards in a grid, no scroll */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {promos.slice(0, 4).map((promo) => (
            <Link
              key={promo.id}
              href={promo.href ?? "#"}
              className="group"
            >
              <div className="relative aspect-[5/2] rounded-lg overflow-hidden bg-slate-100">
                {promo.image_url && (
                  <Image
                    src={promo.image_url}
                    alt={promo.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                )}
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                {/* Badge pill */}
                {promo.badge_text && (
                  <div className={`absolute top-2 left-2 ${promo.badge_color} text-white text-[10px] font-bold px-2 py-0.5 rounded`}>
                    {promo.badge_text}
                  </div>
                )}
                {/* Text inside card */}
                <div className="absolute bottom-2 left-2 right-2">
                  <h3 className="font-semibold text-sm text-white leading-tight">
                    {promo.title}
                  </h3>
                  {promo.subtitle && <p className="text-[10px] text-white/80">{promo.subtitle}</p>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

function RestaurantCard({
  restaurant,
  distance,
  inDeliveryZone,
  hasLocation,
}: {
  restaurant: Restaurant
  distance: number | null
  inDeliveryZone: boolean
  hasLocation: boolean
}) {
  const cuisineLabel = restaurant.cuisine_types?.length
    ? restaurant.cuisine_types.join(" · ")
    : restaurant.cuisine_type || "Catering"
  const featuredImage = restaurant.marketplace_image_url
  const logoImage = restaurant.logo_url
  const unavailable = hasLocation && !inDeliveryZone

  const distanceLabel =
    distance !== null
      ? distance < 0.1
        ? "Menos de 0.1 mi"
        : `${distance.toFixed(1)} mi`
      : null

  return (
    <Link
      href={unavailable ? "#" : `/${restaurant.slug}`}
      className="block h-full"
      onClick={unavailable ? (e) => e.preventDefault() : undefined}
      aria-disabled={unavailable}
    >
      <div
        className={`group overflow-hidden rounded-xl sm:rounded-2xl border bg-white transition-all duration-300 h-full flex flex-col ${
          unavailable
            ? "border-slate-100 opacity-50 cursor-not-allowed grayscale"
            : "border-slate-200 hover:border-amber-200 hover:shadow-lg hover:shadow-amber-600/5"
        }`}
      >
        <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
          {/* Featured/Background Image */}
          {featuredImage ? (
            <Image
              src={featuredImage}
              alt={restaurant.name}
              fill
              className={`object-cover ${!unavailable ? "group-hover:scale-105 transition-transform duration-500" : ""}`}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
              <span className="text-2xl sm:text-4xl font-bold text-slate-300">{restaurant.name.charAt(0)}</span>
            </div>
          )}

          {/* Distance badge */}
          {distanceLabel && (
            <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px] font-medium px-1.5 py-0.5 rounded-full backdrop-blur-sm">
              {distanceLabel}
            </div>
          )}

          {/* Out-of-zone overlay label */}
          {unavailable && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="bg-black/50 text-white text-[10px] sm:text-xs font-semibold px-2 py-1 rounded-full backdrop-blur-sm">
                Fuera de zona
              </span>
            </div>
          )}

          {/* Logo Overlay - bottom left corner */}
          {logoImage ? (
            <div className="absolute bottom-2 left-2 w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-white shadow-md overflow-hidden border border-slate-200">
              <Image
                src={logoImage}
                alt={`${restaurant.name} logo`}
                fill
                className="object-contain p-1"
              />
            </div>
          ) : featuredImage ? (
            <div className="absolute bottom-2 left-2 w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-white shadow-md flex items-center justify-center border border-slate-200">
              <span className="text-sm sm:text-lg font-bold text-slate-400">{restaurant.name.charAt(0)}</span>
            </div>
          ) : null}
        </div>

        <div className="p-2.5 sm:p-4 bg-white flex-1 flex flex-col justify-center">
          <h3 className="font-semibold text-xs sm:text-sm text-slate-900 leading-tight line-clamp-2">
            {restaurant.name}
          </h3>
          <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 uppercase tracking-wide truncate">{cuisineLabel}</p>
        </div>
      </div>
    </Link>
  )
}

function MarketplaceFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white py-6 sm:py-8 mt-auto">
      <div className="px-4 flex flex-col items-center justify-between gap-3 sm:gap-4 sm:flex-row">
        <Image
          src="/foodnet-delivery-logo.jpg"
          alt="FoodNetDelivery"
          width={120}
          height={36}
          className="h-6 sm:h-7 w-auto"
        />
        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-6 text-[10px] sm:text-xs text-slate-500 text-center">
          <Link href="/partners" className="hover:text-slate-900 transition-colors">
            Para Restaurantes
          </Link>
          <span className="text-slate-300 hidden sm:inline">|</span>
          <span suppressHydrationWarning>
            &copy; {new Date().getFullYear()} FoodNetDelivery
          </span>
        </div>
      </div>
    </footer>
  )
}
