"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"
import Image from "next/image"
import { useState, useMemo, useEffect, useCallback } from "react"
import { Filter, ChevronLeft, ChevronRight, ArrowRight } from "lucide-react"
import { LocationBar, type UserLocation } from "./location-bar"

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

interface MarketplaceHomeProps {
  restaurants: Restaurant[]
  marketplaceSettings?: MarketplaceSettings
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
}: MarketplaceHomeProps) {
  const heroImage = marketplaceSettings?.hero_image_url || "/images/partners-hero.jpg"
  const heroTitle = marketplaceSettings?.hero_title || "De Todo para Tu Junte"
  const heroSubtitle = marketplaceSettings?.hero_subtitle || "Monta el Party con nuestras deliciosas opciones..."

  const [userLocation, setUserLocation] = useState<UserLocation | null>(null)
  const [cuisineFilter, setCuisineFilter] = useState<string>("all")
  const [locationFilter, setLocationFilter] = useState<string>("all")

  const cuisineTypes = useMemo(() => {
    const types = new Set(restaurants.map((r) => r.cuisine_type).filter(Boolean))
    return Array.from(types).sort()
  }, [restaurants])

  const AREAS = [
    "Hato Rey", "Condado", "Miramar", "Isla Verde", "Puerto Nuevo",
    "Rio Piedras", "Santurce", "Guaynabo Pueblo", "San Patricio", "Señorial",
  ]

  // Filter and sort restaurants based on user location and other filters
  const filteredRestaurants = useMemo(() => {
    let filtered = restaurants.filter((restaurant) => {
      const matchesCuisine = cuisineFilter === "all" || restaurant.cuisine_type === cuisineFilter
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
      {/* Navigation - matches partners page */}
      <nav className="sticky top-0 z-50 border-b border-slate-100 bg-white/90 backdrop-blur-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link href="/" className="flex items-center">
            <Image
              src="/foodnet-delivery-logo.jpg"
              alt="FoodNetDelivery"
              width={160}
              height={48}
              className="h-9 w-auto"
            />
          </Link>
        </div>
      </nav>

      {/* Location Bar - DoorDash/UberEats style location capture */}
      <LocationBar 
        onLocationChange={setUserLocation}
        initialLocation={userLocation}
      />

      {/* Hero - Full-width banner matching partners style */}
      <HeroSlideshow
        heroTitle={heroTitle}
        heroSubtitle={heroSubtitle}
        heroImage={heroImage}
      />

      {/* Filters */}
      <section className="border-b border-slate-100 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-4">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-slate-500" />
              <span className="font-semibold text-sm text-slate-700">Filtrar:</span>
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="cuisine-filter" className="text-sm text-slate-600 whitespace-nowrap">
                Tipo de Cocina:
              </label>
              <Select value={cuisineFilter} onValueChange={setCuisineFilter}>
                <SelectTrigger className="w-[180px] bg-white border-slate-200 text-sm" id="cuisine-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {cuisineTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="location-filter" className="text-sm text-slate-600 whitespace-nowrap">
                Zona:
              </label>
              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger className="w-[180px] bg-white border-slate-200 text-sm" id="location-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toda Zona</SelectItem>
                  {AREAS.map((area) => (
                    <SelectItem key={area} value={area}>
                      {area}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </section>

      {/* Restaurant Grid */}
      {restaurants.length > 0 && (
        <section id="restaurantes" className="pt-6 pb-16">
          <div className="mx-auto max-w-6xl px-6">
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {filteredRestaurants.map((restaurant) => (
                <RestaurantCard key={restaurant.id} restaurant={restaurant} />
              ))}
            </div>
          </div>
        </section>
      )}

      {filteredRestaurants.length === 0 && restaurants.length > 0 && (
        <div className="mx-auto max-w-6xl px-6 py-20 text-center">
          <Card className="p-12 max-w-2xl mx-auto border-slate-200">
            <h3 className="text-2xl font-bold mb-4 text-slate-900">No Se Encontraron Restaurantes</h3>
            <p className="text-slate-600 mb-6">
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
        <div className="mx-auto max-w-6xl px-6 py-20 text-center">
          <Card className="p-12 max-w-2xl mx-auto border-slate-200">
            <h3 className="text-2xl font-bold mb-4 text-slate-900">No Hay Restaurantes Disponibles</h3>
            <p className="text-slate-600">Vuelva pronto mientras los restaurantes se unen a nuestro mercado.</p>
          </Card>
        </div>
      )}

      <MarketplaceFooter />
    </div>
  )
}

function HeroSlideshow({
  heroTitle,
  heroSubtitle,
  heroImage,
}: {
  heroTitle: string
  heroSubtitle: string
  heroImage: string
}) {
  const slides = [
    {
      image: heroImage,
      title: heroTitle,
      subtitle: heroSubtitle,
    },
  {
    image: "/images/slide-catering-2.jpg",
    title: "Lo Hacemos Fácil para tí",
    subtitle: "Servicio completo... ya sea para reuniones familiares o eventos corporativos",
  },
  {
    image: "/images/slide-catering-3.jpg",
    title: "Sabor que Conecta",
    subtitle: "Personaliza tu menú para cada ocasión...",
    },
  ]

  const [currentSlide, setCurrentSlide] = useState(0)

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % slides.length)
  }, [slides.length])

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)
  }, [slides.length])

  useEffect(() => {
    const timer = setInterval(nextSlide, 5000)
    return () => clearInterval(timer)
  }, [nextSlide])

  return (
    <section className="relative min-h-[320px] flex items-center overflow-hidden">
      {/* Slide backgrounds */}
      {slides.map((slide, index) => (
        <div
          key={index}
          className="absolute inset-0 transition-opacity duration-700 ease-in-out"
          style={{
            opacity: index === currentSlide ? 1 : 0,
            zIndex: index === currentSlide ? 1 : 0,
          }}
        >
          <Image
            src={slide.image}
            alt=""
            fill
            className="object-cover"
            priority={index === 0}
          />
        </div>
      ))}
      <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-900/70 to-slate-900/40 z-[2]" />

      {/* Content - left-aligned matching partners hero */}
      <div className="relative z-10 mx-auto w-full max-w-6xl px-6 py-14">
        <div className="max-w-2xl">
          <span className="mb-3 inline-block rounded-full bg-amber-400/90 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-900">
            Mercado Boricua para el Mejor Catering
          </span>
          <h1 className="text-balance text-3xl font-bold leading-tight tracking-tight text-white md:text-4xl lg:text-5xl">
            {slides[currentSlide].title}
          </h1>
          <p className="mt-3 max-w-xl text-pretty text-base leading-relaxed text-slate-200">
            {slides[currentSlide].subtitle}
          </p>
        </div>
      </div>

      {/* Navigation arrows */}
      <button
        onClick={prevSlide}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors"
        aria-label="Slide anterior"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        onClick={nextSlide}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors"
        aria-label="Siguiente slide"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      {/* Dots indicator */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
              index === currentSlide ? "bg-white w-6" : "bg-white/50 hover:bg-white/70"
            }`}
            aria-label={`Ir al slide ${index + 1}`}
          />
        ))}
      </div>
    </section>
  )
}

function RestaurantCard({ restaurant }: { restaurant: Restaurant }) {
  const cuisineLabel = restaurant.cuisine_type || "Catering"
  const tileImage = restaurant.marketplace_image_url || restaurant.logo_url

  return (
    <Link href={`/${restaurant.slug}`} className="block h-full">
      <div className="group overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all duration-300 hover:border-amber-200 hover:shadow-lg hover:shadow-amber-600/5 h-full flex flex-col">
        <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
          {tileImage ? (
            <Image
              src={tileImage || "/placeholder.svg"}
              alt={restaurant.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
              <span className="text-4xl font-bold text-slate-300">{restaurant.name.charAt(0)}</span>
            </div>
          )}
        </div>

        <div className="p-4 bg-white flex-1 flex flex-col justify-center">
          <h3 className="font-semibold text-sm text-slate-900 leading-tight">
            {restaurant.name}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5 uppercase tracking-wide">{cuisineLabel}</p>
        </div>
      </div>
    </Link>
  )
}

function MarketplaceFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white py-8 mt-auto">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 sm:flex-row">
        <Image
          src="/foodnet-delivery-logo.jpg"
          alt="FoodNetDelivery"
          width={120}
          height={36}
          className="h-7 w-auto"
        />
        <div className="flex items-center gap-6 text-xs text-slate-500">
          <Link href="/partners" className="hover:text-slate-900 transition-colors">
            Para Restaurantes
          </Link>
          <span className="text-slate-300">|</span>
          <span suppressHydrationWarning>
            &copy; {new Date().getFullYear()} FoodNetDelivery. Todos los derechos reservados.
          </span>
        </div>
      </div>
    </footer>
  )
}
