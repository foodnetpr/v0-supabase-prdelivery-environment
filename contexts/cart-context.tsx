"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from "react"

export interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
  image?: string
  modifiers?: Array<{
    name: string
    price: number
  }>
  specialInstructions?: string
}

interface CartContextType {
  items: CartItem[]
  restaurantId: string | null
  restaurantName: string | null
  addItem: (item: CartItem, restaurantId: string, restaurantName: string) => void
  removeItem: (itemId: string) => void
  updateQuantity: (itemId: string, quantity: number) => void
  clearCart: () => void
  subtotal: number
  itemCount: number
}

const CartContext = createContext<CartContextType | undefined>(undefined)

const CART_STORAGE_KEY = "foodnetpr_cart"

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [restaurantId, setRestaurantId] = useState<string | null>(null)
  const [restaurantName, setRestaurantName] = useState<string | null>(null)
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(CART_STORAGE_KEY)
        if (saved) {
          const parsed = JSON.parse(saved)
          setItems(parsed.items || [])
          setRestaurantId(parsed.restaurantId || null)
          setRestaurantName(parsed.restaurantName || null)
        }
      } catch (e) {
        console.error("Error loading cart:", e)
      }
      setIsHydrated(true)
    }
  }, [])

  useEffect(() => {
    if (isHydrated && typeof window !== "undefined") {
      localStorage.setItem(
        CART_STORAGE_KEY,
        JSON.stringify({ items, restaurantId, restaurantName })
      )
    }
  }, [items, restaurantId, restaurantName, isHydrated])

  const addItem = useCallback(
    (item: CartItem, newRestaurantId: string, newRestaurantName: string) => {
      if (restaurantId && restaurantId !== newRestaurantId) {
        if (
          !window.confirm(
            `Tu carrito tiene items de ${restaurantName}. ¿Deseas vaciarlo y agregar items de ${newRestaurantName}?`
          )
        ) {
          return
        }
        setItems([item])
        setRestaurantId(newRestaurantId)
        setRestaurantName(newRestaurantName)
        return
      }

      setItems((prev) => {
        const existingIndex = prev.findIndex((i) => i.id === item.id)
        if (existingIndex >= 0) {
          const updated = [...prev]
          updated[existingIndex] = {
            ...updated[existingIndex],
            quantity: updated[existingIndex].quantity + item.quantity,
          }
          return updated
        }
        return [...prev, item]
      })

      if (!restaurantId) {
        setRestaurantId(newRestaurantId)
        setRestaurantName(newRestaurantName)
      }
    },
    [restaurantId, restaurantName]
  )

  const removeItem = useCallback((itemId: string) => {
    setItems((prev) => {
      const filtered = prev.filter((i) => i.id !== itemId)
      if (filtered.length === 0) {
        setRestaurantId(null)
        setRestaurantName(null)
      }
      return filtered
    })
  }, [])

  const updateQuantity = useCallback((itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(itemId)
      return
    }
    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, quantity } : i))
    )
  }, [removeItem])

  const clearCart = useCallback(() => {
    setItems([])
    setRestaurantId(null)
    setRestaurantName(null)
  }, [])

  const subtotal = items.reduce((sum, item) => {
    const modifiersTotal =
      item.modifiers?.reduce((m, mod) => m + mod.price, 0) || 0
    return sum + (item.price + modifiersTotal) * item.quantity
  }, 0)

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)

  const value: CartContextType = {
    items,
    restaurantId,
    restaurantName,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    subtotal,
    itemCount,
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider")
  }
  return context
}
