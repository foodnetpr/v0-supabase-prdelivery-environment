"use client"

import Link from "next/link"
import Image from "next/image"
import { LocationBar, type UserLocation, type OrderMode } from "./location-bar"
import { CartPopover } from "./cart-popover"
import { useState, useEffect } from "react"

interface GlobalNavbarProps {
  showLocationBar?: boolean
  showCuisineBar?: boolean
  onLocationChange?: (location: UserLocation | null) => void
  onModeChange?: (mode: OrderMode) => void
}

export function GlobalNavbar({
  showLocationBar = true,
  onLocationChange,
  onModeChange,
}: GlobalNavbarProps) {
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null)
  const [orderMode, setOrderMode] = useState<OrderMode>("delivery")

  // Load from localStorage
  useEffect(() => {
    const storedLocation = localStorage.getItem("foodnetpr_user_location")
    const storedMode = localStorage.getItem("foodnetpr_order_mode")
    
    if (storedLocation) {
      try {
        setUserLocation(JSON.parse(storedLocation))
      } catch (e) {
        console.error("Error loading location:", e)
      }
    }
    
    if (storedMode === "pickup" || storedMode === "delivery") {
      setOrderMode(storedMode)
    }
  }, [])

  const handleLocationChange = (location: UserLocation | null) => {
    setUserLocation(location)
    if (location) {
      localStorage.setItem("foodnetpr_user_location", JSON.stringify(location))
    } else {
      localStorage.removeItem("foodnetpr_user_location")
    }
    onLocationChange?.(location)
  }

  const handleModeChange = (mode: OrderMode) => {
    setOrderMode(mode)
    localStorage.setItem("foodnetpr_order_mode", mode)
    onModeChange?.(mode)
  }

  return (
    <>
      {/* Thin spacer bar for breathing room */}
      <div className="h-2 bg-slate-100" />
      
      {/* Main navigation bar */}
      <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center px-4 py-2 gap-3">
          {/* Logo */}
          <Link href="/" className="flex items-center flex-shrink-0">
            <Image
              src="/foodnetpr-logo.png"
              alt="FoodNetPR Delivery"
              width={160}
              height={56}
              className="h-10 w-auto"
            />
          </Link>

          {/* Location Bar - only show if enabled */}
          {showLocationBar && (
            <LocationBar 
              onLocationChange={handleLocationChange}
              onModeChange={handleModeChange}
              initialLocation={userLocation}
              initialMode={orderMode}
            />
          )}

          {/* Right side: Cart, Login, Sign up */}
          <div className="flex items-center gap-2 ml-auto">
            {/* Cart with Popover */}
            <CartPopover />

            {/* Login */}
            <Link
              href="/auth/login"
              className="px-4 py-1.5 text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors"
            >
              Log in
            </Link>

            {/* Sign up */}
            <Link
              href="/auth/register"
              className="px-4 py-1.5 text-sm font-medium bg-black text-white rounded-full hover:bg-slate-800 transition-colors"
            >
              Sign up
            </Link>
          </div>
        </div>
      </nav>
    </>
  )
}
