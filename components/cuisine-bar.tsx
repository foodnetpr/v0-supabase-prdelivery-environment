"use client"

import { useRef, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

// Cuisine types with emoji icons and colors
const CUISINE_TYPES = [
  { id: "all", name: "Todos", icon: "🍽️", color: "bg-slate-100" },
  { id: "italiana", name: "Italiana", icon: "🍝", color: "bg-red-50" },
  { id: "mexicana", name: "Mexicana", icon: "🌮", color: "bg-orange-50" },
  { id: "argentina", name: "Argentina", icon: "🥩", color: "bg-amber-50" },
  { id: "tailandesa", name: "Tailandesa", icon: "🍜", color: "bg-green-50" },
  { id: "japonesa", name: "Japonesa", icon: "🍣", color: "bg-pink-50" },
  { id: "china", name: "China", icon: "🥡", color: "bg-red-50" },
  { id: "americana", name: "Americana", icon: "🍔", color: "bg-yellow-50" },
  { id: "criolla", name: "Criolla", icon: "🍗", color: "bg-orange-50" },
  { id: "mariscos", name: "Mariscos", icon: "🦐", color: "bg-blue-50" },
  { id: "pizza", name: "Pizza", icon: "🍕", color: "bg-red-50" },
  { id: "postres", name: "Postres", icon: "🍰", color: "bg-pink-50" },
  { id: "cafe", name: "Café", icon: "☕", color: "bg-amber-50" },
  { id: "vegetariana", name: "Vegetariana", icon: "🥗", color: "bg-green-50" },
  { id: "panaderia", name: "Panadería", icon: "🥐", color: "bg-orange-50" },
  { id: "catering", name: "Catering", icon: "🍱", color: "bg-purple-50" },
]

interface CuisineBarProps {
  selectedCuisine: string
  onCuisineChange: (cuisine: string) => void
  availableCuisines?: string[]
}

export function CuisineBar({ selectedCuisine, onCuisineChange, availableCuisines }: CuisineBarProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showLeftArrow, setShowLeftArrow] = useState(false)
  const [showRightArrow, setShowRightArrow] = useState(true)

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

  // Filter to only show cuisines that have restaurants, plus "all"
  const displayCuisines = CUISINE_TYPES.filter(
    (c) => c.id === "all" || !availableCuisines || availableCuisines.some(
      (ac) => ac?.toLowerCase().includes(c.id) || c.name.toLowerCase().includes(ac?.toLowerCase() || "")
    )
  )

  return (
    <div className="relative bg-white border-b border-slate-100">
      <div className="mx-auto max-w-6xl px-6">
        {/* Left Arrow */}
        {showLeftArrow && (
          <button
            onClick={() => scroll("left")}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-white shadow-md rounded-full p-1.5 hover:bg-slate-50 transition-colors"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-4 h-4 text-slate-600" />
          </button>
        )}

        {/* Scrollable Cuisine Icons */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-3"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {displayCuisines.map((cuisine) => (
            <button
              key={cuisine.id}
              onClick={() => onCuisineChange(cuisine.id)}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all flex-shrink-0 min-w-[72px] ${
                selectedCuisine === cuisine.id
                  ? "bg-slate-900 text-white"
                  : `${cuisine.color} hover:bg-slate-100 text-slate-700`
              }`}
            >
              <span className="text-2xl">{cuisine.icon}</span>
              <span className="text-xs font-medium whitespace-nowrap">{cuisine.name}</span>
            </button>
          ))}
        </div>

        {/* Right Arrow */}
        {showRightArrow && (
          <button
            onClick={() => scroll("right")}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-white shadow-md rounded-full p-1.5 hover:bg-slate-50 transition-colors"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-4 h-4 text-slate-600" />
          </button>
        )}
      </div>
    </div>
  )
}
