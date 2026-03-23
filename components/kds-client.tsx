"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { KDSBoard } from "@/components/kds-board"
import { PrinterSettings } from "@/components/printer-settings"
import { bluetoothPrinter, PrinterStatus } from "@/lib/bluetooth-printer"
import { Button } from "@/components/ui/button"
import { Settings, X, Printer, WifiOff } from "lucide-react"

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

interface KDSClientProps {
  restaurant: {
    id: string
    name: string
    slug: string
    logo_url?: string | null
    kds_admin_pin?: string | null
  }
  branchId?: string | null
  branchName?: string | null
  initialOrders: Order[]
  accessToken?: string
}

// LocalStorage key for auto-print setting (per restaurant/branch)
const getAutoPrintKey = (restaurantId: string, branchId?: string | null) => 
  `kds_auto_print_${restaurantId}${branchId ? `_${branchId}` : ''}`

// LocalStorage/Cookie key for KDS session persistence (for PWA home screen launch)
// Cookie is read by middleware.ts to restore token before server component runs
const getKdsSessionKey = (slug: string) => `kds_session_${slug}`

export function KDSClient({ restaurant, branchId, branchName, initialOrders, accessToken }: KDSClientProps) {
  const [showSettings, setShowSettings] = useState(false)
  const [printerStatus, setPrinterStatus] = useState<PrinterStatus>({
    connected: false,
    name: null,
    id: null,
  })
  const [autoPrintEnabled, setAutoPrintEnabled] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  const [isPWA, setIsPWA] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Detect if running as PWA (standalone mode)
  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as any).standalone === true // iOS Safari
      || document.referrer.includes('android-app://');
    setIsPWA(isStandalone)
  }, [])

  // Persist KDS session to BOTH localStorage AND cookie for PWA home screen launches
  // Cookie is read by middleware.ts BEFORE server component runs (solves the race condition)
  // localStorage is kept as backup for any edge cases
  useEffect(() => {
    const sessionKey = getKdsSessionKey(restaurant.slug)
    
    if (accessToken) {
      // Save the full session when accessed with a valid token in URL
      const session = {
        token: accessToken,
        branchId: branchId || null,
        savedAt: new Date().toISOString()
      }
      
      // Save to localStorage (backup)
      localStorage.setItem(sessionKey, JSON.stringify(session))
      
      // Save to cookie (read by middleware.ts for PWA launches)
      // Cookie settings:
      // - Secure: only sent over HTTPS (required for production)
      // - SameSite=Lax: allows cookie on same-site navigations and top-level GET redirects
      //   (Strict would break the middleware redirect flow)
      // - path=/ so middleware can read it from any route
      // - 1 year expiry
      const cookieValue = encodeURIComponent(JSON.stringify(session))
      const maxAge = 365 * 24 * 60 * 60 // 1 year in seconds
      const isSecure = window.location.protocol === 'https:'
      const securePart = isSecure ? '; Secure' : ''
      document.cookie = `${sessionKey}=${cookieValue}; path=/; max-age=${maxAge}; SameSite=Lax${securePart}`
    }
    // Note: We no longer need client-side redirect logic here because
    // middleware.ts handles the token restoration BEFORE the page loads
  }, [accessToken, restaurant.slug, branchId])

  // Navigation prevention - warn before leaving
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // In PWA mode, be more aggressive about preventing navigation
      e.preventDefault()
      e.returnValue = '¿Seguro que deseas salir del KDS?'
      return '¿Seguro que deseas salir del KDS?'
    }

    // Prevent back button / swipe navigation on Android
    // This creates a "trap" in the history that absorbs back gestures
    const handlePopState = (e: PopStateEvent) => {
      // Push state back to prevent navigation - re-trap the back button
      window.history.pushState(null, '', window.location.href)
    }

    // Push multiple history entries to create a buffer for back gestures
    // This helps on Android where a single back might not trigger popstate
    // before the PWA closes
    window.history.pushState(null, '', window.location.href)
    window.history.pushState(null, '', window.location.href)
    
    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  // Prevent gestures that could close the app
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Prevent pull-to-refresh and edge swipes
    const handleTouchMove = (e: TouchEvent) => {
      // Allow scrolling within scrollable elements
      const target = e.target as HTMLElement
      const isScrollable = target.closest('[data-scrollable]') || 
                          target.closest('.overflow-auto') || 
                          target.closest('.overflow-y-auto')
      
      if (!isScrollable && e.touches.length === 1) {
        // Only prevent on edges (pull to refresh, edge swipe)
        const touch = e.touches[0]
        if (touch.clientY < 50 || touch.clientX < 20 || touch.clientX > window.innerWidth - 20) {
          e.preventDefault()
        }
      }
    }

    container.addEventListener('touchmove', handleTouchMove, { passive: false })

    return () => {
      container.removeEventListener('touchmove', handleTouchMove)
    }
  }, [])

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    
    setIsOnline(navigator.onLine)
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Load auto-print setting from localStorage on mount
  useEffect(() => {
    const key = getAutoPrintKey(restaurant.id, branchId)
    const saved = localStorage.getItem(key)
    if (saved === "true") {
      setAutoPrintEnabled(true)
    }
  }, [restaurant.id, branchId])

  // Handle auto-print toggle
  const handleAutoPrintChange = useCallback((enabled: boolean) => {
    const key = getAutoPrintKey(restaurant.id, branchId)
    localStorage.setItem(key, enabled ? "true" : "false")
    setAutoPrintEnabled(enabled)
  }, [restaurant.id, branchId])

  const handlePrintOrder = useCallback(async (order: Order) => {
    if (!printerStatus.connected) {
      // Try to print via browser if no Bluetooth printer
      window.print()
      return
    }

    try {
      // Print kitchen ticket with FOODNETPR branding
      const result = await bluetoothPrinter.printKitchenTicket(order, restaurant.name, branchName)
      if (!result.success) {
        console.error("Print failed:", result.error)
        // Fallback to browser print
        window.print()
      }
    } catch (error) {
      console.error("Print error:", error)
      window.print()
    }
  }, [printerStatus.connected, restaurant.name, branchName])

  return (
    <div 
      ref={containerRef}
      className="relative min-h-screen"
      style={{ touchAction: 'pan-y pinch-zoom' }}
    >
      {/* Offline indicator */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white py-2 px-4 flex items-center justify-center gap-2 text-sm font-medium">
          <WifiOff className="h-4 w-4" />
          Sin conexión - Los pedidos no se actualizarán hasta que se restaure la conexión
        </div>
      )}
      {/* Settings Panel */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Configuración KDS</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowSettings(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="p-4 space-y-4">
              <PrinterSettings onPrinterStatusChange={setPrinterStatus} />
              
              {/* Auto-print section */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Printer className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">Impresión Automática</span>
                    </div>
                    <p className="text-sm text-gray-500">
                      Imprimir automáticamente cuando lleguen nuevos pedidos
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={autoPrintEnabled}
                    onClick={() => handleAutoPrintChange(!autoPrintEnabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      autoPrintEnabled ? 'bg-green-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        autoPrintEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                {autoPrintEnabled && !printerStatus.connected && (
                  <p className="mt-2 text-sm text-amber-600 bg-amber-50 p-2 rounded">
                    Conecta una impresora Bluetooth para habilitar la impresión automática
                  </p>
                )}
                {autoPrintEnabled && printerStatus.connected && (
                  <p className="mt-2 text-sm text-green-600 bg-green-50 p-2 rounded">
                    Los nuevos pedidos se imprimirán automáticamente en {printerStatus.name || 'la impresora'}
                  </p>
                )}
              </div>
              
              {/* Session Management - for switching tablets or tokens */}
              <div className="border-t pt-4">
                <div className="space-y-2">
                  <h3 className="font-medium text-gray-700">Sesión del Dispositivo</h3>
                  <p className="text-sm text-gray-500">
                    Esta tablet está configurada para acceder al KDS. Si necesitas cambiar de cuenta o dispositivo, cierra la sesión.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                    // Clear session from localStorage and cookie
                    const sessionKey = getKdsSessionKey(restaurant.slug)
                    localStorage.removeItem(sessionKey)
                    // Clear cookie by setting it to expire immediately (both old path and new root path)
                    document.cookie = `${sessionKey}=; path=/; max-age=0`
                    document.cookie = `${sessionKey}=; path=/${restaurant.slug}/kds; max-age=0`
                      // Redirect to login
                      window.location.href = `/${restaurant.slug}`
                    }}
                    className="w-full px-4 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    Cerrar Sesión del KDS
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Button (floating) */}
      <Button
        className="fixed bottom-4 right-4 z-40 shadow-lg"
        size="lg"
        variant="secondary"
        onClick={() => setShowSettings(true)}
      >
        <Settings className="h-5 w-5 mr-2" />
        Configuración
        <div className="flex items-center gap-1 ml-2">
          {printerStatus.connected && (
            <span className="w-2 h-2 rounded-full bg-green-500" title="Impresora conectada" />
          )}
          {autoPrintEnabled && (
            <span className="w-2 h-2 rounded-full bg-blue-500" title="Auto-impresión activa" />
          )}
        </div>
      </Button>

      {/* KDS Board */}
      <KDSBoard
        restaurant={restaurant}
        branchId={branchId}
        branchName={branchName}
        initialOrders={initialOrders}
        onPrintOrder={handlePrintOrder}
        autoPrintEnabled={autoPrintEnabled}
        onAutoPrintChange={handleAutoPrintChange}
      />
    </div>
  )
}
