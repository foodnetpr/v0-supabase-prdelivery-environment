"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from "react"

export interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
  type: "menu_item" | "package" | "delivery_fee" | "tip"
  options?: {
    name: string
    choices: { name: string; price: number }[]
  }[]
  selectedSize?: { name: string; price: number }
  restaurantId?: string
  restaurantName?: string
  restaurantSlug?: string
  image_url?: string | null
}

interface CartContextType {
  items: CartItem[]
  restaurantId: string | null
  restaurantName: string | null
  restaurantSlug: string | null
  addItem: (item: CartItem) => void
  removeItem: (index: number) => void
  updateQuantity: (index: number, quantity: number) => void
  clearCart: () => void
  setRestaurant: (id: string, name: string, slug: string) => void
  itemCount: number
  subtotal: number
}

const CartContext = createContext<CartContextType | undefined>(undefined)

const CART_STORAGE_KEY = "foodnetpr_cart"

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [restaurantId, setRestaurantId] = useState<string | null>(null)
  const [restaurantName, setRestaurantName] = useState<string | null>(null)
  const [restaurantSlug, setRestaurantSlug] = useState<string | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem(CART_STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setItems(parsed.items || [])
        setRestaurantId(parsed.restaurantId || null)
        setRestaurantName(parsed.restaurantName || null)
        setRestaurantSlug(parsed.restaurantSlug || null)
      } catch (e) {
        console.error("Error loading cart from localStorage:", e)
      }
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify({
        items,
        restaurantId,
        restaurantName,
        restaurantSlug,
      })
    )
  }, [items, restaurantId, restaurantName, restaurantSlug])

  const setRestaurant = useCallback((id: string, name: string, slug: string) => {
    setRestaurantId((prevId) => {
      if (prevId && prevId !== id) {
        setItems([])
      }
      return id
    })
    setRestaurantName(name)
    setRestaurantSlug(slug)
  }, [])

  const addItem = useCallback((item: CartItem) => {
    setItems((prev) => {
      if (item.type === "menu_item" || item.type === "package") {
        const existingIndex = prev.findIndex(
          (existing) =>
            existing.id === item.id &&
            existing.type === item.type &&
            JSON.stringify(existing.options) === JSON.stringify(item.options) &&
            JSON.stringify(existing.selectedSize) === JSON.stringify(item.selectedSize)
        )
        if (existingIndex >= 0) {
          const updated = [...prev]
          updated[existingIndex].quantity += item.quantity
          return updated
        }
      }
      return [...prev, item]
    })
  }, [])

  const removeItem = useCallback((index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const updateQuantity = useCallback((index: number, quantity: number) => {
    if (quantity <= 0) {
      removeItem(index)
      return
    }
    setItems((prev) => {
      const updated = [...prev]
      if (updated[index]) {
        updated[index].quantity = quantity
      }
      return updated
    })
  }, [removeItem])

  const clearCart = useCallback(() => {
    setItems([])
    setRestaurantId(null)
    setRestaurantName(null)
    setRestaurantSlug(null)
  }, [])

  const itemCount = items.reduce((sum, item) => {
    if (item.type === "menu_item" || item.type === "package") {
      return sum + item.quantity
    }
    return sum
  }, 0)

  const subtotal = items.reduce((sum, item) => {
    if (item.type === "delivery_fee" || item.type === "tip") {
      return sum
    }
    return sum + item.price * item.quantity
  }, 0)

  return (
    <CartContext.Provider
      value={{
        items,
        restaurantId,
        restaurantName,
        restaurantSlug,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        setRestaurant,
        itemCount,
        subtotal,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider")
  }
  return context
}
