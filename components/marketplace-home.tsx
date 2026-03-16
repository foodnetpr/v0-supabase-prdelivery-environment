"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"
import Image from "next/image"
import { useState, useMemo, useEffect, useRef } from "react"
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react"
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
  latitude?: string | null
  longitude?: string | null
  delivery_radius_miles?: number | null
  delivery_enabled?: boolean
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
}: MarketplaceHomeProps) {
  const heroImage = marketplaceSettings?.hero_image_url || "/images/partners-hero.jpg"
  const heroTitle = marketplaceSettings?.hero_title || "De Todo para Tu Junte"
  const heroSubtitle = marketplaceSettings?.hero_subtitle || "Monta el Party con nuestras deliciosas opciones..."

  const [userLocation, setUserLocation] = useState<UserLocation | null>(null)
  const [orderMode, setOrderMode] = useState<OrderMode>("delivery")
  const [cuisineFilter, setCuisineFilter] = useState<string>("all")
  const [locationFilter, setLocationFilter] = useState<string>("all")

  const AREAS = [
    "Hato Rey", "Condado", "Miramar", "Isla Verde", "Puerto Nuevo",
    "Rio Piedras", "Santurce", "Guaynabo Pueblo", "San Patricio", "Señorial",
  ]

  // Filter and sort restaurants based on user location and other filters
  const filteredRestaurants = useMemo(() => {
    let filtered = restaurants.filter((restaurant) => {
      // Cuisine filter - match by cuisine type name (case-insensitive)
      const matchesCuisine = cuisineFilter === "all" || 
        restaurant.cuisine_type?.toLowerCase() === cuisineFilter.toLowerCase()
      const matchesLocation = locationFilter === "all" || restaurant.area === locationFilter
      
      // If user has set a location, filter by delivery radius
      if (userLocation && restaurant.latitude && restaurant.longitude) {
        const distance = calculateDistance(
          userLocation.lat,
          userLocation.lng,
          parseFloat(restaurant.latitude),
          parseFloat(restaurant.longitude)
        )
        const deliveryRadius = restaurant.delivery_radius_miles || 10
        const withinDeliveryZone = distance <= deliveryRadius
        return matchesCuisine && matchesLocation && withinDeliveryZone
      }
      
      return matchesCuisine && matchesLocation
    })

    // Sort by distance if user has location
    if (userLocation) {
      filtered = filtered
        .map((restaurant) => {
          if (restaurant.latitude && restaurant.longitude) {
            const distance = calculateDistance(
              userLocation.lat,
              userLocation.lng,
              parseFloat(restaurant.latitude),
              parseFloat(restaurant.longitude)
            )
            return { ...restaurant, calculatedDistance: distance }
          }
          return { ...restaurant, calculatedDistance: Infinity }
        })
        .sort((a, b) => (a.calculatedDistance || 0) - (b.calculatedDistance || 0))
    }

    return filtered
  }, [restaurants, cuisineFilter, locationFilter, userLocation])

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
        restaurantCuisines={restaurants.map(r => r.cuisine_type).filter(Boolean) as string[]}
      />

      {/* Hero - Full-width banner matching partners style */}
      <PromoBar />

      {/* Restaurant Grid */}
      {restaurants.length > 0 && (
        <section id="restaurantes" className="pt-4 sm:pt-6 pb-12 sm:pb-16">
          <div className="px-4">
            <div className="grid grid-cols-2 gap-3 sm:gap-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {filteredRestaurants.map((restaurant) => (
                <RestaurantCard key={restaurant.id} restaurant={restaurant} />
              ))}
            </div>
          </div>
        </section>
      )}

      {filteredRestaurants.length === 0 && restaurants.length > 0 && (
        <div className="px-4 py-12 sm:py-20 text-center">
          <Card className="p-6 sm:p-12 max-w-2xl mx-auto border-slate-200">
            <h3 className="text-lg sm:text-2xl font-bold mb-3 sm:mb-4 text-slate-900">No Se Encontraron Restaurantes</h3>
            <p className="text-sm sm:text-base text-slate-600 mb-4 sm:mb-6">
              No hay restaurantes que coincidan con los filtros seleccionados.
            </p>
            <Button
              onClick={() => {
                setCuisineFilter("all")
                setLocationFilter("all")
              }}
              variant="outline"
              className="border-slate-300"
            >
              Limpiar Filtros
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

function PromoBar() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showLeftArrow, setShowLeftArrow] = useState(false)
  const [showRightArrow, setShowRightArrow] = useState(true)

  const promos = [
    {
      id: "1",
      image: "/images/slide-catering-1.jpg",
      badge: "Oferta Especial",
      title: "Catering para tu Evento",
      subtitle: "Ordena hoy",
      badgeColor: "bg-red-500",
    },
    {
      id: "2",
      image: "/images/slide-catering-2.jpg",
      badge: "Nuevo",
      title: "Menú Corporativo",
      subtitle: "Desde $15/persona",
      badgeColor: "bg-emerald-500",
    },
    {
      id: "3",
      image: "/images/slide-catering-3.jpg",
      badge: "Popular",
      title: "Fiestas y Celebraciones",
      subtitle: "Paquetes especiales",
      badgeColor: "bg-amber-500",
    },
    {
      id: "4",
      image: "/images/slide-catering-1.jpg",
      badge: "2x1",
      title: "Platos Principales",
      subtitle: "Solo esta semana",
      badgeColor: "bg-red-500",
    },
    {
      id: "5",
      image: "/images/slide-catering-2.jpg",
      badge: "Gratis",
      title: "Delivery Gratis",
      subtitle: "En ordenes +$50",
      badgeColor: "bg-blue-500",
    },
  ]

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
      <div className="px-4">
        {/* Section header */}
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h2 className="text-base sm:text-lg font-bold text-slate-900">Ofertas y Promociones</h2>
          <div className="flex items-center gap-1">
            <button
              onClick={() => scroll("left")}
              disabled={!showLeftArrow}
              className={`p-1.5 rounded-full transition-colors ${
                showLeftArrow ? "bg-slate-100 hover:bg-slate-200 text-slate-700" : "text-slate-300 cursor-not-allowed"
              }`}
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => scroll("right")}
              disabled={!showRightArrow}
              className={`p-1.5 rounded-full transition-colors ${
                showRightArrow ? "bg-slate-100 hover:bg-slate-200 text-slate-700" : "text-slate-300 cursor-not-allowed"
              }`}
              aria-label="Scroll right"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable promo cards */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex gap-3 sm:gap-4 overflow-x-auto scrollbar-hide pb-2 -mx-3 px-3 sm:mx-0 sm:px-0"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {promos.map((promo) => (
            <Link
              key={promo.id}
              href="#"
              className="flex-shrink-0 w-[240px] sm:w-[300px] group"
            >
              <div className="relative aspect-[5/2] rounded-lg overflow-hidden bg-slate-100">
                <Image
                  src={promo.image}
                  alt={promo.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                {/* Badge pill */}
                <div className={`absolute top-2 left-2 ${promo.badgeColor} text-white text-[10px] font-bold px-2 py-0.5 rounded`}>
                  {promo.badge}
                </div>
                {/* Text inside card */}
                <div className="absolute bottom-2 left-2 right-2">
                  <h3 className="font-semibold text-sm text-white leading-tight">
                    {promo.title}
                  </h3>
                  <p className="text-[10px] text-white/80">{promo.subtitle}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

function RestaurantCard({ restaurant }: { restaurant: Restaurant }) {
  const cuisineLabel = restaurant.cuisine_type || "Catering"
  const featuredImage = restaurant.marketplace_image_url
  const logoImage = restaurant.logo_url

  return (
    <Link href={`/${restaurant.slug}`} className="block h-full">
      <div className="group overflow-hidden rounded-xl sm:rounded-2xl border border-slate-200 bg-white transition-all duration-300 hover:border-amber-200 hover:shadow-lg hover:shadow-amber-600/5 h-full flex flex-col">
        <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
          {/* Featured/Background Image */}
          {featuredImage ? (
            <Image
              src={featuredImage}
              alt={restaurant.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
              <span className="text-2xl sm:text-4xl font-bold text-slate-300">{restaurant.name.charAt(0)}</span>
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
