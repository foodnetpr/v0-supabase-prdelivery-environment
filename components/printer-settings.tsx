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

    // Auto-reconnect silently on mount if saved printer exists and not yet connected
    // Use a local async IIFE so we don't need handleReconnect in deps (avoids stale closure)
    if (saved.hasPrinter && !status.connected) {
      setIsReconnecting(true)
      bluetoothPrinter.tryReconnect().then((result) => {
        if (result.success && result.printer) {
          setPrinterStatus(result.printer)
        }
        // Silently ignore needsManualConnect on auto-reconnect — user can click button
      }).catch(() => {
        // Ignore errors on silent auto-reconnect
      }).finally(() => {
        setIsReconnecting(false)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    onPrinterStatusChange?.(printerStatus)
  }, [printerStatus, onPrinterStatusChange])

  // When user clicks "Reconectar": try getDevices() auto-reconnect first,
  // then always fall through to device picker if that fails (covers browser restarts,
  // PWA relaunches, and any case where the browser forgets the pairing).
  const handleReconnectWithFallback = async () => {
    setMessage(null)
    setIsReconnecting(true)

    try {
      const result = await bluetoothPrinter.tryReconnect()

      if (result.success && result.printer) {
        // getDevices() found the device and reconnected automatically
        setPrinterStatus(result.printer)
        setMessage({ type: "success", text: `Reconectado a ${result.printer.name || "impresora"}` })
        return
      }

      // Auto-reconnect couldn't do it (needsManualConnect or any other failure).
      // Always fall through to the device picker — this is the normal flow after
      // a PWA restart or browser refresh when getDevices() is unavailable or empty.
      setIsReconnecting(false)
      setMessage({
        type: "error",
        text: `Selecciona "${savedPrinter.name || "la impresora"}" en la lista que aparecerá`,
      })
      // Small delay so user reads the hint before the picker opens
      await new Promise((r) => setTimeout(r, 600))
      setMessage(null)
      await handleConnect()
    } catch {
      setIsReconnecting(false)
      setMessage({ type: "error", text: "Error al reconectar. Intenta de nuevo." })
    }
    // Note: no finally needed — isReconnecting is always set false before
    // reaching handleConnect() or the catch block
  }

  const handleConnect = async () => {
    setIsConnecting(true)
    setMessage(null)

    try {
      const result = await bluetoothPrinter.connect()

      if (result.success && result.printer) {
        setPrinterStatus(result.printer)
        setSavedPrinter({ hasPrinter: true, name: result.printer.name })
        setMessage({ type: "success", text: `Conectado a ${result.printer.name || "impresora"}` })
      } else {
        setMessage({ type: "error", text: result.error || "Error al conectar" })
      }
    } catch (error: any) {
      setMessage({ type: "error", text: error.message || "Error inesperado" })
    } finally {
      setIsConnecting(false)
    }
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
              <Button onClick={handleConnect} disabled={isConnecting}>
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
