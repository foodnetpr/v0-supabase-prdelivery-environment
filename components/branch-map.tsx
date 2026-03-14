"use client"

import { useEffect, useRef, useState } from "react"

interface Branch {
  id: string
  name: string
  address?: string
  city?: string
  state?: string
  latitude?: number | null
  longitude?: number | null
}

interface BranchMapProps {
  branches: Branch[]
  primaryColor: string
  onSelect: (branch: Branch) => void
}

export function BranchMap({ branches, primaryColor, onSelect }: BranchMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const leafletRef = useRef<any>(null)
  const [isReady, setIsReady] = useState(false)
  const [activeRegion, setActiveRegion] = useState<string>("all")

  // Filter branches that have valid coordinates
  const mappableBranches = branches.filter(
    (b) => b.latitude && b.longitude && !isNaN(b.latitude) && !isNaN(b.longitude)
  )

  // Detect regions from branch state fields
  const regions = (() => {
    const regionMap: Record<string, typeof mappableBranches> = {}
    mappableBranches.forEach((b) => {
      const region = b.state === "FL" ? "Florida" : b.state === "PR" ? "Puerto Rico" : (b.state || "Otro")
      if (!regionMap[region]) regionMap[region] = []
      regionMap[region].push(b)
    })
    return regionMap
  })()
  const regionNames = Object.keys(regions)
  const hasMultipleRegions = regionNames.length > 1

  useEffect(() => {
    if (!mapRef.current || mappableBranches.length === 0) return

    // Inject Leaflet CSS if not already present
    if (!document.querySelector('link[href*="leaflet"]')) {
      const link = document.createElement("link")
      link.rel = "stylesheet"
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      document.head.appendChild(link)
    }

    let cancelled = false

    import("leaflet").then((L) => {
      if (cancelled || !mapRef.current) return
      leafletRef.current = L.default

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }

      // Calculate center from all branch coordinates
      const avgLat =
        mappableBranches.reduce((sum, b) => sum + (b.latitude || 0), 0) / mappableBranches.length
      const avgLng =
        mappableBranches.reduce((sum, b) => sum + (b.longitude || 0), 0) / mappableBranches.length

      // Inject branded map styles
      const styleId = "branch-map-styles"
      if (!document.getElementById(styleId)) {
        const style = document.createElement("style")
        style.id = styleId
        style.textContent = `
          .branch-map-container .leaflet-tile-pane { filter: saturate(0.3) brightness(0.35) contrast(1.1); }
          .branch-map-container .leaflet-overlay-pane::after {
            content: '';
            position: absolute;
            inset: 0;
            background: ${primaryColor}10;
            pointer-events: none;
            z-index: 400;
          }
          @keyframes markerPulse {
            0%, 100% { box-shadow: 0 0 0 0 ${primaryColor}60, 0 2px 8px rgba(0,0,0,0.3); }
            50% { box-shadow: 0 0 0 8px ${primaryColor}00, 0 2px 8px rgba(0,0,0,0.3); }
          }
          .branch-marker-pin {
            animation: markerPulse 2.5s ease-in-out infinite;
            transition: transform 0.2s ease;
          }
          .branch-marker-pin:hover { transform: scale(1.2); }
          .branch-popup .leaflet-popup-content-wrapper {
            background: #1a1a1a;
            color: white;
            border-radius: 12px;
            border: 1px solid ${primaryColor}40;
            box-shadow: 0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px ${primaryColor}20;
          }
          .branch-popup .leaflet-popup-tip { background: #1a1a1a; }
          .branch-popup .leaflet-popup-close-button { color: #999 !important; }
          .branch-popup .leaflet-popup-close-button:hover { color: white !important; }
          .leaflet-control-zoom a {
            background: #1a1a1a !important;
            color: white !important;
            border-color: #333 !important;
          }
          .leaflet-control-zoom a:hover { background: ${primaryColor} !important; }
        `
        document.head.appendChild(style)
      }

      const map = L.default.map(mapRef.current!, {
        center: [avgLat, avgLng],
        zoom: 10,
        zoomControl: true,
        scrollWheelZoom: true,
        attributionControl: false,
      })

      // Use Carto Voyager (clean, minimal) -- the CSS filter darkens and desaturates it
      L.default.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        maxZoom: 19,
      }).addTo(map)

      L.default.control.attribution({ position: "bottomright", prefix: false }).addTo(map)

      // Create branded markers for each branch
      mappableBranches.forEach((branch) => {
        const markerIcon = L.default.divIcon({
          className: "custom-branch-marker",
          html: `
            <div class="branch-marker-pin" style="
              width: 40px;
              height: 40px;
              background: radial-gradient(circle at 30% 30%, ${primaryColor}, ${primaryColor}cc);
              border: 3px solid rgba(255,255,255,0.9);
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              cursor: pointer;
            ">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
            </div>
          `,
          iconSize: [40, 40],
          iconAnchor: [20, 20],
          popupAnchor: [0, -24],
        })

        const address = [branch.address, branch.city, branch.state].filter(Boolean).join(", ")

        const marker = L.default.marker([branch.latitude!, branch.longitude!], { icon: markerIcon }).addTo(map)

        marker.bindPopup(
          `<div style="font-family: system-ui, -apple-system, sans-serif; min-width: 180px; padding: 4px;">
            <div style="font-weight: 700; font-size: 15px; margin-bottom: 4px; color: white;">${branch.name}</div>
            ${address ? `<div style="font-size: 12px; color: #aaa; margin-bottom: 10px; line-height: 1.3;">${address}</div>` : ""}
            <button 
              onclick="window.dispatchEvent(new CustomEvent('select-branch', { detail: '${branch.id}' }))"
              style="
                width: 100%;
                padding: 8px 16px;
                background: ${primaryColor};
                color: white;
                border: none;
                border-radius: 8px;
                font-size: 13px;
                font-weight: 600;
                cursor: pointer;
                letter-spacing: 0.02em;
                transition: opacity 0.2s;
              "
              onmouseover="this.style.opacity='0.85'"
              onmouseout="this.style.opacity='1'"
            >
              Ordenar Aqui
            </button>
          </div>`,
          { closeButton: true, className: "branch-popup" }
        )

        marker.on("mouseover", () => marker.openPopup())
      })

      // If multiple regions, default to the one with most branches (typically PR)
      if (hasMultipleRegions) {
        const mainRegion = regionNames.reduce((a, b) => (regions[a].length >= regions[b].length ? a : b))
        const mainBranches = regions[mainRegion]
        if (mainBranches.length > 1) {
          const bounds = L.default.latLngBounds(
            mainBranches.map((b) => [b.latitude!, b.longitude!] as [number, number])
          )
          map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 })
        }
        setActiveRegion(mainRegion)
      } else if (mappableBranches.length > 1) {
        const bounds = L.default.latLngBounds(
          mappableBranches.map((b) => [b.latitude!, b.longitude!] as [number, number])
        )
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 })
      }

      mapInstanceRef.current = map
      setIsReady(true)
    })

    return () => {
      cancelled = true
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [mappableBranches.length])

  // Zoom to region when activeRegion changes
  useEffect(() => {
    const map = mapInstanceRef.current
    const L = leafletRef.current
    if (!map || !L) return

    const targetBranches = activeRegion === "all" ? mappableBranches : (regions[activeRegion] || mappableBranches)
    if (targetBranches.length === 0) return

    if (targetBranches.length === 1) {
      map.setView([targetBranches[0].latitude, targetBranches[0].longitude], 13, { animate: true })
    } else {
      const bounds = L.latLngBounds(
        targetBranches.map((b: any) => [b.latitude!, b.longitude!] as [number, number])
      )
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13, animate: true })
    }
  }, [activeRegion])

  // Listen for branch selection events from popup buttons
  useEffect(() => {
    const handleSelect = (e: Event) => {
      const branchId = (e as CustomEvent).detail
      const branch = branches.find((b) => b.id === branchId)
      if (branch) onSelect(branch)
    }
    window.addEventListener("select-branch", handleSelect)
    return () => window.removeEventListener("select-branch", handleSelect)
  }, [branches, onSelect])

  if (mappableBranches.length === 0) return null

  return (
    <div className="w-full max-w-4xl mx-auto mb-6">
      {hasMultipleRegions && (
        <div className="flex items-center justify-center gap-2 mb-3">
          <button
            onClick={() => setActiveRegion("all")}
            className="px-4 py-1.5 rounded-full text-sm font-medium transition-all"
            style={{
              background: activeRegion === "all" ? primaryColor : "rgba(255,255,255,0.15)",
              color: "white",
              border: activeRegion === "all" ? "2px solid white" : "2px solid transparent",
            }}
          >
            Todas
          </button>
          {regionNames.map((region) => (
            <button
              key={region}
              onClick={() => setActiveRegion(region)}
              className="px-4 py-1.5 rounded-full text-sm font-medium transition-all"
              style={{
                background: activeRegion === region ? primaryColor : "rgba(255,255,255,0.15)",
                color: "white",
                border: activeRegion === region ? "2px solid white" : "2px solid transparent",
              }}
            >
              {region} ({regions[region].length})
            </button>
          ))}
        </div>
      )}
      <div
        className="branch-map-container rounded-xl overflow-hidden shadow-2xl"
        style={{
          height: "320px",
          border: `2px solid ${primaryColor}30`,
          boxShadow: `0 8px 40px rgba(0,0,0,0.4), 0 0 0 1px ${primaryColor}15`,
        }}
      >
        <div ref={mapRef} className="w-full h-full" />
      </div>
    </div>
  )
}
