"use client"

import { useEffect, useState } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Bell, Check, Clock, Printer, X, ArrowRightLeft, Truck } from "lucide-react"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { transferOrder } from "@/app/[slug]/admin/actions"
import { format } from "date-fns"

type Order = {
  id: string
  order_number: string
  customer_name: string
  customer_phone: string
  delivery_type: string
  delivery_address: string
  delivery_city: string
  delivery_state: string
  delivery_zip: string
  delivery_date: string
  special_instructions: string
  status: string
  total: number
  created_at: string
  order_items: Array<{
    id: string
    item_name: string
    quantity: number
    selected_options: any
  }>
}

type Restaurant = {
  id: string
  name: string
  slug: string
}

export function OrdersDisplay({
  restaurant,
  initialOrders,
  branches = [],
  isSuperAdmin = false,
}: {
  restaurant: Restaurant
  initialOrders: Order[]
  branches?: Array<{ id: string; name: string; city?: string }>
  isSuperAdmin?: boolean
}) {
  const [orders, setOrders] = useState<Order[]>(initialOrders)
  const [filter, setFilter] = useState<string>("all")
  const [playSound, setPlaySound] = useState(true)
  const [transferDialog, setTransferDialog] = useState<{ open: boolean; orderId: string; targetBranchId: string; reason: string }>({ open: false, orderId: "", targetBranchId: "", reason: "" })
  const [shipdaySending, setShipdaySending] = useState<string | null>(null)
  const [shipdayStatus, setShipdayStatus] = useState<Record<string, { status: "success" | "error"; message: string }>>({})
  const supabase = createBrowserClient()

  const handleSendToShipday = async (orderId: string) => {
    setShipdaySending(orderId)
    try {
      const res = await fetch("/api/shipday/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId: restaurant.id,
          orderId,
          mode: "send",
        }),
      })
      const data = await res.json()
      if (data.success) {
        setShipdayStatus((prev) => ({ ...prev, [orderId]: { status: "success", message: `Sent! Shipday ID: ${data.shipdayOrderId}` } }))
      } else {
        setShipdayStatus((prev) => ({ ...prev, [orderId]: { status: "error", message: data.error || "Failed" } }))
      }
    } catch (err) {
      setShipdayStatus((prev) => ({ ...prev, [orderId]: { status: "error", message: err instanceof Error ? err.message : "Error" } }))
    }
    setShipdaySending(null)
  }

  useEffect(() => {
    const channel = supabase
      .channel("orders_channel")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `restaurant_id=eq.${restaurant.id}`,
        },
        async (payload) => {
          if (payload.eventType === "INSERT") {
            // Fetch the full order with items
            const { data: newOrder } = await supabase
              .from("orders")
              .select(
                `
                *,
                order_items (
                  id,
                  item_name,
                  quantity,
                  unit_price,
                  total_price,
                  selected_options
                )
              `,
              )
              .eq("id", payload.new.id)
              .single()

            if (newOrder) {
              setOrders((prev) => [newOrder, ...prev])
              // Play notification sound
              if (playSound) {
                const audio = new Audio("/notification.mp3")
                audio.play().catch(() => {})
              }
            }
          } else if (payload.eventType === "UPDATE") {
            setOrders((prev) =>
              prev.map((order) => (order.id === payload.new.id ? { ...order, ...payload.new } : order)),
            )
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [restaurant.id, supabase, playSound])

  const updateOrderStatus = async (orderId: string, status: string) => {
    const { error } = await supabase.from("orders").update({ status }).eq("id", orderId)

    if (error) {
      console.error("Error updating order status:", error)
    }
  }

  const handleTransferOrder = async () => {
    if (!transferDialog.targetBranchId) return
    try {
      const result = await transferOrder(transferDialog.orderId, transferDialog.targetBranchId, transferDialog.reason)
      setOrders((prev) => prev.filter((o) => o.id !== transferDialog.orderId))
      setTransferDialog({ open: false, orderId: "", targetBranchId: "", reason: "" })
      alert(`Orden transferida a ${result.targetBranchName}`)
    } catch (error: any) {
      alert(error.message || "Error al transferir")
    }
  }

  const filteredOrders = orders.filter((order) => {
    if (filter === "all") return true
    return order.status === filter
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500"
      case "preparing":
        return "bg-blue-500"
      case "ready":
        return "bg-green-500"
      case "completed":
        return "bg-gray-500"
      case "cancelled":
        return "bg-red-500"
      default:
        return "bg-gray-500"
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{restaurant.name}</h1>
          <p className="text-gray-600">Gestion de Pedidos</p>
        </div>
        <div className="flex gap-2">
          <Button variant={playSound ? "default" : "outline"} size="lg" onClick={() => setPlaySound(!playSound)}>
            <Bell className="mr-2 h-5 w-5" />
            {playSound ? "Sonido Activo" : "Sonido Inactivo"}
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="mb-6 flex gap-2 overflow-x-auto">
        {[
          { value: "all", label: "Todos" },
          { value: "pending", label: "Nuevos" },
          { value: "preparing", label: "Preparando" },
          { value: "ready", label: "Listos" },
          { value: "completed", label: "Completados" },
        ].map((tab) => (
          <Button
            key={tab.value}
            variant={filter === tab.value ? "default" : "outline"}
            size="lg"
            onClick={() => setFilter(tab.value)}
            className="text-lg"
          >
            {tab.label}
            <Badge className="ml-2" variant="secondary">
              {orders.filter((o) => (tab.value === "all" ? true : o.status === tab.value)).length}
            </Badge>
          </Button>
        ))}
      </div>

      {/* Orders Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredOrders.map((order) => (
          <Card key={order.id} className="p-6">
            {/* Order Header */}
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-2xl font-bold">#{order.order_number}</h3>
                <p className="text-sm text-gray-600">{format(new Date(order.created_at), "MMM d, h:mm a")}</p>
              </div>
              <Badge className={getStatusColor(order.status)}>
                {{ pending: "Pendiente", preparing: "Preparando", ready: "Listo", completed: "Completado", cancelled: "Cancelado" }[order.status] || order.status}
              </Badge>
            </div>

            {/* Customer Info */}
            <div className="mb-4 space-y-1">
              <p className="text-lg font-semibold">{order.customer_name}</p>
              <p className="text-sm text-gray-600">{order.customer_phone}</p>
              {order.delivery_type === "delivery" && (
                <p className="text-sm text-gray-600">
                  {order.delivery_address}, {order.delivery_city}, {order.delivery_state} {order.delivery_zip}
                </p>
              )}
              <p className="text-sm font-medium">
                {order.delivery_type === "delivery" ? "Entrega" : "Recogido"} el{" "}
                {format(new Date(order.delivery_date), "MMM d, yyyy")}
              </p>
            </div>

            {/* Order Items */}
            <div className="mb-4 space-y-2">
              {order.order_items?.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <div className="flex-1">
                    <span className="font-medium">
                      {item.quantity}x {item.item_name}
                    </span>
                    {item.selected_options && Object.keys(item.selected_options).length > 0 && (
                      <div className="ml-4 text-xs text-gray-600">
                        {Object.entries(item.selected_options).map(([key, value]) => (
                          <div key={key}>
                            {key}: {Array.isArray(value) ? value.join(", ") : String(value)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Special Instructions */}
            {order.special_instructions && (
              <div className="mb-4 rounded-md bg-yellow-50 p-3">
                <p className="text-sm font-medium text-yellow-900">Instrucciones Especiales:</p>
                <p className="text-sm text-yellow-800">{order.special_instructions}</p>
              </div>
            )}

            {/* Total */}
            <div className="mb-4 border-t pt-2">
              <p className="text-xl font-bold">Total: ${order.total.toFixed(2)}</p>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
              {order.status === "pending" && (
                <>
                  <Button size="lg" onClick={() => updateOrderStatus(order.id, "preparing")} className="text-base">
                    <Clock className="mr-2 h-4 w-4" />
                    Iniciar
                  </Button>
                  <Button
                    size="lg"
                    variant="destructive"
                    onClick={() => updateOrderStatus(order.id, "cancelled")}
                    className="text-base"
                  >
                    <X className="mr-2 h-4 w-4" />
                    Cancelar
                  </Button>
                </>
              )}
              {order.status === "preparing" && (
                <Button size="lg" className="col-span-2 text-base" onClick={() => updateOrderStatus(order.id, "ready")}>
                  <Check className="mr-2 h-4 w-4" />
                  Marcar Listo
                </Button>
              )}
              {order.status === "ready" && (
                <Button
                  size="lg"
                  className="col-span-2 text-base"
                  onClick={() => updateOrderStatus(order.id, "completed")}
                >
                  <Check className="mr-2 h-4 w-4" />
                  Completar
                </Button>
              )}
              {order.status === "completed" && (
                <Button size="lg" variant="outline" className="col-span-2 text-base bg-transparent" disabled>
                  Completado
                </Button>
              )}
            </div>

            {/* Shipday / Transfer / Print Buttons */}
            <div className="mt-2 flex flex-wrap gap-2">
              {order.delivery_type === "delivery" && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSendToShipday(order.id)}
                    disabled={shipdaySending === order.id || shipdayStatus[order.id]?.status === "success"}
                    className="gap-1"
                  >
                    <Truck className="h-4 w-4" />
                    {shipdaySending === order.id ? "Sending..." : shipdayStatus[order.id]?.status === "success" ? "Sent" : "Send to Shipday"}
                  </Button>
                  {shipdayStatus[order.id]?.status === "error" && (
                    <span className="text-xs text-red-600">{shipdayStatus[order.id]?.message}</span>
                  )}
                </div>
              )}
              {branches.length > 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 bg-transparent gap-1.5"
                  onClick={() => setTransferDialog({ open: true, orderId: order.id, targetBranchId: "", reason: "" })}
                >
                  <ArrowRightLeft className="h-3.5 w-3.5" />
                  Transferir
                </Button>
              )}
              <Button variant="outline" size="sm" className="flex-1 bg-transparent" onClick={() => window.print()}>
                <Printer className="mr-2 h-4 w-4" />
                Imprimir
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {filteredOrders.length === 0 && (
        <div className="flex h-64 items-center justify-center">
          <p className="text-xl text-gray-500">No hay pedidos para mostrar</p>
        </div>
      )}

      {/* Transfer Order Dialog */}
      <Dialog open={transferDialog.open} onOpenChange={(open) => setTransferDialog((prev) => ({ ...prev, open }))}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5" />
              Transferir Orden
            </DialogTitle>
            <DialogDescription>
              Selecciona la sucursal destino para transferir esta orden.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Sucursal Destino *</Label>
              <select
                value={transferDialog.targetBranchId}
                onChange={(e) => setTransferDialog((prev) => ({ ...prev, targetBranchId: e.target.value }))}
                className="w-full mt-1 border border-gray-300 rounded-md p-2 text-sm"
              >
                <option value="">Seleccionar sucursal...</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name} {b.city ? `- ${b.city}` : ""}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Razon (opcional)</Label>
              <Textarea
                value={transferDialog.reason}
                onChange={(e) => setTransferDialog((prev) => ({ ...prev, reason: e.target.value }))}
                placeholder="Ej: Cliente mas cerca de esta sucursal, capacidad, etc."
                rows={2}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferDialog({ open: false, orderId: "", targetBranchId: "", reason: "" })}>
              Cancelar
            </Button>
            <Button onClick={handleTransferOrder} className="gap-1.5">
              <ArrowRightLeft className="h-4 w-4" />
              Transferir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
