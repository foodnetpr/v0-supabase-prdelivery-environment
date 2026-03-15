"use client"

import { useState, useEffect } from "react"
import { MapPin, Navigation, ChevronDown, X, Pencil, Truck, ShoppingBag } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AddressAutocomplete } from "./address-autocomplete"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const LOCATION_STORAGE_KEY = "foodnet_user_location"
const MODE_STORAGE_KEY = "foodnet_order_mode"

// Puerto Rico zip codes - common areas
const PUERTO_RICO_ZIP_CODES = [
  { zip: "00901", area: "San Juan - Viejo San Juan" },
  { zip: "00907", area: "San Juan - Condado" },
  { zip: "00909", area: "San Juan - Santurce" },
  { zip: "00911", area: "San Juan - Santurce" },
  { zip: "00913", area: "San Juan - Santurce" },
  { zip: "00917", area: "San Juan - Hato Rey" },
  { zip: "00918", area: "San Juan - Hato Rey" },
  { zip: "00920", area: "San Juan - Río Piedras" },
  { zip: "00921", area: "San Juan - Río Piedras" },
  { zip: "00923", area: "San Juan - Cupey" },
  { zip: "00924", area: "San Juan - Cupey" },
  { zip: "00926", area: "San Juan - Cupey Gardens" },
  { zip: "00927", area: "San Juan - Hato Rey" },
  { zip: "00936", area: "San Juan" },
  { zip: "00949", area: "Toa Baja" },
  { zip: "00950", area: "Toa Baja - Levittown" },
  { zip: "00951", area: "Toa Baja" },
  { zip: "00952", area: "Sabana Seca" },
  { zip: "00953", area: "Toa Alta" },
  { zip: "00956", area: "Bayamón" },
  { zip: "00957", area: "Bayamón" },
  { zip: "00958", area: "Bayamón" },
  { zip: "00959", area: "Bayamón" },
  { zip: "00960", area: "Bayamón" },
  { zip: "00961", area: "Bayamón" },
  { zip: "00962", area: "Cataño" },
  { zip: "00965", area: "Guaynabo" },
  { zip: "00966", area: "Guaynabo" },
  { zip: "00968", area: "Guaynabo" },
  { zip: "00969", area: "Guaynabo" },
  { zip: "00971", area: "Guaynabo" },
  { zip: "00976", area: "Trujillo Alto" },
  { zip: "00979", area: "Carolina" },
  { zip: "00982", area: "Carolina" },
  { zip: "00983", area: "Carolina - Isla Verde" },
  { zip: "00985", area: "Carolina" },
  { zip: "00987", area: "Carolina" },
]

export type OrderMode = "delivery" | "pickup"

export interface UserLocation {
  address: string
  lat: number
  lng: number
  zip?: string
}

interface LocationBarProps {
  onLocationChange: (location: UserLocation | null) => void
  onModeChange?: (mode: OrderMode) => void
  initialLocation?: UserLocation | null
  initialMode?: OrderMode
}

