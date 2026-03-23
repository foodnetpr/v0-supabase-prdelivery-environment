"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Bell, BellOff, Check, Clock, Printer, X, ChefHat, 
  Maximize, Minimize, Volume2, VolumeX, Settings, Bluetooth,
  RefreshCw, Timer, Calendar, Truck, AlertCircle, FlaskConical, Plus, Trash2,
  ChevronDown, ChevronUp, Eye, Package
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { format, formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"

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
  shipday_order_id?: string | null
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
  logo_url?: string | null
  kds_admin_pin?: string | null
}

interface KDSBoardProps {
  restaurant: Restaurant
  branchId?: string | null
  branchName?: string | null
  initialOrders: Order[]
  onPrintOrder?: (order: Order) => void
  autoPrintEnabled?: boolean
  onAutoPrintChange?: (enabled: boolean) => void
}

export function KDSBoard({ restaurant, branchId, branchName, initialOrders, onPrintOrder, autoPrintEnabled = false, onAutoPrintChange }: KDSBoardProps) {
  const [orders, setOrders] = useState<Order[]>(initialOrders)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  // Use prop directly — no local copy that can diverge from parent state
  const autoPrint = autoPrintEnabled
  const [currentTime, setCurrentTime] = useState(new Date())
  const [activeView, setActiveView] = useState<"current" | "future">("current")
  const [updatingOrders, setUpdatingOrders] = useState<Set<string>>(new Set())
  const [testModeOpen, setTestModeOpen] = useState(false)
  const [creatingTestOrder, setCreatingTestOrder] = useState(false)
  // Admin exit gesture state
  const [showPinDialog, setShowPinDialog] = useState(false)
  const [pinInput, setPinInput] = useState("")
  const [pinError, setPinError] = useState(false)
  const [adminExitEnabled, setAdminExitEnabled] = useState(false)
  const tapCountRef = useRef(0)
  const lastTapTimeRef = useRef(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const supabase = createBrowserClient()

  // Test order templates
  const testOrderTemplates: Array<{ name: string; type: string; items: number; future?: boolean }> = [
    { name: "Orden Delivery Simple", type: "delivery", items: 2 },
    { name: "Orden Pickup Simple", type: "pickup", items: 1 },
    { name: "Orden Grande (5+ items)", type: "delivery", items: 6 },
    { name: "Orden para Manana", type: "delivery", items: 3, future: true },
  ]

  // Create a test order
  const createTestOrder = async (template: { name: string; type: string; items: number; future?: boolean }) => {
    setCreatingTestOrder(true)
    try {
      const deliveryDate = template.future 
        ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0]
      
      const testItems = [
        { name: "Mofongo con Pollo", price: 18.99 },
        { name: "Arroz con Gandules", price: 12.99 },
        { name: "Pernil Asado", price: 22.99 },
        { name: "Tostones", price: 6.99 },
        { name: "Ensalada Verde", price: 8.99 },
        { name: "Flan de Queso", price: 7.99 },
      ]

      const selectedItems = testItems.slice(0, template.items)
      const subtotal = selectedItems.reduce((sum, item) => sum + item.price, 0)

      // Generate a test order number (TEST-XXXXX format)
      const testOrderNumber = `TEST-${Math.floor(10000 + Math.random() * 90000)}`
      
      const orderData = {
        restaurant_id: restaurant.id,
        branch_id: branchId || null,
        order_number: testOrderNumber,
        customer_name: `Test Customer ${Math.floor(Math.random() * 1000)}`,
        customer_email: "test@example.com",
        customer_phone: "787-555-0123",
        delivery_type: template.type,
        delivery_date: deliveryDate,
        delivery_address: template.type === "delivery" ? "123 Test Street, San Juan, PR 00901" : null,
        delivery_city: template.type === "delivery" ? "San Juan" : null,
        delivery_state: template.type === "delivery" ? "PR" : null,
        delivery_zip: template.type === "delivery" ? "00901" : null,
        subtotal: subtotal,
        tax: subtotal * 0.115,
        delivery_fee: template.type === "delivery" ? 5.99 : 0,
        total: subtotal + (subtotal * 0.115) + (template.type === "delivery" ? 5.99 : 0),
        status: "pending",
        special_instructions: "[TEST ORDER] Para pruebas de KDS/impresora",
      }
      
      // Create the order
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert(orderData)
        .select()
        .single()

      if (orderError) throw orderError

      // Create order items
      const orderItems = selectedItems.map(item => ({
        order_id: order.id,
        item_name: item.name,
        quantity: Math.floor(Math.random() * 3) + 1,
        unit_price: item.price,
        total_price: item.price * (Math.floor(Math.random() * 3) + 1),
        selected_options: {},
      }))

      const { data: createdItems, error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems)
        .select()

      if (itemsError) throw itemsError

      // Manually add the order to local state (in case real-time doesn't pick it up)
      const completeOrder = {
        ...order,
        order_items: orderItems.map((item, idx) => ({
          ...item,
          id: createdItems?.[idx]?.id || `temp-${idx}`,
        })),
      }
      setOrders(prev => [completeOrder as Order, ...prev])

      // Play notification sound
      if (soundEnabled) {
        playNotificationSound()
      }

      // Auto-print test order if enabled
      // showPrintStatus is passed via onAutoPrintChange reuse — use alert as visible debug
      if (onPrintOrder) {
        if (autoPrint) {
          markOrderAsPrinted(order.id)
          onPrintOrder(completeOrder as Order)
        } else {
          // Visible feedback so we know autoPrint state on device
          alert(`AUTO-PRINT ESTADO: ${autoPrint} | autoPrintEnabled: ${autoPrintEnabled}`)
        }
      }
      
      // Close dialog after successful creation
      setTestModeOpen(false)
    } catch (error) {
      console.error("[v0] Error creating test order:", error)
      alert("Error creando orden de prueba: " + (error as Error).message)
    } finally {
      setCreatingTestOrder(false)
    }
  }

  // Delete all test orders
  const deleteTestOrders = async () => {
    try {
      // Find test orders by the special_instructions field
      const { data: testOrders } = await supabase
        .from("orders")
        .select("id")
        .eq("restaurant_id", restaurant.id)
        .like("special_instructions", "%[TEST ORDER]%")

      if (testOrders && testOrders.length > 0) {
        const orderIds = testOrders.map(o => o.id)
        
        // Delete order items first
        await supabase
          .from("order_items")
          .delete()
          .in("order_id", orderIds)
        
        // Delete orders
        await supabase
          .from("orders")
          .delete()
          .in("id", orderIds)
      }
    } catch (error) {
      console.error("Error deleting test orders:", error)
    }
  }

  // Helper to check if order is for today or in the past (current) vs future
  const isCurrentOrder = (order: Order) => {
    const orderDate = new Date(order.delivery_date)
    const today = new Date()
    // Set both to midnight for date-only comparison
    orderDate.setHours(0, 0, 0, 0)
    today.setHours(0, 0, 0, 0)
    return orderDate <= today
  }



  // Update time every second for order age display
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Fallback: Poll for new orders every 30 seconds in case realtime fails
  useEffect(() => {
    const fetchOrders = async () => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayStr = today.toISOString().split('T')[0]
      
      let query = supabase
        .from("orders")
        .select(`*, order_items (id, item_name, quantity, unit_price, total_price, selected_options)`)
        .eq("restaurant_id", restaurant.id)
        .in("status", ["pending", "preparing", "ready", "completed", "confirmed"])
        .gte("delivery_date", todayStr)
        .order("created_at", { ascending: false })

      // If branch filter is specified, only get orders for that branch
      if (branchId) {
        query = query.eq("branch_id", branchId)
      }

      const { data } = await query
      if (data) {
        setOrders(data)
      }
    }

    const pollInterval = setInterval(fetchOrders, 30000) // Poll every 30 seconds
    return () => clearInterval(pollInterval)
  }, [restaurant.id, branchId, supabase])

  // Real-time order subscription
  useEffect(() => {
    // Build filter - filter by branch if specified
    const filter = branchId 
      ? `branch_id=eq.${branchId}`
      : `restaurant_id=eq.${restaurant.id}`
    
    const channel = supabase
      .channel(`kds_orders_${branchId || restaurant.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: filter,
        },
        async (payload) => {
          if (payload.eventType === "INSERT") {
            // If filtering by branch, only accept orders for this specific branch
            if (branchId && payload.new.branch_id !== branchId) return
            
            const { data: newOrder } = await supabase
              .from("orders")
              .select(`*, order_items (id, item_name, quantity, unit_price, total_price, selected_options)`)
              .eq("id", payload.new.id)
              .single()

            if (newOrder) {
              setOrders((prev) => [newOrder, ...prev])
              if (soundEnabled) playNotificationSound()
              // Auto-print if enabled and order hasn't been printed yet
              if (autoPrint && onPrintOrder && !newOrder.printed_at) {
                markOrderAsPrinted(newOrder.id)
                onPrintOrder(newOrder)
              }
            }
          } else if (payload.eventType === "UPDATE") {
            setOrders((prev) =>
              prev.map((order) => (order.id === payload.new.id ? { ...order, ...payload.new } : order))
            )
          } else if (payload.eventType === "DELETE") {
            setOrders((prev) => prev.filter((order) => order.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [restaurant.id, branchId, supabase, soundEnabled, autoPrint, onPrintOrder])

  // Hidden admin exit gesture - tap logo 3 times rapidly to show PIN dialog
  const handleLogoTap = useCallback(() => {
    const now = Date.now()
    const timeSinceLastTap = now - lastTapTimeRef.current
    
    // Reset counter if more than 500ms between taps
    if (timeSinceLastTap > 500) {
      tapCountRef.current = 1
    } else {
      tapCountRef.current++
    }
    lastTapTimeRef.current = now
    
    // After 3 rapid taps, show PIN dialog
    if (tapCountRef.current >= 3) {
      tapCountRef.current = 0
      // Only show dialog if restaurant has a PIN configured
      if (restaurant.kds_admin_pin) {
        setShowPinDialog(true)
        setPinInput("")
        setPinError(false)
      } else {
        // No PIN configured - just enable exit mode
        setAdminExitEnabled(true)
      }
    }
  }, [restaurant.kds_admin_pin])

  // Verify PIN and enable admin exit
  const handlePinSubmit = useCallback(() => {
    if (pinInput === restaurant.kds_admin_pin) {
      setShowPinDialog(false)
      setAdminExitEnabled(true)
      setPinInput("")
      setPinError(false)
    } else {
      setPinError(true)
      setPinInput("")
    }
  }, [pinInput, restaurant.kds_admin_pin])

  // Disable admin exit after 30 seconds
  useEffect(() => {
    if (adminExitEnabled) {
      const timer = setTimeout(() => {
        setAdminExitEnabled(false)
      }, 30000) // 30 seconds to navigate away
      return () => clearTimeout(timer)
    }
  }, [adminExitEnabled])

  const playNotificationSound = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0
      audioRef.current.play().catch(() => {})
    }
  }

  // Mark order as printed in database (for deduplication across devices)
  const markOrderAsPrinted = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ printed_at: new Date().toISOString() })
        .eq("id", orderId)
        .is("printed_at", null) // Only update if not already printed
      
      if (error) {
        console.error("[v0] Error marking order as printed:", error)
      }
    } catch (error) {
      console.error("[v0] Error marking order as printed:", error)
    }
  }

  const updateOrderStatus = async (orderId: string, status: string, notifyShipday: boolean = false) => {
    setUpdatingOrders(prev => new Set(prev).add(orderId))
    
    // Find the order to check for shipday_order_id
    const order = orders.find(o => o.id === orderId)
    const hasShipdayOrder = order?.shipday_order_id
    
    // Optimistic UI update - move order immediately
    setOrders(prev => prev.map(o => 
      o.id === orderId ? { ...o, status } : o
    ))
    
    try {
      // If marking as ready and has a Shipday order, notify Shipday
      if (status === "ready" && notifyShipday && hasShipdayOrder) {
        const response = await fetch("/api/shipday/mark-ready", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId,
            restaurantId: restaurant.id,
            branchId: branchId || null,
          }),
        })
        const result = await response.json()
        if (!result.success) {
          // Don't revert - order is still ready, just log the Shipday error
          console.error("Shipday notification failed:", result.error)
        }
        // Also update the database status
        await supabase.from("orders").update({ status }).eq("id", orderId)
      } else {
        // Direct database update for other status changes
        const { data, error } = await supabase
          .from("orders")
          .update({ status })
          .eq("id", orderId)
          .select()
        
        if (error) {
          // Revert on error
          setOrders(prev => prev.map(order => 
            order.id === orderId ? { ...order, status: "pending" } : order
          ))
          alert("Error actualizando orden: " + error.message)
        }
      }
    } catch (error) {
      // Revert on error
      setOrders(prev => prev.map(order => 
        order.id === orderId ? { ...order, status: "pending" } : order
      ))
      alert("Error: " + (error as Error).message)
    } finally {
      setUpdatingOrders(prev => {
        const next = new Set(prev)
        next.delete(orderId)
        return next
      })
    }
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange)
  }, [])

  // Get order age in minutes for color coding
  const getOrderAge = (createdAt: string) => {
    const created = new Date(createdAt)
    const now = new Date()
    return Math.floor((now.getTime() - created.getTime()) / 60000)
  }

  // Color code based on order age
  const getAgeColor = (minutes: number, status: string) => {
    if (status === "completed" || status === "cancelled") return "border-gray-300"
    if (minutes > 30) return "border-red-500 bg-red-50"
    if (minutes > 20) return "border-orange-500 bg-orange-50"
    if (minutes > 10) return "border-yellow-500 bg-yellow-50"
    return "border-green-500 bg-green-50"
  }

  // Separate current vs future orders
  const currentOrders = orders.filter(o => isCurrentOrder(o))
  const futureOrders = orders.filter(o => !isCurrentOrder(o))

  // Group current orders by status
  const newOrders = currentOrders.filter((o) => o.status === "pending" || o.status === "confirmed")
  const preparingOrders = currentOrders.filter((o) => o.status === "preparing")
  const readyOrders = currentOrders.filter((o) => o.status === "ready")
  const completedOrders = currentOrders.filter((o) => o.status === "completed")

  // Group future orders by date
  const futureOrdersByDate = futureOrders.reduce((acc, order) => {
    const dateKey = format(new Date(order.delivery_date), "yyyy-MM-dd")
    if (!acc[dateKey]) acc[dateKey] = []
    acc[dateKey].push(order)
    return acc
  }, {} as Record<string, Order[]>)

  // Sort future dates
  const sortedFutureDates = Object.keys(futureOrdersByDate).sort()

  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set())

  const toggleOrderExpanded = (orderId: string) => {
    setExpandedOrders(prev => {
      const next = new Set(prev)
      if (next.has(orderId)) {
        next.delete(orderId)
      } else {
        next.add(orderId)
      }
      return next
    })
  }

  const OrderCard = ({ order, compact = false }: { order: Order; compact?: boolean }) => {
    const isUpdating = updatingOrders.has(order.id)
    const ageMinutes = getOrderAge(order.created_at)
    const ageColor = getAgeColor(ageMinutes, order.status)
    const isExpanded = expandedOrders.has(order.id)
    const itemCount = order.order_items?.reduce((sum, item) => sum + item.quantity, 0) || 0

    return (
      <Card className={`p-2 border-l-4 ${ageColor} shadow-sm`}>
        {/* Row 1: Order number prominently + timer */}
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-gray-900">#{order.order_number?.slice(-6) || order.id.slice(0, 6)}</span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${order.delivery_type === "delivery" ? "bg-blue-500 text-white" : "bg-purple-500 text-white"}`}>
              {order.delivery_type === "delivery" ? "DELIVERY" : "PICKUP"}
            </span>
          </div>
          <span className={`text-sm font-bold font-mono ${ageMinutes > 20 ? "text-red-600" : ageMinutes > 10 ? "text-orange-500" : "text-gray-600"}`}>
            {ageMinutes}m
          </span>
        </div>

        {/* Row 2: Date/Time + Item count toggle */}
        <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
          <span>{format(new Date(order.delivery_date), "d MMM", { locale: es })} {order.delivery_time || ""}</span>
          <button 
            type="button" 
            onClick={(e) => { e.stopPropagation(); toggleOrderExpanded(order.id) }} 
            className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-0.5"
          >
            {itemCount} items {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        </div>

        {/* Expanded: Items list */}
        {isExpanded && (
          <div className="bg-gray-50 rounded p-2 mb-2 space-y-1">
            {order.order_items?.map((item) => (
              <div key={item.id} className="flex items-start gap-2 text-xs">
                <span className="font-bold text-blue-600 min-w-[20px]">{item.quantity}x</span>
                <span className="text-gray-800">{item.item_name}</span>
              </div>
            ))}
            {order.special_instructions && !order.special_instructions.includes("[TEST ORDER]") && (
              <div className="mt-1 pt-1 border-t border-gray-200 text-xs text-orange-700 bg-orange-50 p-1 rounded">
                <strong>Nota:</strong> {order.special_instructions}
              </div>
            )}
          </div>
        )}

        {/* Action Buttons - compact row */}
        <div className="flex items-center gap-2">
          {(order.status === "pending" || order.status === "confirmed") && (
            <button
              type="button"
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs py-1.5 px-3 rounded font-medium flex items-center gap-1.5 disabled:opacity-50 transition-colors"
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); updateOrderStatus(order.id, "preparing") }}
              disabled={isUpdating}
            >
              <ChefHat className="h-3.5 w-3.5" />
              Preparar
            </button>
          )}
          {order.status === "preparing" && (
            <button
              type="button"
              className="bg-green-600 hover:bg-green-700 text-white text-xs py-1.5 px-3 rounded font-medium flex items-center gap-1.5 disabled:opacity-50 transition-colors"
              onClick={(e) => { e.stopPropagation(); updateOrderStatus(order.id, "ready", order.delivery_type === "delivery") }}
              disabled={isUpdating}
            >
              {isUpdating ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Listo
            </button>
          )}
          {order.status === "ready" && (
            <button
              type="button"
              className="bg-gray-700 hover:bg-gray-800 text-white text-xs py-1.5 px-3 rounded font-medium flex items-center gap-1.5 disabled:opacity-50 transition-colors"
              onClick={(e) => { e.stopPropagation(); updateOrderStatus(order.id, "completed") }}
              disabled={isUpdating}
            >
              <Check className="h-3.5 w-3.5" />
              {order.delivery_type === "delivery" ? "Entregado" : "Recogido"}
            </button>
          )}
          <div className="flex-1" />
          {onPrintOrder && (
            <button
              type="button"
              className="bg-gray-100 hover:bg-gray-200 text-gray-600 p-1.5 rounded transition-colors"
              onClick={(e) => { 
                e.stopPropagation()
                e.preventDefault()
                markOrderAsPrinted(order.id)
                onPrintOrder(order) 
              }}
              title="Imprimir"
            >
              <Printer className="h-4 w-4" />
            </button>
          )}
        </div>
      </Card>
    )
  }

  const Column = ({ title, orders, color, icon: Icon }: { title: string; orders: Order[]; color: string; icon: any }) => (
    <div className={`w-[24%] min-w-[180px] ${color} rounded-lg p-2 flex flex-col h-full flex-shrink-0`}>
      <div className="flex items-center justify-between mb-2 flex-shrink-0">
        <div className="flex items-center gap-1">
          <Icon className="h-4 w-4" />
          <h2 className="text-sm font-bold truncate">{title}</h2>
        </div>
        <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
          {orders.length}
        </Badge>
      </div>
      <div className="space-y-1.5 flex-1 overflow-y-auto" data-scrollable>
        {orders.map((order) => (
          <OrderCard key={order.id} order={order} />
        ))}
        {orders.length === 0 && (
          <div className="text-center py-4 text-gray-500">
            <p className="text-xs">No hay ordenes</p>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Hidden audio element */}
      <audio ref={audioRef} src="/notification.mp3" preload="auto" />

      {/* Header */}
      <div className="bg-gray-800 px-4 py-3 flex items-center justify-between border-b border-gray-700">
<div className="flex items-center gap-2">
            {/* Tappable logo area for hidden admin exit gesture */}
            <button
              type="button"
              onClick={handleLogoTap}
              className="flex items-center gap-2 focus:outline-none select-none"
              aria-label="Restaurant logo"
            >
              {restaurant.logo_url ? (
                <img 
                  src={restaurant.logo_url} 
                  alt={restaurant.name}
                  className="h-8 w-8 rounded object-cover flex-shrink-0"
                />
              ) : (
                <ChefHat className="h-6 w-6 text-orange-500 flex-shrink-0" />
              )}
            </button>
            <div>
              <h1 className="text-xl font-bold">
                {restaurant.name}
                {branchName && <span className="text-orange-400 ml-2">- {branchName}</span>}
                {adminExitEnabled && (
                  <span className="ml-2 text-xs bg-red-600 text-white px-2 py-0.5 rounded animate-pulse">
                    EXIT MODE (30s)
                  </span>
                )}
              </h1>
              <p className="text-sm text-gray-400">Kitchen Display System</p>
            </div>
          </div>

        <div className="flex items-center gap-2">
          {/* Order counts summary */}
          <div className="hidden md:flex items-center gap-3 mr-4 text-xs">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-yellow-500" />
              {newOrders.length}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              {preparingOrders.length}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              {readyOrders.length}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-gray-500" />
              {completedOrders.length}
            </span>
          </div>

          {/* Controls */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={soundEnabled ? "text-green-400" : "text-gray-500"}
          >
            {soundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onAutoPrintChange?.(!autoPrint)
            }}
            className={autoPrint ? "text-green-400" : "text-gray-500"}
            title={autoPrint ? "Auto-print ON" : "Auto-print OFF"}
          >
            <Printer className="h-5 w-5" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={toggleFullscreen}
            className="text-gray-300 hover:text-white"
          >
            {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.location.reload()}
            className="text-gray-300 hover:text-white"
          >
            <RefreshCw className="h-5 w-5" />
          </Button>

          {/* Test Mode Button */}
          <Dialog open={testModeOpen} onOpenChange={setTestModeOpen}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-purple-400 hover:text-purple-300 hover:bg-purple-900/30"
                title="Modo de Prueba"
              >
                <FlaskConical className="h-5 w-5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-900 border-gray-700 text-white">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FlaskConical className="h-5 w-5 text-purple-400" />
                  Modo de Prueba - KDS
                </DialogTitle>
                <DialogDescription className="text-gray-400">
                  Crea ordenes de prueba para verificar el funcionamiento del KDS, impresora y configuracion del tablet.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-3">
                  {testOrderTemplates.map((template, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      className="h-auto py-4 flex flex-col items-start gap-1 border-gray-700 hover:bg-gray-800 hover:border-purple-500"
                      onClick={() => createTestOrder(template)}
                      disabled={creatingTestOrder}
                    >
                      <span className="font-medium">{template.name}</span>
                      <span className="text-xs text-gray-400">
                        {template.type === "delivery" ? "Delivery" : "Pickup"} - {template.items} items
                        {template.future && " (Manana)"}
                      </span>
                    </Button>
                  ))}
                </div>

                <div className="border-t border-gray-700 pt-4">
                  <Button
                    variant="outline"
                    className="w-full gap-2 border-red-800 text-red-400 hover:bg-red-900/30 hover:text-red-300"
                    onClick={deleteTestOrders}
                  >
                    <Trash2 className="h-4 w-4" />
                    Eliminar Todas las Ordenes de Prueba
                  </Button>
                </div>

                {branchId && branchName && (
                  <div className="text-sm text-green-400 bg-green-900/20 p-3 rounded border border-green-800">
                    Las ordenes de prueba se crearan para: <strong>{branchName}</strong>
                  </div>
                )}

                <div className="text-xs text-gray-500 bg-gray-800/50 p-3 rounded">
                  <p className="font-medium text-gray-400 mb-1">Notas:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Las ordenes de prueba aparecen con la nota "[TEST ORDER]"</li>
                    <li>Puedes usar estas ordenes para probar la impresora y flujo de trabajo</li>
                    <li>Elimina las ordenes de prueba cuando termines la instalacion</li>
                  </ul>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Current time */}
          <div className="text-lg font-mono ml-4">
            {format(currentTime, "HH:mm:ss")}
          </div>
        </div>
      </div>

      {/* Main Content with Tabs */}
      <Tabs value={activeView} onValueChange={(v) => setActiveView(v as "current" | "future")} className="flex-1">
        <div className="px-4 pt-2 border-b border-gray-700">
          <TabsList className="bg-gray-800">
            <TabsTrigger value="current" className="data-[state=active]:bg-gray-700 gap-2">
              <Clock className="h-4 w-4" />
              Ordenes Actuales
              <Badge variant="secondary" className="ml-1">{currentOrders.filter(o => o.status !== "completed" && o.status !== "cancelled").length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="future" className="data-[state=active]:bg-gray-700 gap-2">
              <Calendar className="h-4 w-4" />
              Ordenes Futuras
              {futureOrders.length > 0 && (
                <Badge variant="outline" className="ml-1 border-orange-500 text-orange-400">{futureOrders.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Current Orders - 4 Columns */}
        <TabsContent value="current" className="m-0 p-4 h-[calc(100vh-140px)]">
          <div className="flex gap-3 overflow-x-auto h-full">
            <Column
              title="Nuevos"
              orders={newOrders}
              color="bg-yellow-900/30"
              icon={Bell}
            />
            <Column
              title="Preparando"
              orders={preparingOrders}
              color="bg-blue-900/30"
              icon={Clock}
            />
            <Column
              title="Listos"
              orders={readyOrders}
              color="bg-green-900/30"
              icon={Check}
            />
            <Column
              title="Entregados"
              orders={completedOrders}
              color="bg-gray-800/50"
              icon={Package}
            />
          </div>
        </TabsContent>

        {/* Future Orders - Grouped by Date */}
        <TabsContent value="future" className="m-0 p-4">
          {futureOrders.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <Calendar className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-xl">No hay ordenes programadas para fechas futuras</p>
            </div>
          ) : (
            <div className="space-y-6">
              {sortedFutureDates.map(dateKey => {
                const ordersForDate = futureOrdersByDate[dateKey]
                const dateObj = new Date(dateKey + "T12:00:00")
                return (
                  <div key={dateKey} className="bg-gray-800/50 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-700">
                      <Calendar className="h-6 w-6 text-orange-400" />
                      <h3 className="text-xl font-bold">
                        {format(dateObj, "EEEE, d 'de' MMMM", { locale: es })}
                      </h3>
                      <Badge variant="secondary">{ordersForDate.length} ordenes</Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {ordersForDate.map(order => (
                        <OrderCard key={order.id} order={order} compact />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
</TabsContent>
      </Tabs>

      {/* Admin Exit PIN Dialog */}
      <Dialog open={showPinDialog} onOpenChange={setShowPinDialog}>
        <DialogContent className="sm:max-w-md bg-gray-800 text-white border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Admin Exit</DialogTitle>
            <DialogDescription className="text-gray-400">
              Ingrese el PIN de administrador para habilitar la navegación
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="flex gap-2 justify-center">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((digit) => (
                <span key={digit} className="w-3 h-3 rounded-full bg-gray-600" />
              ))}
            </div>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              value={pinInput}
              onChange={(e) => {
                setPinError(false)
                setPinInput(e.target.value.replace(/\D/g, ''))
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handlePinSubmit()
              }}
              placeholder="Ingrese PIN"
              className={`w-full px-4 py-3 text-center text-2xl tracking-widest bg-gray-700 border rounded-lg focus:outline-none focus:ring-2 ${
                pinError 
                  ? 'border-red-500 focus:ring-red-500' 
                  : 'border-gray-600 focus:ring-orange-500'
              }`}
              autoFocus
            />
            {pinError && (
              <p className="text-red-400 text-sm text-center">PIN incorrecto. Intente de nuevo.</p>
            )}
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => {
                    setPinError(false)
                    setPinInput(prev => prev + digit)
                  }}
                  className="p-4 text-xl font-bold bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                >
                  {digit}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPinInput(prev => prev.slice(0, -1))}
                className="p-4 text-xl bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              >
                ←
              </button>
              <button
                type="button"
                onClick={() => {
                  setPinError(false)
                  setPinInput(prev => prev + '0')
                }}
                className="p-4 text-xl font-bold bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              >
                0
              </button>
              <button
                type="button"
                onClick={handlePinSubmit}
                className="p-4 text-xl bg-orange-600 hover:bg-orange-500 rounded-lg transition-colors"
              >
                OK
              </button>
            </div>
            <button
              type="button"
              onClick={() => setShowPinDialog(false)}
              className="w-full py-2 text-gray-400 hover:text-white transition-colors"
            >
              Cancelar
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
