"use client"

import { useState, useEffect } from "react"
import { MapPin, Navigation, Search, X, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AddressAutocomplete } from "./address-autocomplete"

const LOCATION_STORAGE_KEY = "foodnet_user_location"

export interface UserLocation {
  address: string
  lat: number
  lng: number
  zip?: string
}

interface LocationBarProps {
  onLocationChange: (location: UserLocation | null) => void
  initialLocation?: UserLocation | null
}

export function LocationBar({ onLocationChange, initialLocation }: LocationBarProps) {
  const [location, setLocation] = useState<UserLocation | null>(initialLocation || null)
  const [isEditing, setIsEditing] = useState(false)
  const [addressInput, setAddressInput] = useState("")
  const [zipInput, setZipInput] = useState("")
  const [isLocating, setIsLocating] = useState(false)
  const [showZipFallback, setShowZipFallback] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(LOCATION_STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as UserLocation
        setLocation(parsed)
        onLocationChange(parsed)
      } catch {
        // Invalid stored data
      }
    }
  }, [])

  // Save to localStorage when location changes
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
          // Reverse geocode to get address
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
            // Fallback - use coordinates
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
    // Get coordinates for the selected address
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

  // Handle zip code submission
  const handleZipSubmit = async () => {
    if (!zipInput || zipInput.length < 5) {
      setError("Por favor ingresa un código postal válido")
      return
    }

    try {
      const response = await fetch(
        `/api/places/geocode?address=${encodeURIComponent(zipInput + ", Puerto Rico")}`
      )
      const data = await response.json()
      
      if (data.lat && data.lng) {
        saveLocation({
          address: `Código postal ${zipInput}`,
          lat: data.lat,
          lng: data.lng,
          zip: zipInput,
        })
      } else {
        setError("No pudimos encontrar ese código postal")
      }
    } catch {
      setError("Error al buscar el código postal")
    }
  }

  // Clear location
  const handleClearLocation = () => {
    saveLocation(null)
    setAddressInput("")
    setZipInput("")
  }

  // If location is set and not editing, show compact view
  if (location && !isEditing) {
    return (
      <div className="bg-slate-900 text-white">
        <div className="mx-auto max-w-6xl px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-amber-400" />
              <span className="text-sm">
                Entregando a: <span className="font-medium">{location.address}</span>
              </span>
            </div>
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1 text-sm text-slate-300 hover:text-white transition-colors"
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
      <div className="mx-auto max-w-6xl px-6 py-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-amber-400" />
              <span className="font-medium">¿Dónde quieres que te entreguemos?</span>
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

          {/* Main input area */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Use My Location button */}
            <Button
              variant="outline"
              onClick={handleUseMyLocation}
              disabled={isLocating}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white gap-2"
            >
              <Navigation className={`h-4 w-4 ${isLocating ? "animate-pulse" : ""}`} />
              {isLocating ? "Localizando..." : "Usar mi ubicación"}
            </Button>

            {/* Address autocomplete */}
            <div className="flex-1 relative">
              <AddressAutocomplete
                value={addressInput}
                onChange={setAddressInput}
                onAddressSelected={handleAddressSelected}
                placeholder="Ingresa tu dirección..."
                className="bg-white text-slate-900 border-0 h-10"
              />
            </div>

            {/* Zip code fallback toggle */}
            {!showZipFallback && (
              <button
                onClick={() => setShowZipFallback(true)}
                className="text-xs text-slate-400 hover:text-white underline whitespace-nowrap"
              >
                Usar código postal
              </button>
            )}
          </div>

          {/* Zip code fallback */}
          {showZipFallback && (
            <div className="flex items-center gap-3">
              <Input
                value={zipInput}
                onChange={(e) => setZipInput(e.target.value)}
                placeholder="Código postal (ej: 00920)"
                className="bg-white text-slate-900 border-0 h-10 w-48"
                maxLength={5}
              />
              <Button
                onClick={handleZipSubmit}
                className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-medium"
              >
                <Search className="h-4 w-4 mr-2" />
                Buscar
              </Button>
              <button
                onClick={() => setShowZipFallback(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
            </div>
          )}

          {/* Error message */}
          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          {/* Help text */}
          <p className="text-xs text-slate-400">
            Ingresa tu dirección para ver restaurantes que entregan en tu zona
          </p>
        </div>
      </div>
    </div>
  )
}
