"use client"

import { useState, useEffect } from "react"
import { ShoppingBag, ChevronRight, X, Sparkles } from "lucide-react"
import { useInternalShopCart } from "@/hooks/use-internal-shop-cart"
import { InternalShopModal } from "./internal-shop-modal"

interface ShopUpsellBannerProps {
  variant?: "compact" | "full"
  className?: string
}

export function ShopUpsellBanner({ variant = "full", className = "" }: ShopUpsellBannerProps) {
  const [showModal, setShowModal] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [isShopAvailable, setIsShopAvailable] = useState(true)
  const { totalItems, subtotal } = useInternalShopCart()

  // Check shop availability on mount
  useEffect(() => {
    fetch("/api/internal-shop/availability")
      .then(res => res.json())
      .then(data => {
        setIsShopAvailable(data.available)
      })
      .catch(() => {
        setIsShopAvailable(false)
      })
  }, [])

  // Don't show if shop is unavailable
  if (!isShopAvailable) return null

  // Don't show if dismissed (unless they have items)
  if (dismissed && totalItems === 0) return null

  // Compact version for smaller spaces
  if (variant === "compact") {
    return (
      <>
        <button
          onClick={() => setShowModal(true)}
          className={`w-full flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-cyan-50 to-teal-50 border border-cyan-200 hover:border-cyan-300 hover:shadow-sm transition-all group ${className}`}
        >
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center shrink-0">
            <ShoppingBag className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 text-left">
            <p className="font-semibold text-gray-900 text-sm">Bebidas y Extras</p>
            {totalItems > 0 ? (
              <p className="text-xs text-cyan-700">{totalItems} item{totalItems !== 1 ? "s" : ""} · ${subtotal.toFixed(2)}</p>
            ) : (
              <p className="text-xs text-gray-500">Agrega a tu orden</p>
            )}
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-cyan-600 transition-colors" />
        </button>

        <InternalShopModal 
          isOpen={showModal} 
          onClose={() => setShowModal(false)} 
        />
      </>
    )
  }

  // Full banner version
  return (
    <>
      <div className={`relative overflow-hidden rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 p-4 ${className}`}>
        {/* Dismiss button */}
        {totalItems === 0 && (
          <button
            onClick={() => setDismissed(true)}
            className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        )}

        {/* Decorative elements */}
        <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full" />
        <div className="absolute -right-2 -bottom-6 w-16 h-16 bg-white/10 rounded-full" />

        <div className="relative flex items-center gap-4">
          {/* Icon */}
          <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
            <ShoppingBag className="w-7 h-7 text-white" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-white text-base">Bebidas y Extras</h3>
              <Sparkles className="w-4 h-4 text-yellow-300" />
            </div>
            {totalItems > 0 ? (
              <p className="text-white/90 text-sm">
                {totalItems} item{totalItems !== 1 ? "s" : ""} en tu carrito · <span className="font-semibold">${subtotal.toFixed(2)}</span>
              </p>
            ) : (
              <p className="text-white/80 text-sm">
                Agrega sodas, snacks y mas a tu orden
              </p>
            )}
          </div>

          {/* CTA Button */}
          <button
            onClick={() => setShowModal(true)}
            className="shrink-0 px-4 py-2 bg-white text-cyan-700 font-semibold text-sm rounded-lg hover:bg-cyan-50 transition-colors flex items-center gap-1"
          >
            {totalItems > 0 ? "Ver" : "Agregar"}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <InternalShopModal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
      />
    </>
  )
}
