"use client"

import { useState, useEffect, useMemo } from "react"
import Image from "next/image"
import { X, Plus, Minus, Package, ShoppingBag, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useInternalShopCart } from "@/hooks/use-internal-shop-cart"

interface ShopItem {
  id: string
  name: string
  description: string | null
  price: number
  image_url: string | null
  category: string | null
  is_active: boolean
  display_order: number
}

interface InternalShopModalProps {
  isOpen: boolean
  onClose: () => void
  onContinue?: () => void
}

export function InternalShopModal({ isOpen, onClose, onContinue }: InternalShopModalProps) {
  const [items, setItems] = useState<ShopItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState<string>("all")
  
  const { 
    items: cartItems,
    totalItems,
    subtotal,
    addItem,
    updateQuantity,
    getQuantity,
    isLoaded,
  } = useInternalShopCart()

  // Fetch shop items
  useEffect(() => {
    if (isOpen) {
      setLoading(true)
      fetch("/api/internal-shop/items")
        .then(res => res.json())
        .then(data => {
          setItems(data.items || [])
          setLoading(false)
        })
        .catch(() => setLoading(false))
    }
  }, [isOpen])

  // Get unique categories
  const categories = useMemo(() => {
    return Array.from(new Set(items.map(i => i.category || "Extras")))
  }, [items])

  // Filter items by category
  const filteredItems = useMemo(() => {
    if (activeCategory === "all") return items
    return items.filter(i => (i.category || "Extras") === activeCategory)
  }, [items, activeCategory])

  // Group items by category for display
  const groupedItems = useMemo(() => {
    return filteredItems.reduce((acc, item) => {
      const cat = item.category || "Extras"
      if (!acc[cat]) acc[cat] = []
      acc[cat].push(item)
      return acc
    }, {} as Record<string, ShopItem[]>)
  }, [filteredItems])

  // Add/update item handler
  const handleUpdateQty = (item: ShopItem, delta: number) => {
    const currentQty = getQuantity(item.id)
    if (currentQty === 0 && delta > 0) {
      addItem({
        id: item.id,
        name: item.name,
        price: Number(item.price),
        image_url: item.image_url,
        category: item.category,
        description: item.description,
      }, delta)
    } else {
      updateQuantity(item.id, delta)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col m-4">
        {/* Banner Image */}
        <div className="relative w-full h-32 sm:h-40">
          <Image
            src="/images/shop-banner.jpg"
            alt="Bebidas y Extras"
            fill
            className="object-cover"
            priority
          />
          {/* Close button overlay */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center transition-colors z-10"
          >
            <X className="w-5 h-5 text-white" />
          </button>
          {/* Title overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <ShoppingBag className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-white text-lg">Bebidas y Extras</h2>
                <p className="text-white/80 text-sm">Agrega a tu orden</p>
              </div>
            </div>
          </div>
        </div>

        {/* Category pills */}
        {categories.length > 1 && (
          <div className="flex gap-2 p-3 border-b border-gray-100 overflow-x-auto bg-gray-50">
            <button
              onClick={() => setActiveCategory("all")}
              className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeCategory === "all"
                  ? "bg-cyan-600 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
              }`}
            >
              Todo
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  activeCategory === cat
                    ? "bg-cyan-600 text-white"
                    : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Items grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <Package className="w-12 h-12 mb-3 opacity-50" />
              <p>No hay productos disponibles</p>
            </div>
          ) : (
            Object.entries(groupedItems).map(([category, categoryItems]) => (
              <div key={category} className="mb-6">
                <h3 className="font-semibold text-gray-800 mb-3 pb-2 border-b border-gray-100">
                  {category}
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {categoryItems.map(item => {
                    const qty = getQuantity(item.id)
                    return (
                      <div 
                        key={item.id}
                        className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:border-gray-300 hover:shadow-sm transition-all"
                      >
                        {/* Image */}
                        {item.image_url ? (
                          <div className="relative w-full h-24 bg-gray-100">
                            <Image
                              src={item.image_url}
                              alt={item.name}
                              fill
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-full h-24 bg-gray-50 flex items-center justify-center">
                            <Package className="w-8 h-8 text-gray-300" />
                          </div>
                        )}
                        
                        {/* Info */}
                        <div className="p-3">
                          <p className="font-medium text-gray-900 text-sm leading-tight line-clamp-2">
                            {item.name}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="font-bold text-gray-900 text-sm">
                              ${Number(item.price).toFixed(2)}
                            </span>
                            {qty === 0 ? (
                              <button
                                onClick={() => handleUpdateQty(item, 1)}
                                className="w-7 h-7 rounded-full bg-cyan-600 text-white hover:bg-cyan-700 flex items-center justify-center transition-colors"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => handleUpdateQty(item, -1)}
                                  className="w-6 h-6 rounded-full border border-gray-300 text-gray-600 hover:border-gray-500 flex items-center justify-center transition-colors"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="w-5 text-center text-sm font-bold tabular-nums">
                                  {qty}
                                </span>
                                <button
                                  onClick={() => handleUpdateQty(item, 1)}
                                  className="w-6 h-6 rounded-full bg-cyan-600 text-white hover:bg-cyan-700 flex items-center justify-center transition-colors"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer with cart summary */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="flex items-center justify-between">
            <div>
              {totalItems > 0 ? (
                <>
                  <p className="text-sm text-gray-600">
                    {totalItems} artículo{totalItems !== 1 ? "s" : ""} del shop
                  </p>
                  <p className="font-bold text-gray-900">${subtotal.toFixed(2)}</p>
                </>
              ) : (
                <p className="text-sm text-gray-500">Tu carrito del shop está vacío</p>
              )}
            </div>
            <Button
              onClick={() => {
                onClose()
                if (onContinue) onContinue()
              }}
              className="gap-2 bg-cyan-600 hover:bg-cyan-700"
            >
              {totalItems > 0 ? "Continuar" : "Cerrar"}
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
