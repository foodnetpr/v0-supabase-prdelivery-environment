"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

import { Bluetooth, BluetoothConnected, BluetoothOff, Printer, AlertCircle, CheckCircle, Loader2 } from "lucide-react"
import { bluetoothPrinter, PrinterStatus } from "@/lib/bluetooth-printer"

interface PrinterSettingsProps {
  onPrinterStatusChange?: (status: PrinterStatus) => void
}

export function PrinterSettings({ onPrinterStatusChange }: PrinterSettingsProps) {
  const [isSupported, setIsSupported] = useState(true)
  const [printerStatus, setPrinterStatus] = useState<PrinterStatus>({
    connected: false,
    name: null,
    id: null,
  })
  const [isConnecting, setIsConnecting] = useState(false)
  const [isReconnecting, setIsReconnecting] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [savedPrinter, setSavedPrinter] = useState<{ hasPrinter: boolean; name: string | null }>({ hasPrinter: false, name: null })

  useEffect(() => {
    // Check if Web Bluetooth is supported
    setIsSupported(bluetoothPrinter.isSupported())
    
    // Get current status
    const status = bluetoothPrinter.getStatus()
    setPrinterStatus(status)

    // Check for saved printer
    const saved = bluetoothPrinter.hasSavedPrinter()
    setSavedPrinter(saved)

    // Auto-reconnect if there's a saved printer and not currently connected
    // This will silently try to reconnect without showing the device picker
    if (saved.hasPrinter && !status.connected) {
      handleReconnect(false)
    }
  }, [])

  useEffect(() => {
    onPrinterStatusChange?.(printerStatus)
  }, [printerStatus, onPrinterStatusChange])

  const handleReconnect = async (showErrors = false) => {
    console.log("[v0] handleReconnect called, showErrors:", showErrors)
    setIsReconnecting(true)
    setMessage(null)
    try {
      console.log("[v0] Calling bluetoothPrinter.tryReconnect()")
      const result = await bluetoothPrinter.tryReconnect()
      console.log("[v0] tryReconnect result:", JSON.stringify(result))
      if (result.success && result.printer) {
        setPrinterStatus(result.printer)
        setMessage({ type: "success", text: `Reconectado a ${result.printer.name || "impresora"}` })
        return { success: true }
      } else if (result.needsManualConnect) {
        // Browser doesn't have the device in memory anymore, need to select it again
        // This is normal after PWA restart or page refresh
        console.log("[v0] needsManualConnect is true")
        setIsReconnecting(false)
        return { success: false, needsManualConnect: true }
      } else if (showErrors && result.error) {
        setMessage({ type: "error", text: result.error })
      }
      return { success: false }
    } catch (error) {
      console.log("[v0] handleReconnect error:", error)
      // Silent fail for auto-reconnect
      return { success: false }
    } finally {
      setIsReconnecting(false)
    }
  }

  // When user clicks "Reconectar", try automatic reconnect first, 
  // then fall back to device picker if needed
  const handleReconnectWithFallback = async () => {
    console.log("[v0] handleReconnectWithFallback called")
    setMessage(null)
    const result = await handleReconnect(false)
    console.log("[v0] handleReconnect result:", result)
    
    if (result.success) {
      console.log("[v0] Auto-reconnect succeeded")
      return
    }
    
    if (result.needsManualConnect) {
      console.log("[v0] Needs manual connect, opening device picker")
      // Show helpful message and open device picker
      setMessage({ type: "error", text: `Selecciona "${savedPrinter.name || 'la impresora'}" en la lista` })
      // Small delay so user sees the message
      await new Promise(r => setTimeout(r, 300))
      await handleConnect()
    } else {
      console.log("[v0] Reconnect failed without needsManualConnect flag")
      setMessage({ type: "error", text: "Error al reconectar. Intenta 'Conectar Otra'" })
    }
  }

  const handleConnect = async () => {
    console.log("[v0] handleConnect called - opening device picker")
    setIsConnecting(true)
    setMessage(null)

    try {
      const result = await bluetoothPrinter.connect()
      console.log("[v0] connect result:", JSON.stringify(result))
      
      if (result.success && result.printer) {
        setPrinterStatus(result.printer)
        setSavedPrinter({ hasPrinter: true, name: result.printer.name })
        setMessage({ type: "success", text: `Conectado a ${result.printer.name || "impresora"}` })
      } else {
        setMessage({ type: "error", text: result.error || "Error al conectar" })
      }
    } catch (error: any) {
      setMessage({ type: "error", text: error.message || "Error inesperado" })
    }

    setIsConnecting(false)
  }

  const handleDisconnect = () => {
    bluetoothPrinter.disconnect()
    setPrinterStatus({ connected: false, name: null, id: null })
    setMessage({ type: "success", text: "Impresora desconectada" })
  }

  const handleTestPrint = async () => {
    setIsTesting(true)
    setMessage(null)

    try {
      const result = await bluetoothPrinter.testPrint()
      
      if (result.success) {
        setMessage({ type: "success", text: "Prueba de impresion enviada" })
      } else {
        setMessage({ type: "error", text: result.error || "Error al imprimir" })
      }
    } catch (error: any) {
      setMessage({ type: "error", text: error.message || "Error inesperado" })
    }

    setIsTesting(false)
  }

  if (!isSupported) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-2 p-3 bg-gray-100 rounded-lg text-sm">
          <BluetoothOff className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-gray-700">Impresion Bluetooth no disponible en este navegador.</p>
            <p className="text-gray-500 text-xs mt-1">Usa Chrome en desktop/Android para Bluetooth. Puedes imprimir usando el boton de impresion del navegador.</p>
          </div>
        </div>
        <div className="pt-2 border-t">
          <p className="text-sm text-gray-600 mb-2">Alternativas de impresion:</p>
          <ul className="text-xs text-gray-500 space-y-1">
            <li>• Boton de impresora en cada orden (usa impresora del sistema)</li>
            <li>• Conecta impresora por USB/WiFi al dispositivo</li>
          </ul>
        </div>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Printer className="h-5 w-5" />
          Impresora Bluetooth
        </CardTitle>
        <CardDescription>
          Conecta una impresora térmica Bluetooth para imprimir tickets de pedidos.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection Status */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            {isReconnecting ? (
              <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
            ) : printerStatus.connected ? (
              <BluetoothConnected className="h-6 w-6 text-green-600" />
            ) : (
              <Bluetooth className="h-6 w-6 text-gray-400" />
            )}
            <div>
              <p className="font-medium">
                {isReconnecting ? "Reconectando..." : printerStatus.connected ? printerStatus.name || "Impresora conectada" : "Sin conexion"}
              </p>
              <p className="text-sm text-gray-500">
                {isReconnecting ? `Buscando ${savedPrinter.name || "impresora"}...` : printerStatus.connected ? "Lista para imprimir" : savedPrinter.hasPrinter ? `Ultimo: ${savedPrinter.name || "impresora"}` : "Conecta una impresora Bluetooth"}
              </p>
            </div>
          </div>
          <Badge variant={printerStatus.connected ? "default" : "secondary"}>
            {isReconnecting ? "Conectando" : printerStatus.connected ? "Conectada" : "Desconectada"}
          </Badge>
        </div>

        {/* Message */}
        {message && (
          <div className={`flex items-center gap-2 p-3 rounded-lg ${
            message.type === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
          }`}>
            {message.type === "success" ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <span className="text-sm">{message.text}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          {printerStatus.connected ? (
            <>
              <Button variant="outline" onClick={handleDisconnect}>
                Desconectar
              </Button>
              <Button onClick={handleTestPrint} disabled={isTesting}>
                {isTesting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Imprimiendo...
                  </>
                ) : (
                  <>
                    <Printer className="mr-2 h-4 w-4" />
                    Prueba de Impresion
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              {savedPrinter.hasPrinter && (
                <Button variant="outline" onClick={handleReconnectWithFallback} disabled={isReconnecting || isConnecting}>
                  {isReconnecting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Reconectando...
                    </>
                  ) : (
                    <>
                      <BluetoothConnected className="mr-2 h-4 w-4" />
                      Reconectar {savedPrinter.name ? `(${savedPrinter.name})` : ""}
                    </>
                  )}
                </Button>
              )}
              <Button onClick={handleConnect} disabled={isConnecting || isReconnecting}>
                {isConnecting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Buscando...
                  </>
                ) : (
                  <>
                    <Bluetooth className="mr-2 h-4 w-4" />
                    {savedPrinter.hasPrinter ? "Conectar Otra" : "Conectar Impresora"}
                  </>
                )}
              </Button>
            </>
          )}
        </div>

        {/* Printer Compatibility Info */}
        <div className="pt-4 border-t">
          <p className="text-sm font-medium mb-2">Impresoras Compatibles:</p>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Epson TM-T20, TM-T88, TM-m30</li>
            <li>• Star Micronics TSP100, TSP650, mPOP</li>
            <li>• Impresoras térmicas 58mm/80mm con Bluetooth</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
