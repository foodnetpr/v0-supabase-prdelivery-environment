"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Plus, Minus, Package, ChevronDown, ShoppingBag } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

interface InternalShopItem {
  id: string
  name: string
  description: string | null
  price: number
  image_url: string | null
  category: string | null
  is_active: boolean
}

interface InternalShopExtrasProps {
  onAddToCart: (item: InternalShopItem, quantity: number) => void
  existingItems?: { id: string; quantity: number }[]
}

export function InternalShopExtras({ onAddToCart, existingItems = [] }: InternalShopExtrasProps) {
  const [items, setItems] = useState<InternalShopItem[]>([])
  const [loading, setLoading] = useState(true)
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [isOpen, setIsOpen] = useState(false)
  const [shopAvailable, setShopAvailable] = useState(false)

  useEffect(() => {
    checkAvailabilityAndFetchItems()
  }, [])

  useEffect(() => {
    // Initialize quantities from existing cart items
    const initialQuantities: Record<string, number> = {}
    existingItems.forEach((item) => {
      initialQuantities[item.id] = item.quantity
    })
    setQuantities(initialQuantities)
    // Auto-expand if there are existing items in cart
    if (existingItems.length > 0) {
      setIsOpen(true)
    }
  }, [existingItems])

  const checkAvailabilityAndFetchItems = async () => {
    try {
      // Check if shop is available/enabled
      const availResponse = await fetch("/api/internal-shop/availability")
      if (availResponse.ok) {
        const availData = await availResponse.json()
        if (!availData.available) {
          setShopAvailable(false)
          setLoading(false)
          return
        }
        setShopAvailable(true)
      } else {
        setShopAvailable(false)
        setLoading(false)
        return
      }

      // Fetch items
      const response = await fetch("/api/internal-shop/items?active=true")
      if (response.ok) {
        const data = await response.json()
        setItems(data.items || [])
      }
    } catch (error) {
      console.error("Failed to fetch internal shop items:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleQuantityChange = (item: InternalShopItem, delta: number) => {
    const currentQty = quantities[item.id] || 0
    const newQty = Math.max(0, currentQty + delta)
    
    setQuantities((prev) => ({
      ...prev,
      [item.id]: newQty,
    }))

    onAddToCart(item, newQty)
  }

  // Group items by category
  const groupedItems = items.reduce((acc, item) => {
    const category = item.category || "Extras"
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(item)
    return acc
  }, {} as Record<string, InternalShopItem[]>)

  // Count total items in cart
  const totalItemsInCart = Object.values(quantities).reduce((sum, qty) => sum + qty, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  // Don't render if shop is not available or no items
  if (!shopAvailable || items.length === 0) {
    return null
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
      <CollapsibleTrigger asChild>
        <button className="w-full flex items-center justify-between p-3 bg-white rounded-lg border hover:bg-gray-50 transition-colors">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
              <ShoppingBag className="h-4 w-4 text-purple-600" />
            </div>
            <div className="text-left">
              <p className="font-medium text-sm">Agrega Extras a tu Pedido</p>
              <p className="text-xs text-muted-foreground">
                Bebidas, snacks y mas
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {totalItemsInCart > 0 && (
              <Badge className="bg-purple-600 text-white text-xs">
                {totalItemsInCart} agregado{totalItemsInCart > 1 ? "s" : ""}
              </Badge>
            )}
            <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
          </div>
        </button>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="mt-2">
        <div className="bg-white rounded-lg border p-3 space-y-3 max-h-[300px] overflow-y-auto">
          {Object.entries(groupedItems).map(([category, categoryItems]) => (
            <div key={category} className="space-y-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{category}</p>
              <div className="grid grid-cols-1 gap-2">
                {categoryItems.map((item) => {
                  const quantity = quantities[item.id] || 0
                  return (
                    <div 
                      key={item.id} 
                      className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      {item.image_url ? (
                        <Image
                          src={item.image_url}
                          alt={item.name}
                          width={36}
                          height={36}
                          className="rounded object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="flex h-9 w-9 items-center justify-center rounded bg-gray-200 flex-shrink-0">
                          <Package className="h-4 w-4 text-gray-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.name}</p>
                        <p className="text-xs font-semibold text-purple-600">
                          ${Number(item.price).toFixed(2)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {quantity > 0 ? (
                          <>
                            <button
                              onClick={() => handleQuantityChange(item, -1)}
                              className="h-7 w-7 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="w-6 text-center font-medium text-sm">
                              {quantity}
                            </span>
                            <button
                              onClick={() => handleQuantityChange(item, 1)}
                              className="h-7 w-7 rounded-full bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center transition-colors"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs px-2"
                            onClick={() => handleQuantityChange(item, 1)}
                          >
                            <Plus className="mr-1 h-3 w-3" />
                            Agregar
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
