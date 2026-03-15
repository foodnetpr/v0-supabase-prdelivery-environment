"use client"

import { useState, useEffect } from "react"
import { MapPin, ChevronDown, Navigation, Loader2 } from "lucide-react"
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
import { Button } from "@/components/ui/button"

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
  const [isOpen, setIsOpen] = useState(false)
  const [isLoadingGeo, setIsLoadingGeo] = useState(false)
  const [activeTab, setActiveTab] = useState<"auto" | "address" | "zip">("auto")

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

  const handleModeChange = (newMode: OrderMode) => {
    setMode(newMode)
    localStorage.setItem(MODE_STORAGE_KEY, newMode)
    onModeChange?.(newMode)
  }

  const handleLocationSet = (newLocation: UserLocation) => {
    setLocation(newLocation)
    localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(newLocation))
    onLocationChange(newLocation)
    setIsOpen(false)
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

  const truncateAddress = (addr: string, maxLength: number = 25) => {
    if (addr.length <= maxLength) return addr
    return addr.substring(0, maxLength) + "..."
  }

  return (
    <div className="flex items-center gap-3">
      {/* Delivery / Pickup Toggle - Uber Eats style */}
      <div className="flex items-center bg-slate-100 rounded-full p-1">
        <button
          onClick={() => handleModeChange("delivery")}
          className={`px-4 py-1.5 text-sm font-medium rounded-full transition-all ${
            mode === "delivery"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Delivery
        </button>
        <button
          onClick={() => handleModeChange("pickup")}
          className={`px-4 py-1.5 text-sm font-medium rounded-full transition-all ${
            mode === "pickup"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Pickup
        </button>
      </div>

      {/* Location Dropdown */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <button className="flex items-center gap-2 px-3 py-2 rounded-full hover:bg-slate-100 transition-colors text-sm">
            <MapPin className="w-4 h-4 text-rose-500" />
            <span className="text-slate-700 max-w-[180px] truncate">
              {location ? truncateAddress(location.address) : "Ingresa ubicación"}
            </span>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          {/* Tab Navigation */}
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setActiveTab("auto")}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === "auto"
                  ? "text-slate-900 border-b-2 border-slate-900"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Auto
            </button>
            <button
              onClick={() => setActiveTab("address")}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === "address"
                  ? "text-slate-900 border-b-2 border-slate-900"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Dirección
            </button>
            <button
              onClick={() => setActiveTab("zip")}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === "zip"
                  ? "text-slate-900 border-b-2 border-slate-900"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Zip Code
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-4">
            {activeTab === "auto" && (
              <div className="space-y-3">
                <p className="text-sm text-slate-500">
                  Usa tu ubicación actual para encontrar restaurantes cerca de ti.
                </p>
                <Button
                  onClick={handleUseMyLocation}
                  disabled={isLoadingGeo}
                  className="w-full bg-slate-900 hover:bg-slate-800"
                >
                  {isLoadingGeo ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Obteniendo ubicación...
                    </>
                  ) : (
                    <>
                      <Navigation className="w-4 h-4 mr-2" />
                      Usar mi ubicación
                    </>
                  )}
                </Button>
              </div>
            )}

            {activeTab === "address" && (
              <div className="space-y-3">
                <p className="text-sm text-slate-500">
                  Ingresa tu dirección de entrega.
                </p>
                <AddressAutocomplete
                  placeholder="o ingresa tu dirección"
                  defaultValue={location?.address || ""}
                  onSelect={handleAddressSelect}
                />
              </div>
            )}

            {activeTab === "zip" && (
              <div className="space-y-3">
                <p className="text-sm text-slate-500">
                  Selecciona tu código postal.
                </p>
                <Select onValueChange={handleZipSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona zip code..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {PUERTO_RICO_ZIP_CODES.map((z) => (
                      <SelectItem key={z.zip} value={z.zip}>
                        {z.zip} - {z.area}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Current Location Display */}
          {location && (
            <div className="border-t border-slate-200 p-3 bg-slate-50">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-rose-500 flex-shrink-0" />
                <span className="text-slate-600 truncate">{location.address}</span>
              </div>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  )
}
