"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Minus, Plus } from "lucide-react"
import { getBulkPluralLabel, getBulkSingularLabel } from "@/lib/selling-units"

interface BulkOrderItem {
  id: string
  name: string
  description: string
  per_unit_price: number
  min_quantity: number
  pricing_unit: string
  image_url?: string | null
  item_options?: any[]
}

interface BulkOrderModalProps {
  item: BulkOrderItem | null
  isOpen: boolean
  onClose: () => void
  onAdd: (quantity: number, varieties: any[]) => void
  primaryColor: string
}

export function BulkOrderModal({ item, isOpen, onClose, onAdd, primaryColor }: BulkOrderModalProps) {
  const [quantity, setQuantity] = useState(item?.min_quantity || 5)
  const [varieties, setVarieties] = useState<Record<string, number>>({})

  if (!item) return null

  const totalSelected = Object.values(varieties).reduce((sum, count) => sum + count, 0)
  const remaining = quantity - totalSelected
  const unitLabel = getBulkPluralLabel(item.pricing_unit)
  const unitSingular = getBulkSingularLabel(item.pricing_unit)
  const totalPrice = quantity * item.per_unit_price

  const incrementQuantity = () => {
    setQuantity((prev) => prev + (item.min_quantity || 5))
  }

  const decrementQuantity = () => {
    setQuantity((prev) => Math.max(item.min_quantity || 5, prev - (item.min_quantity || 5)))
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-4 border-b">
          <div className="flex items-start gap-4">
            {item.image_url && (
              <img
                src={item.image_url || "/placeholder.svg"}
                alt={item.name}
                className="w-20 h-20 object-cover rounded-lg"
              />
            )}
            <div className="flex-1">
              <DialogTitle className="text-2xl font-bold">{item.name}</DialogTitle>
              <p className="text-muted-foreground text-sm mt-1">{item.description}</p>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-bold">${item.per_unit_price.toFixed(2)}</span>
                <span className="text-sm text-muted-foreground">
                  / {unitSingular}
                </span>
                {item.min_quantity && (
                  <Badge variant="secondary" className="ml-2">
                    Min. {item.min_quantity} {unitLabel}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-1 py-6 space-y-6">
          {/* Quantity Selector */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Seleccionar cantidad:</Label>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={decrementQuantity}
                disabled={quantity <= (item.min_quantity || 5)}
              >
                <Minus className="w-4 h-4" />
              </Button>
              <div className="flex-1 text-center">
                <span className="text-xl font-bold">{quantity}</span>
                <span className="text-sm text-muted-foreground ml-2">{unitLabel}</span>
              </div>
              <Button variant="outline" size="icon" onClick={incrementQuantity}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Variety Selection (if item has options) */}
          {item.item_options && item.item_options.length > 0 && (
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Seleccionar variedades:</Label>
                <span className="text-sm text-muted-foreground">
                  {totalSelected} de {quantity} seleccionados
                  {remaining > 0 && <span className="text-amber-600 font-medium ml-1">({remaining} restantes)</span>}
                </span>
              </div>

              {item.item_options.map((option) => (
                <div key={option.id} className="space-y-3">
                  <Label className="text-sm font-medium text-muted-foreground">{option.category}</Label>
                  <div className="grid grid-cols-1 gap-2">
                    {option.item_option_choices
                      ?.filter((choice: any) => !choice.parent_choice_id)
                      .map((choice: any) => {
                        const count = varieties[choice.id] || 0
                        return (
                          <div
                            key={choice.id}
                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                          >
                            <div className="flex-1">
                              <span className="font-medium">{choice.name}</span>
                              {choice.price_modifier > 0 && (
                                <span style={{ color: primaryColor }} className="text-sm font-semibold ml-2">
                                  +${choice.price_modifier.toFixed(2)}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 bg-transparent"
                                onClick={() => {
                                  setVarieties((prev) => ({
                                    ...prev,
                                    [choice.id]: Math.max(0, (prev[choice.id] || 0) - 1),
                                  }))
                                }}
                                disabled={count === 0}
                              >
                                <Minus className="w-3 h-3" />
                              </Button>
                              <span className="w-8 text-center font-semibold">{count}</span>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 bg-transparent"
                                onClick={() => {
                                  if (totalSelected < quantity) {
                                    setVarieties((prev) => ({
                                      ...prev,
                                      [choice.id]: (prev[choice.id] || 0) + 1,
                                    }))
                                  }
                                }}
                                disabled={totalSelected >= quantity}
                              >
                                <Plus className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        )
                      })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-4">
          <div className="flex items-center justify-between w-full">
            <div>
              <div className="text-2xl font-bold">${totalPrice.toFixed(2)}</div>
              <div className="text-sm text-muted-foreground">
                ${item.per_unit_price.toFixed(2)} / {unitSingular}
              </div>
            </div>
            <Button
              style={{ backgroundColor: primaryColor }}
              className="text-white"
              size="lg"
              onClick={() => {
                const varietyArray = Object.entries(varieties).map(([choiceId, count]) => ({
                  choiceId,
                  count,
                }))
                onAdd(quantity, varietyArray)
                onClose()
              }}
              disabled={item.item_options && item.item_options.length > 0 && totalSelected !== quantity}
            >
              Agregar al Carrito
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
