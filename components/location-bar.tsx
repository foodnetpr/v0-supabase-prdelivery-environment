"use client"

import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { MapPin, Navigation, Loader2, Keyboard, Map } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"

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
  // Structured components — populated when selected from autocomplete or reverse geocode
  streetAddress?: string
  city?: string
  state?: string
}

interface LocationBarProps {
  onLocationChange: (location: UserLocation | null) => void
  onModeChange?: (mode: OrderMode) => void
  initialLocation?: UserLocation | null
  initialMode?: OrderMode
  showModeToggle?: boolean
  isMobile?: boolean
}

export function LocationBar({ 
  onLocationChange, 
  onModeChange,
  initialLocation, 
  initialMode = "delivery",
  showModeToggle = true,
  isMobile = false
}: LocationBarProps) {
  const [location, setLocation] = useState<UserLocation | null>(initialLocation || null)
  const [mode, setMode] = useState<OrderMode>(initialMode)
  const [isLoadingGeo, setIsLoadingGeo] = useState(false)
  const [addressInput, setAddressInput] = useState("")
  const [isAutoMode, setIsAutoMode] = useState(true)
  const [suggestions, setSuggestions] = useState<Array<{ description: string; place_id: string }>>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  const [dropdownRect, setDropdownRect] = useState<{ top: number; left: number; width: number } | null>(null)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => { setIsMounted(true) }, [])

  const updateDropdownRect = () => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect()
      setDropdownRect({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width,
      })
    }
  }

  // Load from localStorage on mount
  useEffect(() => {
    const savedLocation = localStorage.getItem(LOCATION_STORAGE_KEY)
    const savedMode = localStorage.getItem(MODE_STORAGE_KEY) as OrderMode | null
    
    if (savedLocation) {
      try {
        const parsed = JSON.parse(savedLocation)
        setLocation(parsed)
        setAddressInput(parsed.address || "")
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

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false)
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
    setAddressInput(newLocation.address)
    localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(newLocation))
    onLocationChange(newLocation)
    // Notify same-tab listeners (e.g. customer-portal) that the location changed
    window.dispatchEvent(new CustomEvent("foodnet:location-changed", { detail: newLocation }))
    setShowSuggestions(false)
    setSuggestions([])
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
              zip: data.zip || "",
              streetAddress: data.street || "",
              city: data.city || "",
              state: data.state || "PR",
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

  const handleAddressInputChange = async (value: string) => {
    setAddressInput(value)
    
    if (value.length < 3) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    try {
      const response = await fetch(`/api/places/autocomplete?input=${encodeURIComponent(value)}`)
      const data = await response.json()
      
      if (data.predictions && data.predictions.length > 0) {
        setSuggestions(data.predictions.slice(0, 5))
        setShowSuggestions(true)
        updateDropdownRect()
      } else {
        setSuggestions([])
        setShowSuggestions(false)
      }
    } catch (error) {
      console.error("Error fetching suggestions:", error)
    }
  }

  const handleSuggestionSelect = async (suggestion: { description: string; place_id: string }) => {
    try {
      const response = await fetch(`/api/places/details?place_id=${suggestion.place_id}`)
      const data = await response.json()

      if (data.lat && data.lng) {
        handleLocationSet({
          address: suggestion.description,
          lat: data.lat,
          lng: data.lng,
          zip: data.zip || "",
          streetAddress: data.streetAddress || "",
          city: data.city || "",
          state: data.state || "PR",
        })
      }
    } catch (error) {
      console.error("Error getting place details:", error)
    }
  }

  const handleAddressSubmit = async () => {
    if (!addressInput.trim()) return

    try {
      const response = await fetch(`/api/places/geocode?address=${encodeURIComponent(addressInput)}`)
      const data = await response.json()

      if (data.lat && data.lng) {
        // Reverse-geocode to get structured components from the resolved coords
        const rgRes = await fetch(`/api/places/reverse-geocode?lat=${data.lat}&lng=${data.lng}`)
        const geo = await rgRes.json()

        handleLocationSet({
          address: geo.address || addressInput,
          lat: data.lat,
          lng: data.lng,
          zip: geo.zip || "",
          streetAddress: geo.street || "",
          city: geo.city || "",
          state: geo.state || "PR",
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
        // Reverse-geocode the coords to get structured components
        const rgRes = await fetch(`/api/places/reverse-geocode?lat=${data.lat}&lng=${data.lng}`)
        const geo = await rgRes.json()

        handleLocationSet({
          address: geo.address || `${zipData.area}, PR ${zip}`,
          lat: data.lat,
          lng: data.lng,
          zip,
          streetAddress: geo.street || "",
          city: geo.city || zipData.area,
          state: geo.state || "PR",
        })
      }
    } catch (error) {
      console.error("Error geocoding zip:", error)
    }
  }

  const suggestionsDropdown =
    isMounted && showSuggestions && suggestions.length > 0 && dropdownRect
      ? createPortal(
          <div
            ref={suggestionsRef}
            style={{
              position: "absolute",
              top: dropdownRect.top,
              left: dropdownRect.left,
              width: dropdownRect.width,
              zIndex: 99999,
            }}
            className="bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden"
          >
            {suggestions.map((suggestion, index) => (
              <button
                key={suggestion.place_id || index}
                onMouseDown={(e) => {
                  e.preventDefault()
                  handleSuggestionSelect(suggestion)
                }}
                className="w-full px-3 py-2.5 text-left text-sm hover:bg-slate-100 transition-colors flex items-center gap-2"
              >
                <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span className="truncate">{suggestion.description}</span>
              </button>
            ))}
          </div>,
          document.body,
        )
      : null

  // Mobile Layout
  if (isMobile) {
    return (
      <div className="flex flex-col gap-2">
        {/* Row 1: Delivery badge + Use Location Button */}
        <div className="flex items-center gap-2">
          <span className="flex-shrink-0 bg-black text-white text-sm font-medium px-3 py-1.5 rounded-full">
            Delivery
          </span>
          <button
            onClick={handleUseMyLocation}
            disabled={isLoadingGeo}
            title={isLoadingGeo ? "Buscando..." : "Usar mi ubicación"}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 rounded-full hover:bg-slate-50 transition-colors flex-shrink-0 disabled:opacity-50"
          >
            {isLoadingGeo ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Navigation className="w-4 h-4" />
            )}
            <span className="text-sm font-medium">
              {isLoadingGeo ? "..." : "Mi ubicación"}
            </span>
          </button>
        </div>

        {/* Row 2: Address Input (Full Width) */}
        <div className="relative w-full">
          <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden bg-white">
            <div className="flex items-center px-2.5 border-r border-slate-200 bg-slate-50">
              <MapPin className="w-4 h-4 text-slate-500" />
            </div>
            <Input
              ref={inputRef}
              type="text"
              placeholder="Buscar dirección o código postal..."
              value={addressInput}
              onChange={(e) => handleAddressInputChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleAddressSubmit()
                }
              }}
              onFocus={() => {
                if (suggestions.length > 0) {
                  setShowSuggestions(true)
                  updateDropdownRect()
                }
              }}
              className="border-0 h-10 text-sm focus-visible:ring-0 focus-visible:ring-offset-0 flex-1"
            />
          </div>
          {suggestionsDropdown}
        </div>
      </div>
    )
  }

  // Desktop Layout
  return (
    <div className="flex items-center gap-2 flex-1">
      {/* Delivery badge */}
      <span className="flex-shrink-0 bg-black text-white text-sm font-medium px-3 py-1 rounded-full">
        Delivery
      </span>

      {/* 2. Use My Location Button - icon only */}
      <button
        onClick={handleUseMyLocation}
        disabled={isLoadingGeo}
        title={isLoadingGeo ? "Buscando..." : "Usar mi ubicación"}
        className="flex items-center justify-center w-8 h-8 border border-slate-300 rounded-full hover:bg-slate-50 transition-colors flex-shrink-0 disabled:opacity-50"
      >
        {isLoadingGeo ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Navigation className="w-4 h-4" />
        )}
      </button>

      {/* 3. Address Input - ALWAYS VISIBLE */}
      <div className="relative flex-1 min-w-[200px]">
        <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden bg-white">
          <div className="flex items-center gap-1.5 px-2 border-r border-slate-200 bg-slate-50">
            <Keyboard className="w-4 h-4 text-slate-500" />
          </div>
          <Input
            ref={inputRef}
            type="text"
            placeholder="Ingresar dirección"
            value={addressInput}
            onChange={(e) => handleAddressInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleAddressSubmit()
              }
            }}
            onFocus={() => {
              if (suggestions.length > 0) {
                setShowSuggestions(true)
                updateDropdownRect()
              }
            }}
            className="border-0 h-8 text-sm focus-visible:ring-0 focus-visible:ring-offset-0 flex-1"
          />
          {/* Auto/Manual toggle */}
          <button
            onClick={() => setIsAutoMode(!isAutoMode)}
            className="px-2 text-xs text-slate-500 hover:text-slate-700 border-l border-slate-200 h-full bg-slate-50 whitespace-nowrap"
          >
            {isAutoMode ? "Auto" : "Manual"}
          </button>
        </div>
        {suggestionsDropdown}
      </div>

      {/* 4. Zip Code Dropdown */}
      <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden bg-white flex-shrink-0">
        <div className="flex items-center gap-1 px-2 border-r border-slate-200 bg-slate-50">
          <Map className="w-4 h-4 text-slate-500" />
        </div>
        <Select onValueChange={handleZipSelect} value={location?.zip || ""}>
          <SelectTrigger className="border-0 h-8 text-sm w-[90px] focus:ring-0 focus:ring-offset-0">
            <SelectValue placeholder="Zip" />
          </SelectTrigger>
          <SelectContent className="max-h-60">
            {PUERTO_RICO_ZIP_CODES.map((z) => (
              <SelectItem key={z.zip} value={z.zip}>
                {z.zip}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
