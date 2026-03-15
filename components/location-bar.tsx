"use client"

import { useState, useEffect, useRef } from "react"
import { MapPin, Navigation, Loader2, X } from "lucide-react"
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

// Puerto Rico zip codes
const PUERTO_RICO_ZIP_CODES = [
  { zip: "00901", area: "Viejo San Juan" },
  { zip: "00907", area: "Condado" },
  { zip: "00909", area: "Santurce" },
  { zip: "00917", area: "Hato Rey" },
  { zip: "00918", area: "Hato Rey" },
  { zip: "00920", area: "Río Piedras" },
  { zip: "00923", area: "Cupey" },
  { zip: "00926", area: "Cupey Gardens" },
  { zip: "00949", area: "Toa Baja" },
  { zip: "00956", area: "Bayamón" },
  { zip: "00959", area: "Bayamón" },
  { zip: "00965", area: "Guaynabo" },
  { zip: "00968", area: "Guaynabo" },
  { zip: "00969", area: "Garden Hills" },
  { zip: "00976", area: "Trujillo Alto" },
  { zip: "00979", area: "Carolina" },
  { zip: "00983", area: "Isla Verde" },
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
  const [isLoadingGeo, setIsLoadingGeo] = useState(false)
  const [showAddressInput, setShowAddressInput] = useState(false)
  const [addressValue, setAddressValue] = useState("")
  const addressInputRef = useRef<HTMLDivElement>(null)

  // Load from localStorage on mount
  useEffect(() => {
    const savedLocation = localStorage.getItem(LOCATION_STORAGE_KEY)
    const savedMode = localStorage.getItem(MODE_STORAGE_KEY) as OrderMode | null
    
    if (savedLocation) {
      try {
        const parsed = JSON.parse(savedLocation)
        setLocation(parsed)
        onLocationChange(parsed)
      } catch (e) {
        console.error("Failed to parse saved location", e)
      }
    }
    
    if (savedMode) {
      setMode(savedMode)
      onModeChange?.(savedMode)
    }
  }, [])

  // Close address input when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (addressInputRef.current && !addressInputRef.current.contains(event.target as Node)) {
        setShowAddressInput(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleModeChange = (newMode: OrderMode) => {
    setMode(newMode)
    localStorage.setItem(MODE_STORAGE_KEY, newMode)
    onModeChange?.(newMode)
  }

  const handleLocationSet = (newLocation: UserLocation) => {
    setLocation(newLocation)
    localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(newLocation))
    onLocationChange(newLocation)
    setShowAddressInput(false)
  }

  const clearLocation = () => {
    setLocation(null)
    localStorage.removeItem(LOCATION_STORAGE_KEY)
    onLocationChange(null)
  }

  const handleUseMyLocation = async () => {
    if (!navigator.geolocation) {
      alert("Tu navegador no soporta geolocalización")
      return
    }

    setIsLoadingGeo(true)
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        
        try {
          const response = await fetch(`/api/places/reverse-geocode?lat=${latitude}&lng=${longitude}`)
          const data = await response.json()
          
          if (data.address) {
            handleLocationSet({
              address: data.address,
              lat: latitude,
              lng: longitude,
            })
          } else {
            handleLocationSet({
              address: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
              lat: latitude,
              lng: longitude,
            })
          }
        } catch (error) {
          handleLocationSet({
            address: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
            lat: latitude,
            lng: longitude,
          })
        }
        setIsLoadingGeo(false)
      },
      (error) => {
        console.error("Geolocation error:", error)
        alert("No pudimos obtener tu ubicación. Por favor ingresa tu dirección manualmente.")
        setIsLoadingGeo(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const handleAddressSelect = async (address: string, placeId?: string) => {
    if (placeId) {
      try {
        const response = await fetch(`/api/places/details?placeId=${placeId}`)
        const data = await response.json()
        
        if (data.lat && data.lng) {
          handleLocationSet({
            address: address,
            lat: data.lat,
            lng: data.lng,
          })
          return
        }
      } catch (error) {
        console.error("Error getting place details:", error)
      }
    }
    
    // Fallback to geocoding
    try {
      const response = await fetch(`/api/places/geocode?address=${encodeURIComponent(address)}`)
      const data = await response.json()
      
      if (data.lat && data.lng) {
        handleLocationSet({
          address: address,
          lat: data.lat,
          lng: data.lng,
        })
      }
    } catch (error) {
      console.error("Error geocoding address:", error)
    }
  }

  const handleZipSelect = async (zip: string) => {
    const zipData = PUERTO_RICO_ZIP_CODES.find((z) => z.zip === zip)
    if (!zipData) return
    
    try {
      const response = await fetch(`/api/places/geocode?address=${zip}, Puerto Rico`)
      const data = await response.json()
      
      if (data.lat && data.lng) {
        handleLocationSet({
          address: `${zipData.area}, PR ${zip}`,
          lat: data.lat,
          lng: data.lng,
          zip: zip,
        })
      }
    } catch (error) {
      console.error("Error geocoding zip:", error)
    }
  }

  const truncateAddress = (addr: string, maxLength: number = 20) => {
    if (addr.length <= maxLength) return addr
    return addr.substring(0, maxLength) + "..."
  }

  return (
    <div className="flex items-center gap-2 flex-1 justify-end">
      {/* Delivery / Pickup Toggle - Uber Eats style pill */}
      <div className="flex items-center bg-slate-100 rounded-full p-0.5">
        <button
          onClick={() => handleModeChange("delivery")}
          className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all ${
            mode === "delivery"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Delivery
        </button>
        <button
          onClick={() => handleModeChange("pickup")}
          className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all ${
            mode === "pickup"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Pickup
        </button>
      </div>

      {/* Location Section - show current location or input options */}
      {location ? (
        /* Current location display */
        <div className="flex items-center gap-1 bg-slate-50 rounded-full px-3 py-1.5 border border-slate-200">
          <MapPin className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
          <span className="text-xs text-slate-700 max-w-[140px] truncate">
            {truncateAddress(location.address)}
          </span>
          <button
            onClick={clearLocation}
            className="ml-1 p-0.5 hover:bg-slate-200 rounded-full transition-colors"
          >
            <X className="w-3 h-3 text-slate-400" />
          </button>
        </div>
      ) : (
        /* Location input options - all visible inline */
        <div className="flex items-center gap-2">
          {/* Auto location button */}
          <button
            onClick={handleUseMyLocation}
            disabled={isLoadingGeo}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-full text-xs font-medium text-slate-700 transition-colors disabled:opacity-50"
          >
            {isLoadingGeo ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Navigation className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">Auto</span>
          </button>

          {/* Address input with autocomplete */}
          <div ref={addressInputRef} className="relative">
            {showAddressInput ? (
              <div className="w-52">
                <AddressAutocomplete
                  placeholder="Ingresa dirección..."
                  value={addressValue}
                  onChange={setAddressValue}
                  onAddressSelected={async (components) => {
                    const fullAddress = `${components.streetAddress}, ${components.city}, ${components.state} ${components.zip}`
                    try {
                      const response = await fetch(`/api/places/geocode?address=${encodeURIComponent(fullAddress)}`)
                      const data = await response.json()
                      if (data.lat && data.lng) {
                        handleLocationSet({
                          address: fullAddress,
                          lat: data.lat,
                          lng: data.lng,
                        })
                      }
                    } catch (error) {
                      console.error("Error geocoding address:", error)
                    }
                  }}
                  className="text-xs h-8 rounded-full"
                />
              </div>
            ) : (
              <button
                onClick={() => setShowAddressInput(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-full text-xs font-medium text-slate-700 transition-colors"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Dirección</span>
              </button>
            )}
          </div>

          {/* Zip code dropdown */}
          <Select onValueChange={handleZipSelect}>
            <SelectTrigger className="h-8 w-auto min-w-[80px] bg-slate-100 hover:bg-slate-200 border-0 rounded-full text-xs font-medium text-slate-700 gap-1 px-3">
              <span className="hidden sm:inline">Zip</span>
              <SelectValue placeholder="Zip" />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {PUERTO_RICO_ZIP_CODES.map((z) => (
                <SelectItem key={z.zip} value={z.zip} className="text-xs">
                  {z.zip} - {z.area}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  )
}
