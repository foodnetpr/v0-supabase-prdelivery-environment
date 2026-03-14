"use client"

import { useState, useCallback } from "react"
import { KDSBoard } from "@/components/kds-board"
import { PrinterSettings } from "@/components/printer-settings"
import { bluetoothPrinter, PrinterStatus } from "@/lib/bluetooth-printer"
import { Button } from "@/components/ui/button"
import { Settings, X } from "lucide-react"

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
  }
  branchId?: string | null
  branchName?: string | null
  initialOrders: Order[]
}

export function KDSClient({ restaurant, branchId, branchName, initialOrders }: KDSClientProps) {
  const [showSettings, setShowSettings] = useState(false)
  const [printerStatus, setPrinterStatus] = useState<PrinterStatus>({
    connected: false,
    name: null,
    id: null,
  })

  const handlePrintOrder = useCallback(async (order: Order) => {
    if (!printerStatus.connected) {
      // Try to print via browser if no Bluetooth printer
      window.print()
      return
    }

    try {
      // Print kitchen ticket (condensed version)
      const result = await bluetoothPrinter.printKitchenTicket(order)
      if (!result.success) {
        console.error("Print failed:", result.error)
        // Fallback to browser print
        window.print()
      }
    } catch (error) {
      console.error("Print error:", error)
      window.print()
    }
  }, [printerStatus.connected])

  return (
    <div className="relative">
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
            <div className="p-4">
              <PrinterSettings onPrinterStatusChange={setPrinterStatus} />
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
        {printerStatus.connected && (
          <span className="ml-2 w-2 h-2 rounded-full bg-green-500" />
        )}
      </Button>

      {/* KDS Board */}
      <KDSBoard
        restaurant={restaurant}
        branchId={branchId}
        branchName={branchName}
        initialOrders={initialOrders}
        onPrintOrder={handlePrintOrder}
      />
    </div>
  )
}
