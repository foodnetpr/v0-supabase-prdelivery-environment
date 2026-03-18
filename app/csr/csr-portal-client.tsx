"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import PhoneOrderForm from "@/components/phone-order-form"
import { Phone, Search, Building2, X, ShoppingCart, Minus, Plus, Trash2, ChevronRight, LogOut, Edit2 } from "lucide-react"
import Link from "next/link"

interface Restaurant {
  id: string
  name: string
  slug: string
  logo_url: string | null
  cuisine_type: string | null
  cuisine_types: string[] | null
  area: string | null
  tax_rate: number | null
}

interface ItemOption {
  id: string
  category: string
  is_required: boolean
  max_selections: number | null
  display_type: string | null
  item_option_choices: {
    id: string
    name: string
    price_modifier: number | null
    description: string | null
    sub_options?: {
      id: string
      name: string
      price_modifier: number | null
    }[]
  }[]
}

interface CartItem {
  id: string
  itemId: string
  name: string
  price: number
  quantity: number
  description?: string
  selectedOptions?: Record<string, string>
  customizations?: Record<string, string | string[]>
}

interface CSRPortalClientProps {
  restaurants: Restaurant[]
}

export function CSRPortalClient({ restaurants }: CSRPortalClientProps) {
  const supabase = createClient()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null)
  const [menuItems, setMenuItems] = useState<any[]>([])
  const [branches, setBranches] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  
  // Cart state
  const [cart, setCart] = useState<CartItem[]>([])
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [menuSearchTerm, setMenuSearchTerm] = useState("")
  
  // Item detail modal state
  const [selectedItem, setSelectedItem] = useState<any | null>(null)
  const [itemOptions, setItemOptions] = useState<ItemOption[]>([])
  const [itemCustomizations, setItemCustomizations] = useState<Record<string, string | string[]>>({})
  const [loadingOptions, setLoadingOptions] = useState(false)

  // Filter restaurants by search
  const filteredRestaurants = restaurants.filter((r) =>
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.cuisine_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.area?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Load menu items and branches when restaurant is selected
  const selectRestaurant = async (restaurant: Restaurant) => {
    setLoading(true)
    setSelectedRestaurant(restaurant)
    setCart([])

    try {
      const { data: items } = await supabase
        .from("menu_items")
        .select("*")
        .eq("restaurant_id", restaurant.id)
        .eq("is_active", true)
        .order("display_order", { ascending: true })

      const { data: branchData } = await supabase
        .from("branches")
        .select("*")
        .eq("restaurant_id", restaurant.id)
        .eq("is_active", true)
        .order("display_order", { ascending: true })

      setMenuItems(items || [])
      setBranches(branchData || [])
    } catch (error) {
      console.error("Error loading restaurant data:", error)
    } finally {
      setLoading(false)
    }
  }

  const clearSelection = () => {
    setSelectedRestaurant(null)
    setMenuItems([])
    setBranches([])
    setCart([])
    setIsCartOpen(false)
    setSelectedItem(null)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = "/login"
  }

  // Load item options when item is selected
  const openItemDetail = async (item: any) => {
    setSelectedItem(item)
    setItemCustomizations({})
    setLoadingOptions(true)

    try {
      const { data: options } = await supabase
        .from("item_options")
        .select(`
          id,
          category,
          is_required,
          max_selections,
          display_type,
          item_option_choices (
            id,
            name,
            price_modifier,
            description,
            sub_options
          )
        `)
        .eq("item_id", item.id)
        .order("display_order", { ascending: true })

      setItemOptions(options || [])
    } catch (error) {
      console.error("Error loading item options:", error)
      setItemOptions([])
    } finally {
      setLoadingOptions(false)
    }
  }

  // Handle option selection
  const handleOptionSelect = (optionId: string, choiceId: string, isMulti: boolean) => {
    setItemCustomizations((prev) => {
      if (isMulti) {
        const current = (prev[optionId] as string[]) || []
        if (current.includes(choiceId)) {
          return { ...prev, [optionId]: current.filter((id) => id !== choiceId) }
        }
        return { ...prev, [optionId]: [...current, choiceId] }
      }
      return { ...prev, [optionId]: choiceId }
    })
  }

  // Calculate item price with options
  const calculateItemPrice = (item: any) => {
    let price = Number(item.price) || 0
    
    Object.entries(itemCustomizations).forEach(([optionId, selection]) => {
      const option = itemOptions.find((o) => o.id === optionId)
      if (!option) return

      if (Array.isArray(selection)) {
        selection.forEach((choiceId) => {
          const choice = option.item_option_choices.find((c) => c.id === choiceId)
          if (choice?.price_modifier) {
            price += Number(choice.price_modifier)
          }
        })
      } else if (selection) {
        const choice = option.item_option_choices.find((c) => c.id === selection)
        if (choice?.price_modifier) {
          price += Number(choice.price_modifier)
        }
      }
    })

    return price
  }

  // Build selected options display string
  const buildSelectedOptionsDisplay = (): Record<string, string> => {
    const display: Record<string, string> = {}

    Object.entries(itemCustomizations).forEach(([optionId, selection]) => {
      const option = itemOptions.find((o) => o.id === optionId)
      if (!option) return

      if (Array.isArray(selection)) {
        const names = selection
          .map((choiceId) => option.item_option_choices.find((c) => c.id === choiceId)?.name)
          .filter(Boolean)
          .join(", ")
        if (names) display[option.category] = names
      } else if (selection) {
        const choice = option.item_option_choices.find((c) => c.id === selection)
        if (choice) display[option.category] = choice.name
      }
    })

    return display
  }

  // Add item to cart with options
  const addItemToCart = () => {
    if (!selectedItem) return

    // Check required options
    const missingRequired = itemOptions.filter((opt) => opt.is_required && !itemCustomizations[opt.id])
    if (missingRequired.length > 0) {
      alert(`Selecciona: ${missingRequired.map((o) => o.category).join(", ")}`)
      return
    }

    const itemPrice = calculateItemPrice(selectedItem)
    const selectedOptionsDisplay = buildSelectedOptionsDisplay()
    
    // Generate unique cart item ID based on item + selections
    const optionsKey = JSON.stringify(itemCustomizations)
    const cartItemId = `${selectedItem.id}-${btoa(optionsKey)}`

    const existingIndex = cart.findIndex((c) => c.id === cartItemId)
    
    if (existingIndex >= 0) {
      setCart(cart.map((c, i) => i === existingIndex ? { ...c, quantity: c.quantity + 1 } : c))
    } else {
      setCart([
        ...cart,
        {
          id: cartItemId,
          itemId: selectedItem.id,
          name: selectedItem.name,
          price: itemPrice,
          quantity: 1,
          description: selectedItem.description,
          selectedOptions: selectedOptionsDisplay,
          customizations: { ...itemCustomizations },
        },
      ])
    }

    setSelectedItem(null)
    setItemOptions([])
    setItemCustomizations({})
  }

  // Quick add (no options) - for items without options
  const quickAddToCart = async (item: any) => {
    // Check if item has options
    const { data: options } = await supabase
      .from("item_options")
      .select("id")
      .eq("item_id", item.id)
      .limit(1)

    if (options && options.length > 0) {
      // Has options, open detail modal
      openItemDetail(item)
    } else {
      // No options, add directly
      const cartItemId = `${item.id}-simple`
      const existing = cart.find((c) => c.id === cartItemId)
      
      if (existing) {
        setCart(cart.map((c) => c.id === cartItemId ? { ...c, quantity: c.quantity + 1 } : c))
      } else {
        setCart([
          ...cart,
          {
            id: cartItemId,
            itemId: item.id,
            name: item.name,
            price: Number(item.price) || 0,
            quantity: 1,
            description: item.description,
          },
        ])
      }
    }
  }

  const updateQuantity = (id: string, delta: number) => {
    setCart(
      cart
        .map((c) => (c.id === id ? { ...c, quantity: c.quantity + delta } : c))
        .filter((c) => c.quantity > 0)
    )
  }

  const removeFromCart = (id: string) => {
    setCart(cart.filter((c) => c.id !== id))
  }

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0)

  // Filter menu items
  const filteredMenuItems = menuItems.filter((item) =>
    item.name.toLowerCase().includes(menuSearchTerm.toLowerCase()) ||
    item.description?.toLowerCase().includes(menuSearchTerm.toLowerCase()) ||
    item.category?.toLowerCase().includes(menuSearchTerm.toLowerCase())
  )

  // Group menu items by category
  const groupedItems = filteredMenuItems.reduce((acc, item) => {
    const cat = item.category || "Otros"
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(item)
    return acc
  }, {} as Record<string, any[]>)

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="px-4 h-12 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center">
              <Phone className="w-3.5 h-3.5 text-white" />
            </div>
            <h1 className="text-sm font-bold text-slate-900">CSR Portal</h1>
          </div>

          {selectedRestaurant && (
            <div className="flex items-center gap-2 bg-slate-100 rounded-lg px-2.5 py-1">
              <span className="font-medium text-slate-900 text-xs">{selectedRestaurant.name}</span>
              <button onClick={clearSelection} className="p-0.5 hover:bg-slate-200 rounded-full">
                <X className="w-3 h-3 text-slate-500" />
              </button>
            </div>
          )}

          <div className="flex items-center gap-2">
            {selectedRestaurant && (
              <button
                onClick={() => setIsCartOpen(true)}
                className="relative p-1.5 hover:bg-slate-100 rounded-lg"
              >
                <ShoppingCart className="w-4 h-4 text-slate-700" />
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {totalItems}
                  </span>
                )}
              </button>
            )}
            <Link href="/super-admin" className="text-xs text-slate-600 hover:text-slate-900 hidden sm:block">
              Admin
            </Link>
            <Button variant="outline" size="sm" onClick={handleLogout} className="h-7 text-xs px-2">
              <LogOut className="w-3 h-3 mr-1" />
              Salir
            </Button>
          </div>
        </div>
      </header>

      <main className="flex h-[calc(100vh-48px)]">
        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-3">
          {!selectedRestaurant ? (
            // Restaurant Selector - Compact Grid
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900">Seleccionar Restaurante</h2>
                <span className="text-xs text-slate-500">{restaurants.length} restaurantes</span>
              </div>

              <div className="relative max-w-xs">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar..."
                  className="pl-7 h-8 text-sm"
                />
              </div>

              {/* Compact Restaurant Grid */}
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-1.5">
                {filteredRestaurants.map((restaurant) => (
                  <button
                    key={restaurant.id}
                    className="text-left p-2 rounded-md border border-slate-200 bg-white hover:border-rose-300 hover:bg-rose-50 transition-all group"
                    onClick={() => selectRestaurant(restaurant)}
                  >
                    <h3 className="font-medium text-slate-900 text-xs truncate group-hover:text-rose-600">
                      {restaurant.name}
                    </h3>
                    {restaurant.area && (
                      <p className="text-[10px] text-slate-400 truncate">{restaurant.area}</p>
                    )}
                  </button>
                ))}
              </div>

              {filteredRestaurants.length === 0 && (
                <div className="text-center py-8">
                  <Building2 className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500 text-sm">No se encontraron restaurantes</p>
                </div>
              )}
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center space-y-2">
                <div className="w-6 h-6 border-2 border-rose-200 border-t-rose-500 rounded-full animate-spin mx-auto" />
                <p className="text-slate-600 text-xs">Cargando menu...</p>
              </div>
            </div>
          ) : (
            // Menu + Phone Order Form side by side
            <div className="flex gap-3 h-full">
              {/* Menu Items - Left Side */}
              <div className="w-1/2 flex flex-col min-h-0">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-slate-900 text-sm">Menu</h3>
                  <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                    <Input
                      value={menuSearchTerm}
                      onChange={(e) => setMenuSearchTerm(e.target.value)}
                      placeholder="Buscar item..."
                      className="pl-6 h-7 text-xs"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  {Object.entries(groupedItems).map(([category, items]) => (
                    <div key={category}>
                      <h4 className="text-[10px] font-bold text-slate-600 uppercase tracking-wide mb-1.5 sticky top-0 bg-slate-50 py-0.5">
                        {category}
                      </h4>
                      <div className="space-y-0.5">
                        {items.map((item) => {
                          const inCart = cart.filter((c) => c.itemId === item.id)
                          const totalQty = inCart.reduce((sum, c) => sum + c.quantity, 0)
                          return (
                            <div
                              key={item.id}
                              className="flex items-center justify-between py-1 px-1.5 rounded bg-white border border-slate-100 hover:border-slate-200 cursor-pointer group"
                              onClick={() => openItemDetail(item)}
                            >
                              <div className="flex-1 min-w-0 mr-2">
                                <p className="font-medium text-slate-900 text-xs truncate group-hover:text-rose-600">
                                  {item.name}
                                </p>
                                <p className="text-[10px] text-slate-500">${Number(item.price).toFixed(2)}</p>
                              </div>
                              <div className="flex items-center gap-1">
                                {totalQty > 0 && (
                                  <span className="w-5 h-5 bg-rose-100 text-rose-600 text-[10px] font-bold rounded-full flex items-center justify-center">
                                    {totalQty}
                                  </span>
                                )}
                                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-rose-500" />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Phone Order Form - Right Side */}
              <div className="w-1/2 overflow-y-auto">
                <PhoneOrderForm
                  restaurantId={selectedRestaurant.id}
                  menuItems={menuItems}
                  branches={branches}
                  taxRate={selectedRestaurant.tax_rate || 11.5}
                  onClose={clearSelection}
                  externalCart={cart}
                  setExternalCart={setCart}
                />
              </div>
            </div>
          )}
        </div>

        {/* Sliding Cart Panel */}
        {selectedRestaurant && (
          <>
            {isCartOpen && (
              <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setIsCartOpen(false)} />
            )}
            
            <div
              className={`fixed top-12 right-0 h-[calc(100vh-48px)] w-72 bg-white border-l border-slate-200 shadow-xl z-50 transform transition-transform duration-300 ${
                isCartOpen ? "translate-x-0" : "translate-x-full"
              }`}
            >
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between p-3 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4 text-rose-500" />
                    <h3 className="font-semibold text-slate-900 text-sm">Carrito ({totalItems})</h3>
                  </div>
                  <button onClick={() => setIsCartOpen(false)} className="p-1 hover:bg-slate-100 rounded-full">
                    <X className="w-4 h-4 text-slate-500" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {cart.length === 0 ? (
                    <div className="text-center py-6">
                      <ShoppingCart className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                      <p className="text-slate-500 text-xs">Carrito vacio</p>
                    </div>
                  ) : (
                    cart.map((item) => (
                      <div key={item.id} className="p-2 bg-slate-50 rounded-lg">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-900 text-xs">{item.name}</p>
                            {/* Show selected options */}
                            {item.selectedOptions && Object.keys(item.selectedOptions).length > 0 && (
                              <div className="mt-0.5">
                                {Object.entries(item.selectedOptions).map(([cat, val]) => (
                                  <p key={cat} className="text-[10px] text-slate-500 italic">
                                    {val}
                                  </p>
                                ))}
                              </div>
                            )}
                            <p className="text-[10px] text-slate-500 mt-0.5">${item.price.toFixed(2)} c/u</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => updateQuantity(item.id, -1)}
                              className="w-5 h-5 rounded-full bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center"
                            >
                              <Minus className="w-2.5 h-2.5" />
                            </button>
                            <span className="w-5 text-center text-xs font-medium">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.id, 1)}
                              className="w-5 h-5 rounded-full bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center"
                            >
                              <Plus className="w-2.5 h-2.5" />
                            </button>
                            <button
                              onClick={() => removeFromCart(item.id)}
                              className="w-5 h-5 rounded-full hover:bg-red-100 flex items-center justify-center ml-0.5"
                            >
                              <Trash2 className="w-2.5 h-2.5 text-red-500" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {cart.length > 0 && (
                  <div className="p-3 border-t border-slate-200 bg-slate-50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-slate-600 text-sm">Subtotal</span>
                      <span className="font-semibold text-slate-900">${subtotal.toFixed(2)}</span>
                    </div>
                    <Button
                      className="w-full bg-rose-500 hover:bg-rose-600 h-8 text-sm"
                      onClick={() => setIsCartOpen(false)}
                    >
                      Continuar
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Item Detail Modal with Options */}
        {selectedItem && (
          <>
            <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setSelectedItem(null)} />
            <div className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[500px] md:max-h-[80vh] bg-white rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
                <div>
                  <h3 className="font-bold text-slate-900">{selectedItem.name}</h3>
                  <p className="text-sm text-slate-500">${Number(selectedItem.price).toFixed(2)}</p>
                </div>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="p-1.5 hover:bg-slate-200 rounded-full"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              {/* Options */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {loadingOptions ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-6 h-6 border-2 border-rose-200 border-t-rose-500 rounded-full animate-spin" />
                  </div>
                ) : itemOptions.length === 0 ? (
                  <p className="text-center text-slate-500 text-sm py-4">
                    Este item no tiene opciones adicionales
                  </p>
                ) : (
                  itemOptions.map((option) => {
                    const isMulti = (option.max_selections || 1) > 1
                    const currentSelection = itemCustomizations[option.id]

                    return (
                      <div key={option.id} className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Label className="font-semibold text-slate-900">
                            {option.category}
                          </Label>
                          {option.is_required && (
                            <span className="text-[10px] bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded font-medium">
                              Requerido
                            </span>
                          )}
                          {isMulti && (
                            <span className="text-[10px] text-slate-500">
                              (Selecciona hasta {option.max_selections})
                            </span>
                          )}
                        </div>

                        {isMulti ? (
                          // Checkbox group for multi-select
                          <div className="space-y-1.5">
                            {option.item_option_choices.map((choice) => {
                              const isChecked = Array.isArray(currentSelection) && currentSelection.includes(choice.id)
                              return (
                                <label
                                  key={choice.id}
                                  className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                                    isChecked ? "border-rose-300 bg-rose-50" : "border-slate-200 hover:bg-slate-50"
                                  }`}
                                >
                                  <Checkbox
                                    checked={isChecked}
                                    onCheckedChange={() => handleOptionSelect(option.id, choice.id, true)}
                                  />
                                  <div className="flex-1">
                                    <span className="text-sm font-medium text-slate-900">{choice.name}</span>
                                    {choice.description && (
                                      <p className="text-xs text-slate-500">{choice.description}</p>
                                    )}
                                  </div>
                                  {choice.price_modifier && choice.price_modifier > 0 && (
                                    <span className="text-xs text-slate-600">+${Number(choice.price_modifier).toFixed(2)}</span>
                                  )}
                                </label>
                              )
                            })}
                          </div>
                        ) : (
                          // Radio group for single-select
                          <RadioGroup
                            value={(currentSelection as string) || ""}
                            onValueChange={(value) => handleOptionSelect(option.id, value, false)}
                            className="space-y-1.5"
                          >
                            {option.item_option_choices.map((choice) => (
                              <label
                                key={choice.id}
                                className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                                  currentSelection === choice.id
                                    ? "border-rose-300 bg-rose-50"
                                    : "border-slate-200 hover:bg-slate-50"
                                }`}
                              >
                                <RadioGroupItem value={choice.id} />
                                <div className="flex-1">
                                  <span className="text-sm font-medium text-slate-900">{choice.name}</span>
                                  {choice.description && (
                                    <p className="text-xs text-slate-500">{choice.description}</p>
                                  )}
                                </div>
                                {choice.price_modifier && choice.price_modifier > 0 && (
                                  <span className="text-xs text-slate-600">+${Number(choice.price_modifier).toFixed(2)}</span>
                                )}
                              </label>
                            ))}
                          </RadioGroup>
                        )}
                      </div>
                    )
                  })
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-200 bg-slate-50">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-slate-600">Total</span>
                  <span className="font-bold text-lg text-slate-900">
                    ${calculateItemPrice(selectedItem).toFixed(2)}
                  </span>
                </div>
                <Button
                  className="w-full bg-rose-500 hover:bg-rose-600"
                  onClick={addItemToCart}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar al Carrito
                </Button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
