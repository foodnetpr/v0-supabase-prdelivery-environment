"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  Phone, Search, RefreshCw, Truck, Clock, CheckCircle, XCircle, 
  AlertCircle, ChefHat, Package, Send, MoreVertical, Eye, Edit,
  DollarSign, MapPin, User, Calendar, LogOut, Store, Menu as MenuIcon,
  ExternalLink, Building2
} from "lucide-react"
import Link from "next/link"
import { format, formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"

type Order = {
  id: string
  order_number: string
  customer_name: string
  customer_phone: string
  customer_email: string
  delivery_type: string
  delivery_address: string
  delivery_city: string
  delivery_state: string
  delivery_zip: string
  delivery_date: string
  special_instructions: string
  status: string
  total: number
  subtotal: number
  tax: number
  delivery_fee: number
  tip: number
  created_at: string
  updated_at: string
  printed_at: string | null
  shipday_order_id: string | null
  order_source: string | null
  restaurant_id: string
  branch_id: string | null
  stripe_payment_intent_id: string | null
  order_items: Array<{
    id: string
    item_name: string
    quantity: number
    unit_price: number
    total_price: number
    selected_options: any
  }>
  restaurants: {
    id: string
    name: string
    slug: string
    logo_url: string | null
    shipday_api_key: string | null
  } | null
}

type Restaurant = {
  id: string
  name: string
  slug: string
  logo_url: string | null
  shipday_api_key: string | null
}

interface CSRDispatchClientProps {
  initialOrders: Order[]
  restaurants: Restaurant[]
}

const STATUS_CONFIG = {
  pending: { label: "Pendiente", color: "bg-yellow-500", icon: Clock },
  confirmed: { label: "Confirmado", color: "bg-blue-500", icon: CheckCircle },
  preparing: { label: "Preparando", color: "bg-orange-500", icon: ChefHat },
  ready: { label: "Listo", color: "bg-green-500", icon: Package },
  out_for_delivery: { label: "En Camino", color: "bg-purple-500", icon: Truck },
  completed: { label: "Completado", color: "bg-gray-500", icon: CheckCircle },
  cancelled: { label: "Cancelado", color: "bg-red-500", icon: XCircle },
}

export function CSRDispatchClient({ initialOrders, restaurants }: CSRDispatchClientProps) {
  const supabase = createClient()
  const [orders, setOrders] = useState<Order[]>(initialOrders)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [restaurantFilter, setRestaurantFilter] = useState<string>("all")
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [showOrderModal, setShowOrderModal] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelReason, setCancelReason] = useState("")
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null)
  const [shipdayStatus, setShipdayStatus] = useState<Record<string, any>>({})

  // Real-time subscription for order updates
  useEffect(() => {
    const channel = supabase
      .channel("csr_dispatch_orders")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        async (payload) => {
          if (payload.eventType === "INSERT") {
            // Fetch the full order with relations
            const { data: newOrder } = await supabase
              .from("orders")
              .select(`
                *,
                order_items (id, item_name, quantity, unit_price, total_price, selected_options),
                restaurants (id, name, slug, logo_url, shipday_api_key)
              `)
              .eq("id", payload.new.id)
              .single()
            
            if (newOrder) {
              setOrders(prev => [newOrder as Order, ...prev])
            }
          } else if (payload.eventType === "UPDATE") {
            setOrders(prev => prev.map(order => 
              order.id === payload.new.id 
                ? { ...order, ...payload.new }
                : order
            ))
          } else if (payload.eventType === "DELETE") {
            setOrders(prev => prev.filter(order => order.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  // Refresh orders
  const refreshOrders = useCallback(async () => {
    setIsRefreshing(true)
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayStr = today.toISOString().split('T')[0]

      const { data } = await supabase
        .from("orders")
        .select(`
          *,
          order_items (id, item_name, quantity, unit_price, total_price, selected_options),
          restaurants (id, name, slug, logo_url, shipday_api_key)
        `)
        .gte("delivery_date", todayStr)
        .order("created_at", { ascending: false })
        .limit(100)

      if (data) {
        setOrders(data as Order[])
      }
    } catch (error) {
      console.error("Error refreshing orders:", error)
    } finally {
      setIsRefreshing(false)
    }
  }, [supabase])

  // Update order status
  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    setUpdatingOrderId(orderId)
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", orderId)

      if (error) throw error

      setOrders(prev => prev.map(order =>
        order.id === orderId ? { ...order, status: newStatus } : order
      ))
    } catch (error) {
      console.error("Error updating order status:", error)
      alert("Error al actualizar el estado de la orden")
    } finally {
      setUpdatingOrderId(null)
    }
  }

  // Cancel order with reason
  const cancelOrder = async () => {
    if (!selectedOrder || !cancelReason.trim()) return

    setUpdatingOrderId(selectedOrder.id)
    try {
      const { error } = await supabase
        .from("orders")
        .update({ 
          status: "cancelled", 
          special_instructions: `${selectedOrder.special_instructions || ""}\n[CANCELADO: ${cancelReason}]`.trim(),
          updated_at: new Date().toISOString() 
        })
        .eq("id", selectedOrder.id)

      if (error) throw error

      setOrders(prev => prev.map(order =>
        order.id === selectedOrder.id ? { ...order, status: "cancelled" } : order
      ))
      setShowCancelModal(false)
      setShowOrderModal(false)
      setCancelReason("")
      setSelectedOrder(null)
    } catch (error) {
      console.error("Error cancelling order:", error)
      alert("Error al cancelar la orden")
    } finally {
      setUpdatingOrderId(null)
    }
  }

  // Send order to Shipday
  const sendToShipday = async (order: Order) => {
    setUpdatingOrderId(order.id)
    try {
      const response = await fetch("/api/shipday/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          restaurantId: order.restaurant_id,
          branchId: order.branch_id,
        }),
      })

      const result = await response.json()

      if (result.success) {
        // Update local state with Shipday ID
        setOrders(prev => prev.map(o =>
          o.id === order.id ? { ...o, shipday_order_id: result.shipdayOrderId } : o
        ))
        alert(`Orden enviada a Shipday. ID: ${result.shipdayOrderId}`)
      } else {
        throw new Error(result.error || "Error sending to Shipday")
      }
    } catch (error) {
      console.error("Error sending to Shipday:", error)
      alert(`Error al enviar a Shipday: ${(error as Error).message}`)
    } finally {
      setUpdatingOrderId(null)
    }
  }

  // Get Shipday tracking info
  const getShipdayStatus = async (orderId: string, shipdayOrderId: string) => {
    try {
      const response = await fetch(`/api/shipday/track?orderId=${shipdayOrderId}`)
      const result = await response.json()
      
      if (result.success) {
        setShipdayStatus(prev => ({
          ...prev,
          [orderId]: result.tracking
        }))
      }
    } catch (error) {
      console.error("Error fetching Shipday status:", error)
    }
  }

  // Filter orders
  const filteredOrders = orders.filter(order => {
    // Status filter
    if (statusFilter !== "all" && order.status !== statusFilter) return false
    
    // Restaurant filter
    if (restaurantFilter !== "all" && order.restaurant_id !== restaurantFilter) return false
    
    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      return (
        order.order_number?.toLowerCase().includes(search) ||
        order.customer_name?.toLowerCase().includes(search) ||
        order.customer_phone?.includes(search) ||
        order.restaurants?.name?.toLowerCase().includes(search)
      )
    }
    
    return true
  })

  // Count orders by status
  const statusCounts = {
    all: orders.length,
    pending: orders.filter(o => o.status === "pending").length,
    confirmed: orders.filter(o => o.status === "confirmed").length,
    preparing: orders.filter(o => o.status === "preparing").length,
    ready: orders.filter(o => o.status === "ready").length,
    out_for_delivery: orders.filter(o => o.status === "out_for_delivery").length,
    completed: orders.filter(o => o.status === "completed").length,
    cancelled: orders.filter(o => o.status === "cancelled").length,
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = "/auth/login"
  }

  const openOrderDetail = (order: Order) => {
    setSelectedOrder(order)
    setShowOrderModal(true)
    // If order has Shipday ID, fetch tracking info
    if (order.shipday_order_id) {
      getShipdayStatus(order.id, order.shipday_order_id)
    }
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <header className="bg-slate-800 text-white px-4 py-3 sticky top-0 z-50">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-teal-400" />
              <span className="font-semibold text-lg">CSR Dispatch</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/csr/order">
              <Button className="bg-teal-600 hover:bg-teal-700 text-white gap-2">
                <Phone className="h-4 w-4" />
                Tomar Orden por Teléfono
              </Button>
            </Link>
            <Link href="/csr/menus" className="text-sm text-slate-400 hover:text-white">
              Editar Menús
            </Link>
            <Link href="/csr/internal-shop" className="text-sm text-slate-400 hover:text-white">
              Tienda Interna
            </Link>
            <Link href="/super-admin" className="text-sm text-slate-400 hover:text-white">
              Admin
            </Link>
            <button onClick={handleLogout} className="text-sm text-slate-400 hover:text-white flex items-center gap-1">
              <LogOut className="w-4 h-4" />
              Salir
            </button>
          </div>
        </div>
      </header>

      {/* Filters */}
      <div className="bg-white border-b px-4 py-3 sticky top-[52px] z-40">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar por orden, cliente, teléfono..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Restaurant Filter */}
          <select
            value={restaurantFilter}
            onChange={(e) => setRestaurantFilter(e.target.value)}
            className="h-10 px-3 rounded-md border border-input bg-background text-sm"
          >
            <option value="all">Todos los Restaurantes</option>
            {restaurants.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>

          {/* Refresh */}
          <Button
            variant="outline"
            size="icon"
            onClick={refreshOrders}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {/* Status Tabs */}
        <div className="max-w-7xl mx-auto mt-3">
          <Tabs value={statusFilter} onValueChange={setStatusFilter}>
            <TabsList className="h-auto flex-wrap">
              <TabsTrigger value="all" className="gap-1">
                Todas <Badge variant="secondary" className="ml-1">{statusCounts.all}</Badge>
              </TabsTrigger>
              <TabsTrigger value="pending" className="gap-1">
                <Clock className="h-3 w-3" /> Pendientes <Badge variant="secondary" className="ml-1 bg-yellow-100 text-yellow-800">{statusCounts.pending}</Badge>
              </TabsTrigger>
              <TabsTrigger value="confirmed" className="gap-1">
                <CheckCircle className="h-3 w-3" /> Confirmadas <Badge variant="secondary" className="ml-1 bg-blue-100 text-blue-800">{statusCounts.confirmed}</Badge>
              </TabsTrigger>
              <TabsTrigger value="preparing" className="gap-1">
                <ChefHat className="h-3 w-3" /> Preparando <Badge variant="secondary" className="ml-1 bg-orange-100 text-orange-800">{statusCounts.preparing}</Badge>
              </TabsTrigger>
              <TabsTrigger value="ready" className="gap-1">
                <Package className="h-3 w-3" /> Listas <Badge variant="secondary" className="ml-1 bg-green-100 text-green-800">{statusCounts.ready}</Badge>
              </TabsTrigger>
              <TabsTrigger value="out_for_delivery" className="gap-1">
                <Truck className="h-3 w-3" /> En Camino <Badge variant="secondary" className="ml-1 bg-purple-100 text-purple-800">{statusCounts.out_for_delivery}</Badge>
              </TabsTrigger>
              <TabsTrigger value="completed" className="gap-1">
                Completadas <Badge variant="secondary" className="ml-1">{statusCounts.completed}</Badge>
              </TabsTrigger>
              <TabsTrigger value="cancelled" className="gap-1">
                <XCircle className="h-3 w-3" /> Canceladas <Badge variant="secondary" className="ml-1 bg-red-100 text-red-800">{statusCounts.cancelled}</Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Orders Grid */}
      <div className="max-w-7xl mx-auto p-4">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No hay órdenes que mostrar</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredOrders.map(order => {
              const config = STATUS_CONFIG[order.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending
              const StatusIcon = config.icon
              const isSentToRestaurant = !!order.printed_at || order.status !== "pending"
              const isSentToShipday = !!order.shipday_order_id
              const tracking = shipdayStatus[order.id]

              return (
                <Card 
                  key={order.id} 
                  className={`p-4 cursor-pointer hover:shadow-md transition-shadow ${
                    updatingOrderId === order.id ? "opacity-50 pointer-events-none" : ""
                  }`}
                  onClick={() => openOrderDetail(order)}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-lg">#{order.order_number?.slice(-6) || order.id.slice(0, 6)}</span>
                        <Badge className={`${config.color} text-white text-[10px]`}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {config.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-600 flex items-center gap-1 mt-1">
                        <Building2 className="h-3 w-3" />
                        {order.restaurants?.name || "Restaurante"}
                      </p>
                    </div>
                    <Badge variant={order.delivery_type === "delivery" ? "default" : "secondary"}>
                      {order.delivery_type === "delivery" ? (
                        <><Truck className="h-3 w-3 mr-1" /> Delivery</>
                      ) : (
                        <><Package className="h-3 w-3 mr-1" /> Pickup</>
                      )}
                    </Badge>
                  </div>

                  {/* Customer Info */}
                  <div className="space-y-1 text-sm mb-3">
                    <p className="flex items-center gap-2">
                      <User className="h-3 w-3 text-slate-400" />
                      <span className="font-medium">{order.customer_name}</span>
                    </p>
                    <p className="flex items-center gap-2 text-slate-600">
                      <Phone className="h-3 w-3 text-slate-400" />
                      {order.customer_phone}
                    </p>
                    {order.delivery_type === "delivery" && order.delivery_address && (
                      <p className="flex items-start gap-2 text-slate-600">
                        <MapPin className="h-3 w-3 text-slate-400 mt-0.5" />
                        <span className="line-clamp-2">{order.delivery_address}, {order.delivery_city}</span>
                      </p>
                    )}
                  </div>

                  {/* Order Details */}
                  <div className="flex items-center justify-between text-sm mb-3">
                    <span className="text-slate-600">
                      <Calendar className="h-3 w-3 inline mr-1" />
                      {format(new Date(order.delivery_date), "d MMM", { locale: es })}
                    </span>
                    <span className="font-bold text-lg">${order.total?.toFixed(2)}</span>
                  </div>

                  {/* Transmission Status */}
                  <div className="flex items-center gap-2 text-xs border-t pt-3">
                    <div className={`flex items-center gap-1 px-2 py-1 rounded ${
                      isSentToRestaurant ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                    }`}>
                      <Store className="h-3 w-3" />
                      {isSentToRestaurant ? "Enviado a Restaurante" : "Pendiente"}
                    </div>
                    {order.delivery_type === "delivery" && (
                      <div className={`flex items-center gap-1 px-2 py-1 rounded ${
                        isSentToShipday ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"
                      }`}>
                        <Truck className="h-3 w-3" />
                        {isSentToShipday ? "En Shipday" : "Sin Enviar"}
                      </div>
                    )}
                  </div>

                  {/* Shipday Tracking (if available) */}
                  {tracking && (
                    <div className="mt-2 p-2 bg-purple-50 rounded text-xs">
                      <p className="font-medium text-purple-800">
                        Driver: {tracking.driverName || "Asignando..."}
                      </p>
                      {tracking.eta && (
                        <p className="text-purple-600">ETA: {tracking.eta}</p>
                      )}
                    </div>
                  )}

                  {/* Quick Actions */}
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                    {order.status === "pending" && (
                      <Button
                        size="sm"
                        className="flex-1 bg-blue-600 hover:bg-blue-700"
                        onClick={(e) => { e.stopPropagation(); updateOrderStatus(order.id, "confirmed") }}
                      >
                        Confirmar
                      </Button>
                    )}
                    {order.status === "confirmed" && (
                      <Button
                        size="sm"
                        className="flex-1 bg-orange-600 hover:bg-orange-700"
                        onClick={(e) => { e.stopPropagation(); updateOrderStatus(order.id, "preparing") }}
                      >
                        <ChefHat className="h-3 w-3 mr-1" /> Preparando
                      </Button>
                    )}
                    {order.status === "preparing" && (
                      <Button
                        size="sm"
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        onClick={(e) => { e.stopPropagation(); updateOrderStatus(order.id, "ready") }}
                      >
                        <Package className="h-3 w-3 mr-1" /> Listo
                      </Button>
                    )}
                    {order.status === "ready" && order.delivery_type === "delivery" && !order.shipday_order_id && (
                      <Button
                        size="sm"
                        className="flex-1 bg-purple-600 hover:bg-purple-700"
                        onClick={(e) => { e.stopPropagation(); sendToShipday(order) }}
                      >
                        <Send className="h-3 w-3 mr-1" /> Enviar a Shipday
                      </Button>
                    )}
                    {(order.status === "ready" || order.status === "out_for_delivery") && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={(e) => { e.stopPropagation(); updateOrderStatus(order.id, "completed") }}
                      >
                        <CheckCircle className="h-3 w-3 mr-1" /> Completar
                      </Button>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      <Dialog open={showOrderModal} onOpenChange={setShowOrderModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedOrder && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  <span>Orden #{selectedOrder.order_number?.slice(-6) || selectedOrder.id.slice(0, 6)}</span>
                  <Badge className={`${STATUS_CONFIG[selectedOrder.status as keyof typeof STATUS_CONFIG]?.color || "bg-gray-500"} text-white`}>
                    {STATUS_CONFIG[selectedOrder.status as keyof typeof STATUS_CONFIG]?.label || selectedOrder.status}
                  </Badge>
                </DialogTitle>
                <DialogDescription>
                  {selectedOrder.restaurants?.name} • {format(new Date(selectedOrder.created_at), "d MMM yyyy, h:mm a", { locale: es })}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Customer Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Cliente</h4>
                    <p className="text-sm">{selectedOrder.customer_name}</p>
                    <p className="text-sm text-slate-600">{selectedOrder.customer_phone}</p>
                    <p className="text-sm text-slate-600">{selectedOrder.customer_email}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm mb-2">
                      {selectedOrder.delivery_type === "delivery" ? "Dirección de Entrega" : "Pickup"}
                    </h4>
                    {selectedOrder.delivery_type === "delivery" ? (
                      <p className="text-sm text-slate-600">
                        {selectedOrder.delivery_address}<br />
                        {selectedOrder.delivery_city}, {selectedOrder.delivery_state} {selectedOrder.delivery_zip}
                      </p>
                    ) : (
                      <p className="text-sm text-slate-600">Recoger en el restaurante</p>
                    )}
                  </div>
                </div>

                {/* Order Items */}
                <div>
                  <h4 className="font-semibold text-sm mb-2">Items ({selectedOrder.order_items?.length || 0})</h4>
                  <div className="space-y-2 bg-slate-50 rounded p-3">
                    {selectedOrder.order_items?.map(item => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span>
                          <span className="font-medium text-blue-600">{item.quantity}x</span> {item.item_name}
                        </span>
                        <span className="text-slate-600">${item.total_price?.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Special Instructions */}
                {selectedOrder.special_instructions && (
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Instrucciones Especiales</h4>
                    <p className="text-sm bg-yellow-50 p-3 rounded">{selectedOrder.special_instructions}</p>
                  </div>
                )}

                {/* Totals */}
                <div className="border-t pt-3">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>${selectedOrder.subtotal?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>IVU</span>
                    <span>${selectedOrder.tax?.toFixed(2)}</span>
                  </div>
                  {selectedOrder.delivery_type === "delivery" && (
                    <div className="flex justify-between text-sm">
                      <span>Delivery</span>
                      <span>${selectedOrder.delivery_fee?.toFixed(2)}</span>
                    </div>
                  )}
                  {selectedOrder.tip > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>Propina</span>
                      <span>${selectedOrder.tip?.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-lg mt-2 pt-2 border-t">
                    <span>Total</span>
                    <span>${selectedOrder.total?.toFixed(2)}</span>
                  </div>
                </div>

                {/* Transmission Status */}
                <div className="border-t pt-3">
                  <h4 className="font-semibold text-sm mb-2">Estado de Transmisión</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div className={`p-3 rounded text-center ${
                      selectedOrder.printed_at || selectedOrder.status !== "pending"
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}>
                      <Store className="h-5 w-5 mx-auto mb-1" />
                      <p className="text-xs font-medium">
                        {selectedOrder.printed_at || selectedOrder.status !== "pending"
                          ? "Enviado a Restaurante"
                          : "Pendiente de Envío"}
                      </p>
                    </div>
                    {selectedOrder.delivery_type === "delivery" && (
                      <div className={`p-3 rounded text-center ${
                        selectedOrder.shipday_order_id
                          ? "bg-green-100 text-green-700"
                          : "bg-slate-100 text-slate-600"
                      }`}>
                        <Truck className="h-5 w-5 mx-auto mb-1" />
                        <p className="text-xs font-medium">
                          {selectedOrder.shipday_order_id
                            ? `Shipday: ${selectedOrder.shipday_order_id}`
                            : "No enviado a Shipday"}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Shipday Tracking */}
                {shipdayStatus[selectedOrder.id] && (
                  <div className="bg-purple-50 p-4 rounded">
                    <h4 className="font-semibold text-sm mb-2 text-purple-800">Tracking Shipday</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-purple-600">Driver:</span>
                        <p className="font-medium">{shipdayStatus[selectedOrder.id].driverName || "Asignando..."}</p>
                      </div>
                      <div>
                        <span className="text-purple-600">Estado:</span>
                        <p className="font-medium">{shipdayStatus[selectedOrder.id].status || "Pendiente"}</p>
                      </div>
                      {shipdayStatus[selectedOrder.id].eta && (
                        <div>
                          <span className="text-purple-600">ETA:</span>
                          <p className="font-medium">{shipdayStatus[selectedOrder.id].eta}</p>
                        </div>
                      )}
                      {shipdayStatus[selectedOrder.id].driverPhone && (
                        <div>
                          <span className="text-purple-600">Tel. Driver:</span>
                          <p className="font-medium">{shipdayStatus[selectedOrder.id].driverPhone}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <DialogFooter className="flex-col sm:flex-row gap-2">
                {selectedOrder.delivery_type === "delivery" && !selectedOrder.shipday_order_id && (
                  <Button
                    className="bg-purple-600 hover:bg-purple-700"
                    onClick={() => sendToShipday(selectedOrder)}
                    disabled={updatingOrderId === selectedOrder.id}
                  >
                    <Send className="h-4 w-4 mr-2" /> Enviar a Shipday
                  </Button>
                )}
                <Button
                  variant="destructive"
                  onClick={() => setShowCancelModal(true)}
                  disabled={selectedOrder.status === "cancelled" || selectedOrder.status === "completed"}
                >
                  <XCircle className="h-4 w-4 mr-2" /> Cancelar Orden
                </Button>
                <Button variant="outline" onClick={() => setShowOrderModal(false)}>
                  Cerrar
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Modal */}
      <Dialog open={showCancelModal} onOpenChange={setShowCancelModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar Orden</DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. Por favor indica la razón de la cancelación.
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Razón de cancelación..."
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelModal(false)}>
              Volver
            </Button>
            <Button
              variant="destructive"
              onClick={cancelOrder}
              disabled={!cancelReason.trim() || updatingOrderId === selectedOrder?.id}
            >
              Confirmar Cancelación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
