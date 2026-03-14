"use client"

import Image from "next/image"
import dynamic from "next/dynamic"
import { MapPin, ChevronRight } from "lucide-react"

const BranchMap = dynamic(() => import("./branch-map").then((m) => m.BranchMap), {
  ssr: false,
  loading: () => (
    <div className="w-full max-w-4xl mx-auto mb-6">
      <div className="rounded-xl overflow-hidden border border-white/20 bg-white/5 animate-pulse" style={{ height: "300px" }} />
    </div>
  ),
})

interface Branch {
  id: string
  name: string
  slug: string
  address?: string
  city?: string
  state?: string
  zip?: string
  phone?: string
  image_url?: string
  latitude?: number | null
  longitude?: number | null
  delivery_enabled: boolean
  pickup_enabled: boolean
  is_active: boolean
  display_order: number
}

interface BranchSelectorProps {
  restaurantName: string
  logoUrl?: string
  bannerLogoUrl?: string
  heroImageUrl?: string
  hideTitle?: boolean
  primaryColor: string
  branches: Branch[]
  servicePackages?: any[]
  whiteLabel?: boolean
  onSelect: (branch: Branch) => void
}

export function BranchSelector({
  restaurantName,
  logoUrl,
  bannerLogoUrl,
  heroImageUrl,
  hideTitle,
  primaryColor,
  branches,
  whiteLabel,
  onSelect,
}: BranchSelectorProps) {
  const activeBranches = branches.filter((b) => b.is_active !== false)

  return (
    <div className="relative min-h-screen w-full flex flex-col">
      {/* Background Image */}
      {heroImageUrl && (
        <div className="fixed inset-0 z-0">
          <Image src={heroImageUrl} alt="" fill className="object-cover" priority />
          <div className="absolute inset-0 bg-black/60" />
        </div>
      )}
      {!heroImageUrl && <div className="fixed inset-0 bg-gradient-to-b from-gray-800 to-gray-900 z-0" />}

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center w-full px-4 py-8 md:py-12">
        {/* Logo and Branding */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-4 mb-4">
            {bannerLogoUrl ? (
              <Image
                src={bannerLogoUrl}
                alt={restaurantName}
                width={280}
                height={80}
                className="max-h-20 w-auto object-contain"
              />
            ) : logoUrl ? (
              <Image
                src={logoUrl}
                alt={restaurantName}
                width={whiteLabel ? 180 : 64}
                height={whiteLabel ? 60 : 64}
                className={whiteLabel ? "max-h-16 w-auto object-contain" : "rounded-lg"}
              />
            ) : null}
            {!whiteLabel && !bannerLogoUrl && (
              <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
                Junte<span className="font-black">READY</span>
              </h1>
            )}
            {whiteLabel && !logoUrl && !bannerLogoUrl && (
              <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
                {restaurantName}
              </h1>
            )}
          </div>
          <div className="w-12 h-1 rounded-full mb-4" style={{ backgroundColor: primaryColor }} />
          {!hideTitle && (
            <p className="text-lg text-white/80 text-center italic">
              Selecciona tu Restaurante mas cercano
            </p>
          )}
        </div>

        {/* Interactive Map */}
        <BranchMap
          branches={activeBranches}
          primaryColor={primaryColor}
          onSelect={onSelect}
        />

        {/* Branch Cards Grid */}
        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeBranches.map((branch) => {
            const address = [branch.address, branch.city, branch.state].filter(Boolean).join(", ")
            return (
              <button
                key={branch.id}
                onClick={() => onSelect(branch)}
                className="group flex items-center gap-4 p-5 rounded-xl border border-white/20 bg-white/10 backdrop-blur-sm text-left transition-all hover:bg-white/20 hover:border-white/30 hover:shadow-lg"
              >
                <div className="flex items-center justify-center w-12 h-12 rounded-full border border-white/30 bg-white/10 shrink-0">
                  <MapPin className="w-5 h-5 text-white/80" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white text-lg">{branch.name}</h3>
                  {address && (
                    <p className="text-sm text-white/60 truncate">{address}</p>
                  )}
                </div>
                <ChevronRight className="w-5 h-5 text-white/40 group-hover:text-white/70 transition-colors shrink-0" />
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
