"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import Image from "next/image"
import { MapPin, Truck, ShoppingBag } from "lucide-react"

interface Prediction {
  placeId: string
  text: string
  mainText: string
  secondaryText: string
}

interface PlaceDetails {
  latitude: number
  longitude: number
  formattedAddress: string
}

interface DeliveryLandingProps {
  heroImage?: string
  heroTitle?: string
  heroSubtitle?: string
}

export function DeliveryLanding({
  heroImage = "/images/partners-hero.jpg",
  heroTitle = "TUS PLATOS FAVORITOS",
  heroSubtitle = "¡A tu Puerta!",
}: DeliveryLandingProps) {
  const [mode, setMode] = useState<"delivery" | "pickup">("delivery")
  const [addressInput, setAddressInput] = useState("")
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<PlaceDetails | null>(null)

  // Load saved location from sessionStorage on mount
  useEffect(() => {
    const saved = sessionStorage.getItem("userDeliveryLocation")
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setSelectedLocation(parsed)
        setAddressInput(parsed.formattedAddress || "")
      } catch (e) {
        console.error("Failed to parse saved location:", e)
      }
    }
  }, [])

  // Fetch address predictions
  const fetchPredictions = async (input: string) => {
    if (input.length < 3) {
      setPredictions([])
      setShowDropdown(false)
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(
        `/api/places/autocomplete?input=${encodeURIComponent(input)}`
      )
      const data = await response.json()
      
      if (data.predictions) {
        setPredictions(data.predictions)
        setShowDropdown(true)
      }
    } catch (error) {
      console.error("Failed to fetch predictions:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Handle address input change with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (addressInput && !selectedLocation) {
        fetchPredictions(addressInput)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [addressInput, selectedLocation])

  // Handle prediction selection
  const handleSelectPrediction = async (prediction: Prediction) => {
    setShowDropdown(false)
    setIsLoading(true)
    setAddressInput(prediction.mainText)

    try {
      const response = await fetch(
        `/api/places/details?placeId=${encodeURIComponent(prediction.placeId)}`
      )
      const data = await response.json()

      if (data.latitude && data.longitude) {
        const location: PlaceDetails = {
          latitude: data.latitude,
          longitude: data.longitude,
          formattedAddress: prediction.text || prediction.mainText,
        }
        setSelectedLocation(location)
        setAddressInput(prediction.text || prediction.mainText)
        
        // Save to sessionStorage
        sessionStorage.setItem("userDeliveryLocation", JSON.stringify(location))
      }
    } catch (error) {
      console.error("Failed to fetch place details:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Handle GO button click
  const handleGo = () => {
    if (mode === "pickup") {
      // Pickup mode - go directly to restaurants
      window.location.href = "/?mode=pickup"
    } else if (selectedLocation) {
      // Delivery mode with selected location
      const params = new URLSearchParams({
        mode: "delivery",
        lat: selectedLocation.latitude.toString(),
        lng: selectedLocation.longitude.toString(),
        address: selectedLocation.formattedAddress,
      })
      window.location.href = `/?${params.toString()}`
    }
  }

  const canProceed = mode === "pickup" || (mode === "delivery" && selectedLocation)

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation */}
      <nav className="absolute top-0 left-0 right-0 z-50 bg-transparent">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center">
            <Image
              src="/foodnet-delivery-logo.jpg"
              alt="FoodNetDelivery"
              width={160}
              height={48}
              className="h-10 w-auto"
            />
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-white hover:text-white/80 font-medium">
              Restaurants
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative flex-1 min-h-screen">
        {/* Background Image */}
        <div className="absolute inset-0">
          <Image
            src={heroImage}
            alt="Food background"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-black/30" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex items-center min-h-screen">
          <div className="mx-auto max-w-6xl px-6 py-20 w-full">
            <div className="max-w-xl bg-white rounded-2xl shadow-2xl p-8">
              {/* Tagline */}
              <p className="text-slate-600 text-sm mb-2">Somos los de Aquí, con</p>
              
              {/* Title */}
              <h1 className="text-4xl md:text-5xl font-bold text-pink-500 mb-1">
                {heroTitle}
              </h1>
              <h2 className="text-4xl md:text-5xl font-script text-slate-800 mb-8">
                {heroSubtitle}
              </h2>

              {/* Mode Toggle */}
              <div className="flex gap-2 mb-6">
                <Button
                  variant={mode === "delivery" ? "default" : "outline"}
                  onClick={() => setMode("delivery")}
                  className={`flex items-center gap-2 px-6 ${
                    mode === "delivery" 
                      ? "bg-slate-900 text-white hover:bg-slate-800" 
                      : "border-slate-300 text-slate-600"
                  }`}
                >
                  <Truck className="w-4 h-4" />
                  Delivery
                </Button>
                <Button
                  variant={mode === "pickup" ? "default" : "outline"}
                  onClick={() => setMode("pickup")}
                  className={`flex items-center gap-2 px-6 ${
                    mode === "pickup" 
                      ? "bg-slate-900 text-white hover:bg-slate-800" 
                      : "border-slate-300 text-slate-600"
                  }`}
                >
                  <ShoppingBag className="w-4 h-4" />
                  Pick-Up
                </Button>
              </div>

              {/* Address Input - Only show in delivery mode */}
              {mode === "delivery" && (
                <div className="relative mb-4">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <Input
                        value={addressInput}
                        onChange={(e) => {
                          setAddressInput(e.target.value)
                          setSelectedLocation(null) // Clear selection when typing
                        }}
                        onFocus={() => predictions.length > 0 && setShowDropdown(true)}
                        placeholder="Enter your delivery address"
                        className="pl-10 pr-4 py-6 text-base border-slate-200 rounded-lg"
                      />
                      {isLoading && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
                        </div>
                      )}
                    </div>
                    <Button
                      onClick={handleGo}
                      disabled={!canProceed}
                      className="px-8 py-6 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg"
                    >
                      GO!
                    </Button>
                  </div>

                  {/* Predictions Dropdown */}
                  {showDropdown && predictions.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                      {predictions.map((prediction) => (
                        <button
                          key={prediction.placeId}
                          type="button"
                          className="w-full px-4 py-3 text-left hover:bg-slate-50 flex items-start gap-3 border-b border-slate-100 last:border-b-0"
                          onClick={() => handleSelectPrediction(prediction)}
                        >
                          <MapPin className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <div className="font-medium text-slate-900">
                              {prediction.mainText}
                            </div>
                            <div className="text-sm text-slate-500">
                              {prediction.secondaryText}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Helper text */}
                  <p className="text-sm text-amber-600 mt-2 flex items-center gap-1">
                    <span className="text-amber-500">💡</span>
                    Enter your address including Apt/Unit #
                  </p>
                </div>
              )}

              {/* Pickup mode - Just show GO button */}
              {mode === "pickup" && (
                <Button
                  onClick={handleGo}
                  className="w-full py-6 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-lg"
                >
                  View All Restaurants
                </Button>
              )}

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-white px-4 text-slate-500">OR</span>
                </div>
              </div>

              {/* View All Link */}
              <Link
                href="/"
                className="block text-center text-slate-800 font-medium hover:underline"
              >
                View all restaurants
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