export function LocationBar({ 
  onLocationChange, 
  onModeChange,
  initialLocation, 
  initialMode = "delivery" 
}: LocationBarProps) {
  const [location, setLocation] = useState<UserLocation | null>(initialLocation || null)
  const [mode, setMode] = useState<OrderMode>(initialMode)
  const [isEditing, setIsEditing] = useState(false)
  const [addressInput, setAddressInput] = useState("")
  const [isLocating, setIsLocating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load from localStorage on mount
  useEffect(() => {
    const storedLocation = localStorage.getItem(LOCATION_STORAGE_KEY)
    const storedMode = localStorage.getItem(MODE_STORAGE_KEY) as OrderMode | null
    
    if (storedLocation) {
      try {
        const parsed = JSON.parse(storedLocation) as UserLocation
        setLocation(parsed)
        onLocationChange(parsed)
      } catch {
        // Invalid stored data
      }
    }
    
    if (storedMode && (storedMode === "delivery" || storedMode === "pickup")) {
      setMode(storedMode)
      onModeChange?.(storedMode)
    }
  }, [])

  // Save location to localStorage
  const saveLocation = (newLocation: UserLocation | null) => {
    setLocation(newLocation)
    if (newLocation) {
      localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(newLocation))
    } else {
      localStorage.removeItem(LOCATION_STORAGE_KEY)
    }
    onLocationChange(newLocation)
    setIsEditing(false)
    setError(null)
  }

  // Handle mode change
  const handleModeChange = (newMode: OrderMode) => {
    setMode(newMode)
    localStorage.setItem(MODE_STORAGE_KEY, newMode)
    onModeChange?.(newMode)
  }

  // Use browser geolocation
  const handleUseMyLocation = async () => {
    if (!navigator.geolocation) {
      setError("Tu navegador no soporta geolocalización")
      return
    }

    setIsLocating(true)
    setError(null)

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        
        try {
          const response = await fetch(
            `/api/places/reverse-geocode?lat=${latitude}&lng=${longitude}`
          )
          const data = await response.json()
          
          if (data.address) {
            saveLocation({
              address: data.address,
              lat: latitude,
              lng: longitude,
              zip: data.zip,
            })
          } else {
            saveLocation({
              address: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
              lat: latitude,
              lng: longitude,
            })
          }
        } catch {
          setError("No pudimos obtener tu dirección. Intenta ingresarla manualmente.")
        }
        setIsLocating(false)
      },
      (err) => {
        setIsLocating(false)
        if (err.code === err.PERMISSION_DENIED) {
          setError("Permiso de ubicación denegado. Por favor ingresa tu dirección manualmente.")
        } else {
          setError("No pudimos obtener tu ubicación. Intenta ingresarla manualmente.")
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  // Handle address selection from autocomplete
  const handleAddressSelected = async (components: { streetAddress: string; city: string; state: string; zip: string }) => {
    try {
      const fullAddress = `${components.streetAddress}, ${components.city}, ${components.state} ${components.zip}`
      const response = await fetch(
        `/api/places/geocode?address=${encodeURIComponent(fullAddress)}`
      )
      const data = await response.json()
      
      if (data.lat && data.lng) {
        saveLocation({
          address: fullAddress,
          lat: data.lat,
          lng: data.lng,
          zip: components.zip,
        })
      } else {
        setError("No pudimos encontrar esa dirección. Intenta con otra.")
      }
    } catch {
      setError("Error al buscar la dirección. Intenta de nuevo.")
    }
  }

  // Handle zip code selection
  const handleZipSelect = async (zip: string) => {
    if (!zip) return
    
    try {
      const response = await fetch(
        `/api/places/geocode?address=${encodeURIComponent(zip + ", Puerto Rico")}`
      )
      const data = await response.json()
      
      const zipInfo = PUERTO_RICO_ZIP_CODES.find(z => z.zip === zip)
      
      if (data.lat && data.lng) {
        saveLocation({
          address: zipInfo ? `${zipInfo.area} (${zip})` : `Código postal ${zip}`,
          lat: data.lat,
          lng: data.lng,
          zip: zip,
        })
      } else {
        setError("No pudimos encontrar ese código postal")
      }
    } catch {
      setError("Error al buscar el código postal")
    }
  }

  // If location is set and not editing, show compact view
  if (location && !isEditing) {
    return (
      <div className="bg-slate-900 text-white">
        <div className="mx-auto max-w-6xl px-6 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Mode Toggle */}
            <div className="flex items-center gap-1 bg-slate-800 rounded-full p-1">
              <button
                onClick={() => handleModeChange("delivery")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  mode === "delivery" 
                    ? "bg-amber-500 text-slate-900" 
                    : "text-slate-300 hover:text-white"
                }`}
              >
                <Truck className="h-4 w-4" />
                Delivery
              </button>
              <button
                onClick={() => handleModeChange("pickup")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  mode === "pickup" 
                    ? "bg-amber-500 text-slate-900" 
                    : "text-slate-300 hover:text-white"
                }`}
              >
                <ShoppingBag className="h-4 w-4" />
                Pick-Up
              </button>
            </div>

            {/* Location display */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <MapPin className="h-4 w-4 text-amber-400 flex-shrink-0" />
              <span className="text-sm truncate">
                {mode === "delivery" ? "Entregando a" : "Recogiendo cerca de"}: <span className="font-medium">{location.address}</span>
              </span>
            </div>

            {/* Edit button */}
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1 text-sm text-slate-300 hover:text-white transition-colors flex-shrink-0"
            >
              <Pencil className="h-3.5 w-3.5" />
              Cambiar
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Expanded location input view
  return (
    <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white">
      <div className="mx-auto max-w-6xl px-6 py-5">
        <div className="flex flex-col gap-4">
          {/* Mode Toggle - Prominent at top */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 bg-slate-800 rounded-full p-1">
              <button
                onClick={() => handleModeChange("delivery")}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  mode === "delivery" 
                    ? "bg-amber-500 text-slate-900" 
                    : "text-slate-300 hover:text-white"
                }`}
              >
                <Truck className="h-4 w-4" />
                Delivery
              </button>
              <button
                onClick={() => handleModeChange("pickup")}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  mode === "pickup" 
                    ? "bg-amber-500 text-slate-900" 
                    : "text-slate-300 hover:text-white"
                }`}
              >
                <ShoppingBag className="h-4 w-4" />
                Pick-Up
              </button>
            </div>
            
            {location && (
              <button
                onClick={() => setIsEditing(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Location Input Options */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Option 1: Use My Location button with pin inside */}
            <Button
              variant="outline"
              onClick={handleUseMyLocation}
              disabled={isLocating}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white gap-2 h-11"
            >
              <MapPin className={`h-4 w-4 ${isLocating ? "animate-pulse" : ""}`} />
              {isLocating ? "Localizando..." : "Usar mi ubicación"}
            </Button>

            {/* Divider */}
            <span className="hidden sm:block text-slate-500 text-sm">o</span>

            {/* Option 2: Address autocomplete */}
            <div className="flex-1 min-w-0">
              <AddressAutocomplete
                value={addressInput}
                onChange={setAddressInput}
                onAddressSelected={handleAddressSelected}
                placeholder="o ingresa tu dirección"
                className="bg-white text-slate-900 border-0 h-11 w-full"
              />
            </div>

            {/* Divider */}
            <span className="hidden sm:block text-slate-500 text-sm">o</span>

            {/* Option 3: Zip code dropdown */}
            <Select onValueChange={handleZipSelect}>
              <SelectTrigger className="w-full sm:w-56 bg-white text-slate-900 border-0 h-11">
                <SelectValue placeholder="Selecciona Zip Code" />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {PUERTO_RICO_ZIP_CODES.map((zipInfo) => (
                  <SelectItem key={zipInfo.zip} value={zipInfo.zip}>
                    {zipInfo.zip} - {zipInfo.area}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Error message */}
          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}
        </div>
      </div>
    </div>
  )
}
