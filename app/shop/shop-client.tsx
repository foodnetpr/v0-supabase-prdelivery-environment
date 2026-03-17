"use client"

import { useState, useMemo } from "react"
import Image from "next/image"
import { Plus, Minus, ShoppingCart, Package, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { GlobalNavbar } from "@/components/global-navbar"
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
  sku: string | null
}

interface ShopClientProps {
  initialItems: ShopItem[]
}

export function ShopClient({ initialItems }: ShopClientProps) {
  // Use persistent cart hook instead of local state
  const { 
    items: cartItems, 
    totalItems, 
    subtotal, 
    tax,
    total,
    addItem, 
    updateQuantity, 
    getQuantity,
    isLoaded 
  } = useInternalShopCart()
  
  const [showCart, setShowCart] = useState(false)
  const [activeCategory, setActiveCategory] = useState<string>("all")

  // Group items by category
  const categories = useMemo(() => {
    const cats = Array.from(
      new Set(initialItems.map((i) => i.category || "Extras"))
    )
    return cats
  }, [initialItems])

  const filteredItems = useMemo(() => {
    if (activeCategory === "all") return initialItems
    return initialItems.filter((i) => (i.category || "Extras") === activeCategory)
  }, [initialItems, activeCategory])

  const groupedItems = useMemo(() => {
    return filteredItems.reduce(
      (acc, item) => {
        const cat = item.category || "Extras"
        if (!acc[cat]) acc[cat] = []
        acc[cat].push(item)
        return acc
      },
      {} as Record<string, ShopItem[]>
    )
  }, [filteredItems])

  // Helper to add/update item in persistent cart
  const handleUpdateQty = (item: ShopItem, delta: number) => {
    const currentQty = getQuantity(item.id)
    if (currentQty === 0 && delta > 0) {
      // Adding new item
      addItem({
        id: item.id,
        name: item.name,
        price: Number(item.price),
        image_url: item.image_url,
        category: item.category,
        description: item.description,
      }, delta)
    } else {
      // Update existing item quantity
      updateQuantity(item.id, delta)
    }
  }

  const getQty = (id: string) => getQuantity(id)

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Global site navigation */}
      <GlobalNavbar showLocationBar={false} showModeToggle={false} />

      {/* Shop-specific sub-header */}
      <header className="sticky top-[64px] z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-gray-700" />
            <span className="font-semibold text-gray-900 text-base leading-tight">
              FoodNet Shop
            </span>
            <span className="hidden sm:block text-gray-400 text-sm">
              — Bebidas &amp; Extras
            </span>
          </div>

          <button
            onClick={() => setShowCart(true)}
            className="relative flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium px-4 py-2 rounded-full transition-colors"
          >
            <ShoppingCart className="h-4 w-4" />
            {totalItems > 0 ? (
              <>
                <span>Ver carrito</span>
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-white text-gray-900 font-bold text-xs tabular-nums">
                  {totalItems}
                </span>
              </>
            ) : (
              <span>Carrito</span>
            )}
          </button>
        </div>
      </header>

      {/* Category filter pills */}
      {categories.length > 1 && (
        <div className="sticky top-[120px] z-30 bg-white border-b border-gray-100">
          <div className="max-w-5xl mx-auto px-4 py-2 flex gap-2 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setActiveCategory("all")}
              className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeCategory === "all"
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Todo
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  activeCategory === cat
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Items grid */}
      <main className="max-w-5xl mx-auto px-4 py-8 pb-28">
        {initialItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center text-gray-400 gap-3">
            <Package className="h-12 w-12 opacity-40" />
            <p className="text-base font-medium">No hay artículos disponibles.</p>
          </div>
        ) : (
          Object.entries(groupedItems).map(([category, items]) => (
            <section key={category} className="mb-10">
              <h2 className="text-lg font-bold text-gray-900 mb-4 border-b border-gray-200 pb-2">
                {category}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map((item) => {
                  const qty = getQty(item.id)
                  return (
                    <div
                      key={item.id}
                      className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:border-gray-300 hover:shadow-sm transition-all flex flex-col"
                    >
                      {/* Image */}
                      {item.image_url ? (
                        <div className="relative w-full h-40 bg-gray-100 shrink-0">
                          <Image
                            src={item.image_url}
                            alt={item.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-full h-40 bg-gray-50 flex items-center justify-center shrink-0">
                          <Package className="h-10 w-10 text-gray-300" />
                        </div>
                      )}

                      {/* Info */}
                      <div className="p-4 flex flex-col flex-1">
                        <p className="font-semibold text-gray-900 text-sm leading-snug">
                          {item.name}
                        </p>
                        {item.description && (
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">
                            {item.description}
                          </p>
                        )}
                        <div className="mt-auto pt-3 flex items-center justify-between">
                          <span className="font-bold text-gray-900">
                            ${Number(item.price).toFixed(2)}
                          </span>
                          {qty === 0 ? (
                            <button
                              onClick={() => handleUpdateQty(item, 1)}
                              className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-900 text-white hover:bg-gray-700 transition-colors"
                              aria-label={`Agregar ${item.name}`}
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          ) : (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleUpdateQty(item, -1)}
                                className="flex items-center justify-center w-7 h-7 rounded-full border-2 border-gray-300 text-gray-700 hover:border-gray-500 transition-colors"
                                aria-label="Reducir cantidad"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="w-5 text-center text-sm font-bold tabular-nums">
                                {qty}
                              </span>
                              <button
                                onClick={() => handleUpdateQty(item, 1)}
                                className="flex items-center justify-center w-7 h-7 rounded-full bg-gray-900 text-white hover:bg-gray-700 transition-colors"
                                aria-label="Aumentar cantidad"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          ))
        )}
      </main>

      {/* Cart drawer */}
      {showCart && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowCart(false)}
          />
          {/* Panel */}
          <div className="relative ml-auto w-full max-w-sm bg-white h-full flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="font-bold text-gray-900">Tu carrito</h2>
              <button
                onClick={() => setShowCart(false)}
                className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Cerrar carrito"
              >
                <X className="h-4 w-4 text-gray-600" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cartItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
                  <ShoppingCart className="h-10 w-10 opacity-40" />
                  <p className="text-sm">Tu carrito está vacío</p>
                </div>
              ) : (
                cartItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 bg-white"
                  >
                    {item.image_url ? (
                      <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-gray-100">
                        <Image
                          src={item.image_url}
                          alt={item.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                        <Package className="h-5 w-5 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {item.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        ${Number(item.price).toFixed(2)} c/u
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => updateQuantity(item.id, -1)}
                        className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center hover:border-gray-500 transition-colors"
                      >
                        <Minus className="h-3 w-3 text-gray-600" />
                      </button>
                      <span className="w-5 text-center text-sm font-bold tabular-nums">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, 1)}
                        className="w-6 h-6 rounded-full bg-gray-900 flex items-center justify-center hover:bg-gray-700 transition-colors"
                      >
                        <Plus className="h-3 w-3 text-white" />
                      </button>
                    </div>
                    <span className="text-sm font-semibold text-gray-900 tabular-nums w-14 text-right shrink-0">
                      ${(Number(item.price) * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))
              )}
            </div>

            {cartItems.length > 0 && (
              <div className="p-4 border-t border-gray-200 space-y-3">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal ({totalItems} artículo{totalItems !== 1 ? "s" : ""})</span>
                  <span className="font-semibold text-gray-900">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>IVU (11.5%)</span>
                  <span className="text-gray-900">${tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-base font-bold text-gray-900 pt-2 border-t border-gray-100">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
                <p className="text-xs text-gray-500 text-center pt-2">
                  Estos artículos se agregarán automáticamente cuando ordenes en un restaurante.
                </p>
                <a
                  href="/"
                  className="block w-full py-2.5 px-4 text-center text-white font-semibold text-sm rounded-lg bg-cyan-600 hover:bg-cyan-700 transition-colors"
                >
                  Ordenar Comida
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
