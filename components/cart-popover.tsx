"use client"

import { useState } from "react"
import { ShoppingCart, X, Minus, Plus } from "lucide-react"
import { useCart } from "@/contexts/cart-context"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import Image from "next/image"

export function CartPopover() {
  const { items, itemCount, subtotal, restaurantName, restaurantSlug, removeItem, updateQuantity, clearCart } = useCart()
  const [isOpen, setIsOpen] = useState(false)

  // Filter to only show actual items (not fees/tips)
  const cartItems = items.filter((item) => item.type === "menu_item" || item.type === "package")

  return (
    <div 
      className="relative"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      {/* Cart Button */}
      <button className="relative p-2 hover:bg-slate-100 rounded-full transition-colors">
        <ShoppingCart className="w-5 h-5 text-slate-700" />
        {itemCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-emerald-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
            {itemCount > 9 ? "9+" : itemCount}
          </span>
        )}
      </button>

      {/* Popover */}
      {isOpen && (
        <div 
          className="absolute right-0 top-full mt-2 w-96 bg-white rounded-lg shadow-2xl border border-slate-200 z-50"
          onMouseEnter={() => setIsOpen(true)}
          onMouseLeave={() => setIsOpen(false)}
        >
          {/* Header */}
          <div className="p-4 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-slate-100 rounded-full"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            
            {restaurantName && (
              <h3 className="text-lg font-bold mt-2">{restaurantName}</h3>
            )}
            
            {cartItems.length > 0 && (
              <div className="flex items-center justify-between mt-2 text-sm text-slate-600">
                <span>{itemCount} item{itemCount !== 1 ? "s" : ""}</span>
                <span>Subtotal: <span className="font-semibold text-slate-900">${subtotal.toFixed(2)}</span></span>
              </div>
            )}
          </div>

          {/* Cart Items */}
          <div className="max-h-80 overflow-y-auto">
            {cartItems.length === 0 ? (
              <div className="p-6 text-center text-slate-500">
                <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="font-medium">Tu carrito está vacío</p>
                <p className="text-sm mt-1">Agrega items de un restaurante para comenzar</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {cartItems.map((item, index) => (
                  <div key={`${item.id}-${index}`} className="p-4 flex gap-3">
                    {/* Quantity selector */}
                    <div className="flex flex-col items-center gap-1">
                      <button
                        onClick={() => updateQuantity(index, item.quantity + 1)}
                        className="p-1 hover:bg-slate-100 rounded"
                      >
                        <Plus className="w-4 h-4 text-slate-500" />
                      </button>
                      <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(index, item.quantity - 1)}
                        className="p-1 hover:bg-slate-100 rounded"
                      >
                        <Minus className="w-4 h-4 text-slate-500" />
                      </button>
                    </div>

                    {/* Item image */}
                    {item.image_url && (
                      <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-slate-100">
                        <Image
                          src={item.image_url}
                          alt={item.name}
                          width={64}
                          height={64}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    {/* Item details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-medium text-sm text-slate-900 truncate">{item.name}</h4>
                        <span className="font-medium text-sm text-slate-900 flex-shrink-0">
                          ${(item.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                      
                      {/* Options/modifiers */}
                      {item.options && item.options.length > 0 && (
                        <div className="mt-1 text-xs text-slate-500">
                          {item.options.map((opt, i) => (
                            <div key={i}>
                              {opt.choices.map((c) => c.name).join(", ")}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Size */}
                      {item.selectedSize && (
                        <div className="text-xs text-slate-500">
                          {item.selectedSize.name}
                        </div>
                      )}

                      {/* Remove button */}
                      <button
                        onClick={() => removeItem(index)}
                        className="text-xs text-red-500 hover:text-red-700 mt-1"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {cartItems.length > 0 && (
            <div className="p-4 border-t border-slate-100 space-y-3">
              {/* Subtotal */}
              <div className="flex items-center justify-between font-semibold">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>

              {/* Promo banner */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                <div className="w-8 h-8 bg-amber-400 rounded flex items-center justify-center flex-shrink-0">
                  <ShoppingCart className="w-4 h-4 text-white" />
                </div>
                <p className="text-xs text-amber-800">
                  <span className="font-semibold">Regístrate</span> para disfrutar $0 en envío y hasta 10% de descuento en tu primer orden.
                </p>
              </div>

              {/* Checkout button */}
              <Link
                href={restaurantSlug ? `/${restaurantSlug}?checkout=true` : "/"}
                className="block"
              >
                <Button className="w-full bg-black hover:bg-slate-800 text-white rounded-lg py-3 font-semibold">
                  Ir al checkout
                </Button>
              </Link>

              {/* Clear cart */}
              <button
                onClick={clearCart}
                className="w-full text-center text-sm text-slate-500 hover:text-slate-700"
              >
                Vaciar carrito
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
