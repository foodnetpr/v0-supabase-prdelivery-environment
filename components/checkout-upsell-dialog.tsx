"use client"

import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { X, Plus, Check, UtensilsCrossed } from "lucide-react"
import Image from "next/image"

interface UpsellItem {
  id: string
  name: string
  description: string
  price: number
  image_url: string | null
}

interface CheckoutUpsellDialogProps {
  open: boolean
  onClose: () => void
  onSkip: () => void
  items: UpsellItem[]
  onAddItem: (item: UpsellItem) => void
  addedItemIds: string[]
  title?: string
  primaryColor?: string
}

export function CheckoutUpsellDialog({
  open,
  onClose,
  onSkip,
  items,
  onAddItem,
  addedItemIds,
  title = "Completa tu orden",
  primaryColor = "#5d1f1f",
}: CheckoutUpsellDialogProps) {
  if (items.length === 0) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
          <h2 className="text-lg font-semibold text-center flex-1">{title}</h2>
          <div className="w-7" /> {/* Spacer for centering */}
        </div>

        {/* Scrollable Items List */}
        <div className="max-h-[60vh] overflow-y-auto">
          {items.map((item, index) => {
            const isAdded = addedItemIds.includes(item.id)
            
            return (
              <div
                key={item.id}
                className={`flex items-center gap-4 p-4 ${
                  index < items.length - 1 ? "border-b" : ""
                }`}
              >
                {/* Item Photo */}
                <div className="relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                  {item.image_url ? (
                    <Image
                      src={item.image_url}
                      alt={item.name}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100">
                      <UtensilsCrossed className="h-6 w-6 text-gray-400" />
                    </div>
                  )}
                </div>

                {/* Item Details */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900">{item.name}</h3>
                  <p className="text-sm font-medium text-gray-900">
                    ${item.price.toFixed(2)}
                  </p>
                  {item.description && (
                    <p className="text-sm text-gray-500 line-clamp-2 mt-0.5">
                      {item.description}
                    </p>
                  )}
                </div>

                {/* Add/Added Button */}
                <button
                  onClick={() => onAddItem(item)}
                  className={`flex-shrink-0 w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${
                    isAdded
                      ? "bg-green-500 border-green-500 text-white"
                      : "border-gray-300 text-gray-600 hover:border-gray-400"
                  }`}
                  aria-label={isAdded ? "Agregado" : "Agregar"}
                >
                  {isAdded ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <Plus className="h-5 w-5" />
                  )}
                </button>
              </div>
            )
          })}
        </div>

        {/* Skip Button */}
        <div className="p-4 border-t bg-white">
          <Button
            onClick={onSkip}
            className="w-full bg-black hover:bg-gray-800 text-white py-6 text-base font-medium"
          >
            {addedItemIds.length > 0 ? "Continuar" : "Omitir"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
