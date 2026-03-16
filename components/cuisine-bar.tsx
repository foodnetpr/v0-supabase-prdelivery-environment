"use client"

import { useRef, useState, useMemo } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import Image from "next/image"

type CuisineType = {
  id: string
  name: string
  icon_url: string | null
  display_order: number
}

interface CuisineBarProps {
  selectedCuisine: string
  onCuisineChange: (cuisine: string) => void
  cuisineTypes: CuisineType[]
  restaurantCuisines: string[] // List of cuisine types that have at least 1 restaurant
}

export function CuisineBar({ selectedCuisine, onCuisineChange, cuisineTypes = [], restaurantCuisines = [] }: CuisineBarProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showLeftArrow, setShowLeftArrow] = useState(false)
  const [showRightArrow, setShowRightArrow] = useState(true)

  // Filter cuisine types to only show those with at least 1 restaurant
  const filteredCuisineTypes = useMemo(() => {
    if (!cuisineTypes || !restaurantCuisines) return []
    
    const normalizedRestaurantCuisines = restaurantCuisines
      .filter(Boolean)
      .map(c => c.toLowerCase().trim())
    
    return cuisineTypes.filter(cuisine => 
      normalizedRestaurantCuisines.includes(cuisine.name.toLowerCase().trim())
    )
  }, [cuisineTypes, restaurantCuisines])

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
      setShowLeftArrow(scrollLeft > 0)
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10)
    }
  }

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = 200
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      })
    }
  }

  // Clicking a cuisine filters, clicking it again deselects (goes back to "all")
  const handleCuisineClick = (cuisineName: string) => {
    if (selectedCuisine === cuisineName) {
      onCuisineChange("all")
    } else {
      onCuisineChange(cuisineName)
    }
  }

  // Don't render the bar if there are no cuisine types with restaurants
  if (filteredCuisineTypes.length === 0) {
    return null
  }

  return (
    <div className="bg-white border-b border-slate-100">
      <div className="relative mx-auto max-w-7xl px-4">
        {/* Left Arrow - inside content area */}
        {showLeftArrow && (
          <button
            onClick={() => scroll("left")}
            className="absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 z-10 bg-white/90 shadow-md rounded-full p-1.5 hover:bg-white transition-colors hidden sm:flex items-center justify-center"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </button>
        )}

        {/* Scrollable Cuisine Icons */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex items-center gap-2 sm:gap-4 overflow-x-auto scrollbar-hide py-3 sm:py-4 px-8 sm:px-12"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {filteredCuisineTypes.map((cuisine) => {
            const isSelected = selectedCuisine === cuisine.name
            return (
              <button
                key={cuisine.id}
                onClick={() => handleCuisineClick(cuisine.name)}
                className={`flex flex-col items-center gap-0.5 sm:gap-1 transition-all flex-shrink-0 group px-1.5 sm:px-2 py-1 rounded-lg ${
                  isSelected
                    ? "bg-slate-100 ring-2 ring-amber-500"
                    : "hover:bg-slate-50"
                }`}
              >
                {/* Image - rectangular to fit landscape food images */}
                <div className="relative w-16 h-10 sm:w-20 sm:h-12 flex items-center justify-center rounded-lg overflow-hidden bg-slate-50">
                  {cuisine.icon_url ? (
                    <Image
                      src={cuisine.icon_url}
                      alt={cuisine.name}
                      fill
                      className="object-contain"
                      unoptimized
                    />
                  ) : (
                    <span className="text-lg font-bold text-slate-300">
                      {cuisine.name.charAt(0)}
                    </span>
                  )}
                </div>
                {/* Label */}
                <span 
                  className={`text-[10px] sm:text-xs font-medium whitespace-nowrap transition-colors ${
                    isSelected
                      ? "text-slate-900"
                      : "text-slate-500 group-hover:text-slate-900"
                  }`}
                >
                  {cuisine.name}
                </span>
              </button>
            )
          })}
        </div>

        {/* Right Arrow - inside content area */}
        {showRightArrow && (
          <button
            onClick={() => scroll("right")}
            className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 z-10 bg-white/90 shadow-md rounded-full p-1.5 hover:bg-white transition-colors hidden sm:flex items-center justify-center"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-5 h-5 text-slate-600" />
          </button>
        )}
      </div>
    </div>
  )
}
