"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Mail, Monitor, Link2, ShoppingCart, CheckCircle, AlertCircle, 
  Loader2, ExternalLink, Settings, Copy, RefreshCw, Tablet
} from "lucide-react"
import { testChowlyConnection } from "@/app/actions/chowly"
import { testSquareConnection } from "@/app/actions/square"

type NotificationMethod = "email" | "kds" | "chowly" | "square_kds" | "multiple"

interface OrderNotificationSettingsProps {
  restaurantSlug: string
  branchId?: string
  entityType?: "restaurant" | "branch"
  settings: {
    order_notification_method: NotificationMethod
    chowly_api_key: string
    chowly_location_id: string
    chowly_enabled: boolean
    square_kds_enabled: boolean
    square_access_token?: string
    square_location_id?: string
    square_environment?: "sandbox" | "production"
    kds_access_token?: string
  }
  onChange: (settings: Partial<OrderNotificationSettingsProps["settings"]>) => void
  showSquareSettings?: boolean
}

export function OrderNotificationSettings({ 
  restaurantSlug, 
  branchId,
  entityType = "restaurant",
  settings, 
  onChange,
  showSquareSettings = true
}: OrderNotificationSettingsProps) {
  const [chowlyTestStatus, setChowlyTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle")
  const [chowlyTestMessage, setChowlyTestMessage] = useState("")
  const [squareTestStatus, setSquareTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle")
  const [squareTestMessage, setSquareTestMessage] = useState("")
  const [copied, setCopied] = useState(false)

  // Generate a new KDS access token
  const generateToken = () => {
    const token = crypto.randomUUID().replace(/-/g, '').substring(0, 24)
    onChange({ kds_access_token: token })
  }

  // Build the direct KDS URL
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const kdsDirectUrl = settings.kds_access_token 
    ? `${baseUrl}/${restaurantSlug}/kds${branchId ? `?branch=${branchId}&` : '?'}token=${settings.kds_access_token}`
    : null

  const copyToClipboard = async () => {
    if (kdsDirectUrl) {
      await navigator.clipboard.writeText(kdsDirectUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleTestChowly = async () => {
    if (!settings.chowly_api_key || !settings.chowly_location_id) {
      setChowlyTestStatus("error")
      setChowlyTestMessage("Por favor ingresa API Key y Location ID")
      return
    }

    setChowlyTestStatus("testing")
    setChowlyTestMessage("Probando conexion...")

    try {
      const result = await testChowlyConnection(settings.chowly_api_key, settings.chowly_location_id)
      if (result.success) {
        setChowlyTestStatus("success")
        setChowlyTestMessage(`Conectado: ${result.locationName}`)
      } else {
        setChowlyTestStatus("error")
        setChowlyTestMessage(result.error || "Error de conexion")
      }
    } catch (error: any) {
      setChowlyTestStatus("error")
      setChowlyTestMessage(error.message || "Error inesperado")
    }
  }

  const handleTestSquare = async () => {
    if (!settings.square_access_token || !settings.square_location_id) {
      setSquareTestStatus("error")
      setSquareTestMessage("Credenciales de Square no configuradas")
      return
    }

    setSquareTestStatus("testing")
    setSquareTestMessage("Probando conexion...")

    try {
      const result = await testSquareConnection(
        settings.square_access_token, 
        settings.square_location_id,
        settings.square_environment || "production"
      )
      if (result.success) {
        setSquareTestStatus("success")
        setSquareTestMessage(`Conectado: ${result.locationName}`)
      } else {
        setSquareTestStatus("error")
        setSquareTestMessage(result.error || "Error de conexion")
      }
    } catch (error: any) {
      setSquareTestStatus("error")
      setSquareTestMessage(error.message || "Error inesperado")
    }
  }

  const notificationOptions = [
    { value: "email", label: "Solo Email", icon: Mail, description: "Enviar pedidos por correo electronico" },
    { value: "kds", label: "Kitchen Display (KDS)", icon: Monitor, description: "Pantalla de cocina en tiempo real" },
    { value: "chowly", label: "Chowly POS", icon: Link2, description: "Integracion con POS via Chowly" },
    { value: "square_kds", label: "Square KDS", icon: ShoppingCart, description: "Enviar a Square Kitchen Display" },
    { value: "multiple", label: "Multiples Canales", icon: Settings, description: "Usar varios metodos a la vez" },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Monitor className="h-5 w-5" />
          Notificaciones de Pedidos
        </CardTitle>
        <CardDescription>
          Configura como quieres recibir los pedidos nuevos en tu restaurante.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Notification Method Selection */}
        <div className="space-y-2">
          <Label>Metodo de Notificacion</Label>
          <Select 
            value={settings.order_notification_method} 
            onValueChange={(value: NotificationMethod) => onChange({ order_notification_method: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar metodo..." />
            </SelectTrigger>
            <SelectContent>
              {notificationOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center gap-2">
                    <option.icon className="h-4 w-4" />
                    <span>{option.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-gray-500">
            {notificationOptions.find(o => o.value === settings.order_notification_method)?.description}
          </p>
        </div>

        {/* KDS Link and Direct URL */}
        {(settings.order_notification_method === "kds" || settings.order_notification_method === "multiple") && (
          <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-blue-900">Kitchen Display System</p>
                <p className="text-sm text-blue-700">
                  Accede a la pantalla de cocina para ver pedidos en tiempo real.
                </p>
              </div>
              <Button asChild variant="outline" className="gap-2">
                <a href={`/${restaurantSlug}/kds${branchId ? `?branch=${branchId}` : ''}`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  Abrir KDS
                </a>
              </Button>
            </div>

            {/* Direct Tablet URL Section */}
            <div className="pt-4 border-t border-blue-200">
              <div className="flex items-center gap-2 mb-3">
                <Tablet className="h-4 w-4 text-blue-700" />
                <p className="font-medium text-blue-900">Acceso Directo para Tablet</p>
              </div>
              <p className="text-sm text-blue-700 mb-3">
                Genera un enlace directo que puedes guardar en tu tablet para acceder al KDS sin iniciar sesion.
              </p>
              
              {settings.kds_access_token ? (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Input 
                      readOnly 
                      value={kdsDirectUrl || ''} 
                      className="bg-white text-xs font-mono"
                    />
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={copyToClipboard}
                      title="Copiar URL"
                    >
                      {copied ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={generateToken}
                      className="gap-2"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Regenerar Token
                    </Button>
                    <p className="text-xs text-blue-600 self-center">
                      Regenerar invalidara el enlace anterior.
                    </p>
                  </div>
                </div>
              ) : (
                <Button onClick={generateToken} className="gap-2">
                  <Tablet className="h-4 w-4" />
                  Generar Enlace para Tablet
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Multiple Channels Options */}
        {settings.order_notification_method === "multiple" && (
          <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium">Canales Activos:</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">Email</span>
                </div>
                <Badge variant="secondary">Siempre activo</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Monitor className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">KDS</span>
                </div>
                <Badge variant="secondary">Siempre activo</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Link2 className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">Chowly POS</span>
                </div>
                <Switch
                  checked={settings.chowly_enabled}
                  onCheckedChange={(checked) => onChange({ chowly_enabled: checked })}
                />
              </div>
              {showSquareSettings && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">Square KDS</span>
                  </div>
                  <Switch
                    checked={settings.square_kds_enabled}
                    onCheckedChange={(checked) => onChange({ square_kds_enabled: checked })}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Chowly Settings */}
        {(settings.order_notification_method === "chowly" || 
          (settings.order_notification_method === "multiple" && settings.chowly_enabled)) && (
          <div className="space-y-4 p-4 border rounded-lg">
            <div className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-purple-600" />
              <h4 className="font-medium">Configuracion Chowly</h4>
            </div>
            <p className="text-sm text-gray-500">
              Chowly conecta tu sistema de pedidos con tu POS (Toast, Square, Clover, etc.)
            </p>
            
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="chowly_api_key">API Key</Label>
                <Input
                  id="chowly_api_key"
                  type="password"
                  placeholder="Tu Chowly API Key..."
                  value={settings.chowly_api_key}
                  onChange={(e) => onChange({ chowly_api_key: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="chowly_location_id">Location ID</Label>
                <Input
                  id="chowly_location_id"
                  placeholder="Tu Chowly Location ID..."
                  value={settings.chowly_location_id}
                  onChange={(e) => onChange({ chowly_location_id: e.target.value })}
                />
              </div>
            </div>

            {/* Test Connection */}
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                onClick={handleTestChowly}
                disabled={chowlyTestStatus === "testing"}
              >
                {chowlyTestStatus === "testing" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Probando...
                  </>
                ) : (
                  "Probar Conexion"
                )}
              </Button>
              {chowlyTestStatus === "success" && (
                <div className="flex items-center gap-1 text-green-600 text-sm">
                  <CheckCircle className="h-4 w-4" />
                  {chowlyTestMessage}
                </div>
              )}
              {chowlyTestStatus === "error" && (
                <div className="flex items-center gap-1 text-red-600 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  {chowlyTestMessage}
                </div>
              )}
            </div>

            <p className="text-xs text-gray-400">
              No tienes Chowly? <a href="https://chowly.com" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Visita chowly.com</a> para configurar la integracion con tu POS.
            </p>
          </div>
        )}

        {/* Square KDS Settings */}
        {showSquareSettings && (settings.order_notification_method === "square_kds" || 
          (settings.order_notification_method === "multiple" && settings.square_kds_enabled)) && (
          <div className="space-y-4 p-4 border rounded-lg">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-blue-600" />
              <h4 className="font-medium">Square Kitchen Display</h4>
            </div>
            <p className="text-sm text-gray-500">
              Los pedidos se enviaran automaticamente a Square KDS usando tus credenciales de Square configuradas en la seccion de pagos.
            </p>

            {settings.square_access_token && settings.square_location_id ? (
              <div className="flex items-center gap-3">
                <Button 
                  variant="outline" 
                  onClick={handleTestSquare}
                  disabled={squareTestStatus === "testing"}
                >
                  {squareTestStatus === "testing" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Probando...
                    </>
                  ) : (
                    "Verificar Conexion Square"
                  )}
                </Button>
                {squareTestStatus === "success" && (
                  <div className="flex items-center gap-1 text-green-600 text-sm">
                    <CheckCircle className="h-4 w-4" />
                    {squareTestMessage}
                  </div>
                )}
                {squareTestStatus === "error" && (
                  <div className="flex items-center gap-1 text-red-600 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    {squareTestMessage}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  Configura tus credenciales de Square en la seccion de "Proveedor de Pagos" primero.
                </p>
              </div>
            )}

            <p className="text-xs text-gray-400">
              Nota: El restaurante debe tener Square for Restaurants con KDS habilitado.
            </p>
          </div>
        )}

        {/* Info Box */}
        <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-600">
          <p className="font-medium mb-2">Como funcionan las notificaciones:</p>
          <ul className="space-y-1 list-disc list-inside">
            <li><strong>Email:</strong> Se envia un correo al restaurante con los detalles del pedido.</li>
            <li><strong>KDS:</strong> Los pedidos aparecen en tiempo real en la pantalla de cocina.</li>
            <li><strong>Chowly:</strong> Los pedidos se envian a tu POS (Toast, Clover, etc.) via Chowly.</li>
            <li><strong>Square KDS:</strong> Los pedidos se crean en Square y aparecen en Square KDS.</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
