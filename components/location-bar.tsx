"use client"

import { useState, useEffect, useRef } from "react"
import { MapPin, ChevronDown, X, Truck, ShoppingBag, Navigation, Loader2 } from "lucide-react"
import { AddressAutocomplete } from "./address-autocomplete"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
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
  { zip: "00949", area: "Toa Baja" },
  { zip: "00950", area: "Toa Baja - Levittown" },
  { zip: "00956", area: "Bayamón" },
  { zip: "00957", area: "Bayamón" },
  { zip: "00959", area: "Bayamón" },
  { zip: "00961", area: "Bayamón" },
  { zip: "00962", area: "Cataño" },
  { zip: "00965", area: "Guaynabo" },
  { zip: "00966", area: "Guaynabo" },
  { zip: "00968", area: "Guaynabo" },
  { zip: "00969", area: "Guaynabo" },
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
  const [isOpen, setIsOpen] = useState(false)
  const [addressInput, setAddressInput] = useState("")
  const [isLocating, setIsLocating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"location" | "address" | "zip">("location")

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
    setIsOpen(false)
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
          setError("No pudimos obtener tu dirección")
        }
        setIsLocating(false)
      },
      (err) => {
        setIsLocating(false)
        if (err.code === err.PERMISSION_DENIED) {
          setError("Permiso de ubicación denegado")
        } else {
          setError("No pudimos obtener tu ubicación")
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
        setError("No pudimos encontrar esa dirección")
      }
    } catch {
      setError("Error al buscar la dirección")
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

  // Truncate address for display
  const displayAddress = location?.address 
    ? location.address.length > 25 
      ? location.address.substring(0, 25) + "..." 
      : location.address
    : null

  return (
    <div className="flex items-center gap-3">
      {/* Location Dropdown */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-full border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors text-sm">
            <MapPin className="h-4 w-4 text-rose-600" />
            <span className="max-w-[180px] truncate font-medium text-slate-700">
              {displayAddress || "Ingresa ubicación"}
            </span>
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <div className="p-4 space-y-4">
            {/* Tab buttons for different input methods */}
            <div className="flex border-b border-slate-200">
              <button
                onClick={() => setActiveTab("location")}
                className={`flex-1 pb-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "location" 
                    ? "border-rose-600 text-rose-600" 
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                <Navigation className="h-4 w-4 inline mr-1" />
                Auto
              </button>
              <button
                onClick={() => setActiveTab("address")}
                className={`flex-1 pb-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "address" 
                    ? "border-rose-600 text-rose-600" 
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                Dirección
              </button>
              <button
                onClick={() => setActiveTab("zip")}
                className={`flex-1 pb-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "zip" 
                    ? "border-rose-600 text-rose-600" 
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                Zip Code
              </button>
            </div>

            {/* Tab content */}
            {activeTab === "location" && (
              <button
                onClick={handleUseMyLocation}
                disabled={isLocating}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors"
              >
                {isLocating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MapPin className="h-4 w-4" />
                )}
                {isLocating ? "Localizando..." : "Usar mi ubicación"}
              </button>
            )}

            {activeTab === "address" && (
              <AddressAutocomplete
                value={addressInput}
                onChange={setAddressInput}
                onAddressSelected={handleAddressSelected}
                placeholder="Ingresa tu dirección"
                className="w-full"
              />
            )}

            {activeTab === "zip" && (
              <Select onValueChange={handleZipSelect}>
                <SelectTrigger className="w-full">
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
            )}

            {/* Error message */}
            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}

            {/* Current location display with clear button */}
            {location && (
              <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                <span className="text-sm text-slate-600 truncate flex-1">{location.address}</span>
                <button
                  onClick={() => saveLocation(null)}
                  className="ml-2 p-1 hover:bg-slate-200 rounded"
                >
                  <X className="h-4 w-4 text-slate-400" />
                </button>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Mode Toggle - DoorDash style pill */}
      <div className="flex items-center bg-slate-100 rounded-full p-0.5">
        <button
          onClick={() => handleModeChange("delivery")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            mode === "delivery" 
              ? "bg-slate-900 text-white" 
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Delivery
        </button>
        <button
          onClick={() => handleModeChange("pickup")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            mode === "pickup" 
              ? "bg-slate-900 text-white" 
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Pickup
        </button>
      </div>
    </div>
  )
}
