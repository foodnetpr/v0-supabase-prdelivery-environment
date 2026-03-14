"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
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
  const [autoPrint, setAutoPrint] = useState(false)
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

    // Load auto-print preference
    if (typeof localStorage !== "undefined") {
      setAutoPrint(localStorage.getItem("kds_auto_print") === "true")
    }

    // Auto-reconnect if there's a saved printer and not currently connected
    if (saved.hasPrinter && !status.connected) {
      handleReconnect()
    }
  }, [])

  useEffect(() => {
    onPrinterStatusChange?.(printerStatus)
  }, [printerStatus, onPrinterStatusChange])

  const handleReconnect = async () => {
    setIsReconnecting(true)
    try {
      const result = await bluetoothPrinter.tryReconnect()
      if (result.success && result.printer) {
        setPrinterStatus(result.printer)
        setMessage({ type: "success", text: `Reconectado a ${result.printer.name || "impresora"}` })
      }
      // Don't show error on auto-reconnect failure - user can manually connect
    } catch {
      // Silent fail for auto-reconnect
    } finally {
      setIsReconnecting(false)
    }
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

  const handleAutoPrintToggle = (checked: boolean) => {
    setAutoPrint(checked)
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("kds_auto_print", checked ? "true" : "false")
    }
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
                <Button variant="outline" onClick={handleReconnect} disabled={isReconnecting || isConnecting}>
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

        {/* Auto-print Setting */}
        {printerStatus.connected && (
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="space-y-0.5">
              <Label htmlFor="auto-print">Impresión Automática</Label>
              <p className="text-sm text-gray-500">
                Imprimir automáticamente cuando lleguen nuevos pedidos
              </p>
            </div>
            <Switch
              id="auto-print"
              checked={autoPrint}
              onCheckedChange={handleAutoPrintToggle}
            />
          </div>
        )}

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
