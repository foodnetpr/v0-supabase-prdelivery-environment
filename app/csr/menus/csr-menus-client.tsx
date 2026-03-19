"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, Search, Store, ChevronRight, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface Restaurant {
  id: string
  name: string
  slug: string
  logo_url: string | null
  cuisine_type: string | null
  area: string | null
  is_active: boolean
}

interface CSRMenusClientProps {
  restaurants: Restaurant[]
}

export function CSRMenusClient({ restaurants }: CSRMenusClientProps) {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredRestaurants = restaurants.filter(
    (r) =>
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.cuisine_type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.area?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="border-b bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/csr">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Volver al Portal
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Gestión de Menús</h1>
                <p className="text-sm text-slate-500">
                  Selecciona un restaurante para editar su menú
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Search */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Buscar por nombre, cocina o área..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Restaurant Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredRestaurants.map((restaurant) => (
            <Link
              key={restaurant.id}
              href={`/${restaurant.slug}/admin`}
              className="block"
            >
              <Card className="h-full transition-all hover:shadow-md hover:border-teal-300">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {restaurant.logo_url ? (
                      <Image
                        src={restaurant.logo_url}
                        alt={restaurant.name}
                        width={64}
                        height={64}
                        className="rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-slate-100">
                        <Store className="h-8 w-8 text-slate-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-semibold text-slate-900 truncate">
                          {restaurant.name}
                        </h3>
                        <ChevronRight className="h-5 w-5 text-slate-400 flex-shrink-0" />
                      </div>
                      {restaurant.cuisine_type && (
                        <p className="text-sm text-slate-500 mt-1">
                          {restaurant.cuisine_type}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        {restaurant.area && (
                          <Badge variant="outline" className="text-xs">
                            <MapPin className="h-3 w-3 mr-1" />
                            {restaurant.area}
                          </Badge>
                        )}
                        <Badge
                          variant={restaurant.is_active ? "default" : "secondary"}
                          className={restaurant.is_active ? "bg-green-600" : ""}
                        >
                          {restaurant.is_active ? "Activo" : "Inactivo"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {filteredRestaurants.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Store className="mb-4 h-12 w-12 text-slate-400" />
            <h3 className="mb-2 text-lg font-semibold text-slate-700">
              No se encontraron restaurantes
            </h3>
            <p className="text-sm text-slate-500">
              Intenta ajustar tu búsqueda
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
