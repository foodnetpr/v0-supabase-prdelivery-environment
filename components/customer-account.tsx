"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { User, Package, MapPin, LogOut, Plus, Trash2, Check } from "lucide-react"
import Image from "next/image"
import { format } from "date-fns"
import { useToast } from "@/components/ui/use-toast"

interface CustomerAccountProps {
  user: any
  restaurant: any
  orders: any[]
  addresses: any[]
  slug: string
}

export function CustomerAccount({ user, restaurant, orders, addresses, slug }: CustomerAccountProps) {
  const [loading, setLoading] = useState(false)
  const [savedAddresses, setSavedAddresses] = useState(addresses)
  const [showAddressForm, setShowAddressForm] = useState(false)
  const [editingAddress, setEditingAddress] = useState<any>(null)
  const [addressForm, setAddressForm] = useState({
    full_address: "",
    address_line1: "",
    address_line2: "",
    city: "",
    state: "FL",
    zip_code: "",
    delivery_instructions: "",
    is_default: false,
  })
  const router = useRouter()
  const supabase = createBrowserClient()
  const { toast } = useToast()

  const handleSignOut = async () => {
    setLoading(true)
    await supabase.auth.signOut()
    router.push(`/${slug}`)
    router.refresh()
  }

  const handleReorder = async (orderId: string) => {
    router.push(`/${slug}?reorder=${orderId}`)
  }

  const handleSaveAddress = async () => {
    const fullAddress = `${addressForm.address_line1}, ${addressForm.city}, ${addressForm.state} ${addressForm.zip_code}`

    if (editingAddress) {
      const { error } = await supabase
        .from("customer_addresses")
        .update({
          ...addressForm,
          full_address: fullAddress,
        })
        .eq("id", editingAddress.id)

      if (error) {
        toast({ title: "Error", description: "Error al actualizar la direccion", variant: "destructive" })
        return
      }

      toast({ title: "Listo", description: "Direccion actualizada" })
    } else {
      const { error } = await supabase.from("customer_addresses").insert({
        ...addressForm,
        full_address: fullAddress,
        user_id: user.id,
      })

      if (error) {
        toast({ title: "Error", description: "Error al guardar la direccion", variant: "destructive" })
        return
      }

      toast({ title: "Listo", description: "Direccion guardada" })
    }

    // Refresh addresses
    const { data } = await supabase
      .from("customer_addresses")
      .select("*")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false })

    setSavedAddresses(data || [])
    setShowAddressForm(false)
    setEditingAddress(null)
    setAddressForm({
      full_address: "",
      address_line1: "",
      address_line2: "",
      city: "",
      state: "FL",
      zip_code: "",
      delivery_instructions: "",
      is_default: false,
    })
  }

  const handleDeleteAddress = async (addressId: string) => {
    const { error } = await supabase.from("customer_addresses").delete().eq("id", addressId)

    if (error) {
      toast({ title: "Error", description: "Error al eliminar la direccion", variant: "destructive" })
      return
    }

    toast({ title: "Listo", description: "Direccion eliminada" })
    setSavedAddresses(savedAddresses.filter((addr) => addr.id !== addressId))
  }

  const handleSetDefault = async (addressId: string) => {
    // Unset all defaults first
    await supabase.from("customer_addresses").update({ is_default: false }).eq("user_id", user.id)

    // Set the new default
    const { error } = await supabase.from("customer_addresses").update({ is_default: true }).eq("id", addressId)

    if (error) {
      toast({ title: "Error", description: "Error al establecer direccion predeterminada", variant: "destructive" })
      return
    }

    // Refresh addresses
    const { data } = await supabase
      .from("customer_addresses")
      .select("*")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false })

    setSavedAddresses(data || [])
    toast({ title: "Listo", description: "Direccion predeterminada actualizada" })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => router.push(`/${slug}`)} className="text-lg font-semibold hover:opacity-80">
            ← Volver a {restaurant.name}
          </button>
          <Button onClick={handleSignOut} variant="outline" disabled={loading}>
            <LogOut className="w-4 h-4 mr-2" />
            Cerrar Sesion
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Mi Cuenta</h1>
          <p className="text-muted-foreground">{user.email}</p>
        </div>

        <Tabs defaultValue="orders" className="space-y-6">
          <TabsList>
            <TabsTrigger value="orders">
              <Package className="w-4 h-4 mr-2" />
              Historial de Pedidos
            </TabsTrigger>
            <TabsTrigger value="addresses">
              <MapPin className="w-4 h-4 mr-2" />
              Direcciones Guardadas
            </TabsTrigger>
            <TabsTrigger value="profile">
              <User className="w-4 h-4 mr-2" />
              Perfil
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="space-y-4">
            {orders.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">No hay pedidos aun</p>
                  <p className="text-muted-foreground mb-4">Comienza a comprar para ver tu historial de pedidos</p>
                  <Button onClick={() => router.push(`/${slug}`)}>Ver Menu</Button>
                </CardContent>
              </Card>
            ) : (
              orders.map((order) => (
                <Card key={order.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">Pedido #{order.order_number}</CardTitle>
                        <CardDescription>{format(new Date(order.created_at), "MMM dd, yyyy • h:mm a")}</CardDescription>
                      </div>
                      <Badge
                        variant={
                          order.status === "completed"
                            ? "default"
                            : order.status === "cancelled"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {{ pending: "Pendiente", preparing: "Preparando", ready: "Listo", completed: "Completado", cancelled: "Cancelado" }[order.status] || order.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Fecha de Entrega:</span>
                        <span className="font-medium">{format(new Date(order.delivery_date), "MMM dd, yyyy")}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Total:</span>
                        <span className="font-semibold">${order.total_amount.toFixed(2)}</span>
                      </div>

                      <div className="border-t pt-3">
                        <p className="text-sm font-medium mb-2">Articulos ({order.order_items?.length || 0}):</p>
                        <div className="space-y-2">
                          {order.order_items?.slice(0, 3).map((item: any) => (
                            <div key={item.id} className="flex items-center gap-2 text-sm">
                              {item.menu_items?.image_url && (
                                <Image
                                  src={item.menu_items.image_url || "/placeholder.svg"}
                                  alt=""
                                  width={32}
                                  height={32}
                                  className="rounded object-cover"
                                />
                              )}
                              <span>
                                {item.quantity}x {item.menu_items?.name || item.item_name}
                              </span>
                            </div>
                          ))}
                          {(order.order_items?.length || 0) > 3 && (
                            <p className="text-xs text-muted-foreground">+{order.order_items.length - 3} articulos mas</p>
                          )}
                        </div>
                      </div>

                      <Button
                        onClick={() => handleReorder(order.id)}
                        variant="outline"
                        className="w-full mt-4"
                        style={{ borderColor: restaurant.primary_color, color: restaurant.primary_color }}
                      >
                        Reordenar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="addresses" className="space-y-4">
            {showAddressForm ? (
              <Card>
                <CardHeader>
                  <CardTitle>{editingAddress ? "Editar Direccion" : "Agregar Nueva Direccion"}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="address_line1">Direccion *</Label>
                      <Input
                        id="address_line1"
                        value={addressForm.address_line1}
                        onChange={(e) => setAddressForm({ ...addressForm, address_line1: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="address_line2">Apt, Suite, etc.</Label>
                      <Input
                        id="address_line2"
                        value={addressForm.address_line2}
                        onChange={(e) => setAddressForm({ ...addressForm, address_line2: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="city">Ciudad *</Label>
                      <Input
                        id="city"
                        value={addressForm.city}
                        onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">Estado *</Label>
                      <Input
                        id="state"
                        value={addressForm.state}
                        onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                        maxLength={2}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="zip_code">Codigo Postal *</Label>
                      <Input
                        id="zip_code"
                        value={addressForm.zip_code}
                        onChange={(e) => setAddressForm({ ...addressForm, zip_code: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="delivery_instructions">Instrucciones de Entrega</Label>
                      <Input
                        id="delivery_instructions"
                        value={addressForm.delivery_instructions}
                        onChange={(e) => setAddressForm({ ...addressForm, delivery_instructions: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="is_default"
                      checked={addressForm.is_default}
                      onChange={(e) => setAddressForm({ ...addressForm, is_default: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="is_default">Establecer como direccion predeterminada</Label>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={handleSaveAddress}>Guardar Direccion</Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowAddressForm(false)
                        setEditingAddress(null)
                        setAddressForm({
                          full_address: "",
                          address_line1: "",
                          address_line2: "",
                          city: "",
                          state: "FL",
                          zip_code: "",
                          delivery_instructions: "",
                          is_default: false,
                        })
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                <Button onClick={() => setShowAddressForm(true)} className="mb-4">
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar Nueva Direccion
                </Button>

                {savedAddresses.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <MapPin className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-lg font-medium">No hay direcciones guardadas</p>
                      <p className="text-muted-foreground">Agrega una direccion para un pago mas rapido</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4">
                    {savedAddresses.map((address) => (
                      <Card key={address.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                {address.is_default && (
                                  <Badge variant="secondary" className="flex items-center gap-1">
                                    <Check className="w-3 h-3" />
                                    Predeterminada
                                  </Badge>
                                )}
                              </div>
                              <p className="font-medium">{address.address_line1}</p>
                              {address.address_line2 && (
                                <p className="text-sm text-muted-foreground">{address.address_line2}</p>
                              )}
                              <p className="text-sm text-muted-foreground">
                                {address.city}, {address.state} {address.zip_code}
                              </p>
                              {address.delivery_instructions && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  Nota: {address.delivery_instructions}
                                </p>
                              )}
                            </div>
                            <div className="flex gap-2">
                              {!address.is_default && (
                                <Button variant="ghost" size="sm" onClick={() => handleSetDefault(address.id)}>
                                  Predeterminar
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setEditingAddress(address)
                                  setAddressForm(address)
                                  setShowAddressForm(true)
                                }}
                              >
                                <MapPin className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteAddress(address.id)}>
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Informacion del Perfil</CardTitle>
                <CardDescription>Administra los detalles de tu cuenta</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium">Correo Electronico</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Nombre</p>
                    <p className="text-sm text-muted-foreground">{user.user_metadata?.full_name || "No establecido"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Miembro Desde</p>
                    <p className="text-sm text-muted-foreground">{format(new Date(user.created_at), "MMMM yyyy")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
