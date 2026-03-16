"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertTriangle,
  Clock,
  Power,
  PowerOff,
  Calendar,
  Save,
  X,
  Building2,
  Loader2,
  History,
  Plus,
  Trash2,
  DollarSign,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { bulkApplyTiersToAllRestaurants } from "@/app/super-admin/actions"

interface Restaurant {
  id: string
  name: string
  slug: string
  is_active: boolean
  payment_type: "ach" | "pop" | "ath" | null
  is_manually_blocked: boolean
  block_override: boolean
  blocked_until: string | null
}

interface PlatformSettings {
  id: string
  is_platform_open: boolean
  is_pop_blocked: boolean
  operating_hours_start: string
  operating_hours_end: string
  operating_days: {
    sunday: boolean
    monday: boolean
    tuesday: boolean
    wednesday: boolean
    thursday: boolean
    friday: boolean
    saturday: boolean
  }
  emergency_block_active: boolean
  emergency_block_reason: string | null
  pop_reopen_at: string | null
  pop_block_message: string | null
  blocked_zip_codes: string[]
  delivery_fee_subsidy: number
}

interface ScheduledBlock {
  id: string
  restaurant_id: string | null
  restaurant_name?: string
  block_type: "system" | "restaurant" | "pop_bulk"
  starts_at: string
  ends_at: string
  reason: string | null
  is_active: boolean
}

interface OperationsTabProps {
  restaurants: Restaurant[]
  platformSettings: PlatformSettings | null
  scheduledBlocks: ScheduledBlock[]
}

const DAYS_OF_WEEK = [
  { key: "sunday", label: "S", fullLabel: "Sunday" },
  { key: "monday", label: "M", fullLabel: "Monday" },
  { key: "tuesday", label: "T", fullLabel: "Tuesday" },
  { key: "wednesday", label: "W", fullLabel: "Wednesday" },
  { key: "thursday", label: "T", fullLabel: "Thursday" },
  { key: "friday", label: "F", fullLabel: "Friday" },
  { key: "saturday", label: "S", fullLabel: "Saturday" },
]

const TIME_OPTIONS = [
  "12:00 AM", "12:30 AM", "1:00 AM", "1:30 AM", "2:00 AM", "2:30 AM",
  "3:00 AM", "3:30 AM", "4:00 AM", "4:30 AM", "5:00 AM", "5:30 AM",
  "6:00 AM", "6:30 AM", "7:00 AM", "7:30 AM", "8:00 AM", "8:30 AM",
  "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
  "12:00 PM", "12:30 PM", "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM",
  "3:00 PM", "3:30 PM", "4:00 PM", "4:30 PM", "5:00 PM", "5:30 PM",
  "6:00 PM", "6:30 PM", "7:00 PM", "7:30 PM", "8:00 PM", "8:30 PM",
  "9:00 PM", "9:30 PM", "10:00 PM", "10:30 PM", "11:00 PM", "11:30 PM",
]

function formatTime24to12(time24: string): string {
  if (!time24) return "11:00 AM"
  const [hours, minutes] = time24.split(":").map(Number)
  const period = hours >= 12 ? "PM" : "AM"
  const hour12 = hours % 12 || 12
  return `${hour12}:${minutes.toString().padStart(2, "0")} ${period}`
}

function formatTime12to24(time12: string): string {
  const [time, period] = time12.split(" ")
  let [hours, minutes] = time.split(":").map(Number)
  if (period === "PM" && hours !== 12) hours += 12
  if (period === "AM" && hours === 12) hours = 0
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`
}

export function OperationsTab({
  restaurants: initialRestaurants,
  platformSettings: initialSettings,
  scheduledBlocks: initialBlocks,
}: OperationsTabProps) {
  const [restaurants, setRestaurants] = useState(initialRestaurants)
  const [settings, setSettings] = useState<PlatformSettings>(
    initialSettings || {
      id: "",
      is_platform_open: true,
      is_pop_blocked: false,
      operating_hours_start: "11:00",
      operating_hours_end: "20:30",
      operating_days: {
        sunday: true,
        monday: true,
        tuesday: true,
        wednesday: true,
        thursday: true,
        friday: true,
        saturday: true,
      },
      emergency_block_active: false,
      emergency_block_reason: null,
      pop_reopen_at: null,
      pop_block_message: null,
      blocked_zip_codes: [],
      delivery_fee_subsidy: 3.0,
    }
  )
  const [scheduledBlocks, setScheduledBlocks] = useState(initialBlocks)
  const [isSaving, setIsSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  // Default tier grid state
  const DEFAULT_TIERS = Array.from({ length: 10 }, (_, i) => ({
    minDistance: i,
    maxDistance: i + 1,
    baseFee: "",
  }))
  const [tierGrid, setTierGrid] = useState<{ minDistance: number; maxDistance: number; baseFee: string }[]>(DEFAULT_TIERS)
  const [isBulkApplyingAll, setIsBulkApplyingAll] = useState(false)
  const [tierGridResult, setTierGridResult] = useState<{ success?: boolean; updated?: number; error?: string } | null>(null)
  const [filterPaymentType, setFilterPaymentType] = useState<"all" | "ach" | "pop">("all")
  
  // POP Block modal state
  const [showPopBlockModal, setShowPopBlockModal] = useState(false)
  const [popReopenDate, setPopReopenDate] = useState("")
  const [popReopenTime, setPopReopenTime] = useState("8:00 PM")
  const [popBlockMessage, setPopBlockMessage] = useState("")
  
  // Scheduled block modal state
  const [showBlockModal, setShowBlockModal] = useState(false)
  const [blockRestaurantId, setBlockRestaurantId] = useState<string | null>(null)
  const [blockStartDate, setBlockStartDate] = useState("")
  const [blockStartTime, setBlockStartTime] = useState("12:00 PM")
  const [blockEndDate, setBlockEndDate] = useState("")
  const [blockEndTime, setBlockEndTime] = useState("12:00 PM")
  const [blockReason, setBlockReason] = useState("")

  // Filter restaurants
  const filteredRestaurants = restaurants.filter((r) => {
    const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = filterPaymentType === "all" || r.payment_type === filterPaymentType
    return matchesSearch && matchesType
  })

  const popRestaurants = restaurants.filter((r) => r.payment_type === "pop")
  const achRestaurants = restaurants.filter((r) => r.payment_type === "ach")

  // Save platform settings
  const savePlatformSettings = async () => {
    setIsSaving(true)
    try {
      const response = await fetch("/api/platform-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      })
      if (!response.ok) throw new Error("Failed to save settings")
    } catch (error) {
      console.error("Error saving platform settings:", error)
    } finally {
      setIsSaving(false)
    }
  }

  // Toggle platform open/closed
  const togglePlatform = async () => {
    const newSettings = { ...settings, is_platform_open: !settings.is_platform_open }
    setSettings(newSettings)
    await fetch("/api/platform-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newSettings),
    })
  }

  // Toggle emergency block
  const toggleEmergencyBlock = async () => {
    const newSettings = {
      ...settings,
      emergency_block_active: !settings.emergency_block_active,
      emergency_block_reason: !settings.emergency_block_active ? "Emergency closure" : null,
    }
    setSettings(newSettings)
    await fetch("/api/platform-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newSettings),
    })
  }

  // Toggle day
  const toggleDay = (day: string) => {
    setSettings({
      ...settings,
      operating_days: {
        ...settings.operating_days,
        [day]: !settings.operating_days[day as keyof typeof settings.operating_days],
      },
    })
  }

  // Close all POP restaurants
  const closeAllPop = async () => {
    const reopenAt = popReopenDate && popReopenTime
      ? new Date(`${popReopenDate}T${formatTime12to24(popReopenTime)}`).toISOString()
      : null

    const newSettings = {
      ...settings,
      is_pop_blocked: true,
      pop_reopen_at: reopenAt,
      pop_block_message: popBlockMessage || null,
    }
    setSettings(newSettings)
    
    await fetch("/api/platform-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newSettings),
    })
    
    setShowPopBlockModal(false)
    setPopReopenDate("")
    setPopReopenTime("8:00 PM")
    setPopBlockMessage("")
  }

  // Open all POP restaurants
  const openAllPop = async () => {
    const newSettings = {
      ...settings,
      is_pop_blocked: false,
      pop_reopen_at: null,
      pop_block_message: null,
    }
    setSettings(newSettings)
    
    await fetch("/api/platform-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newSettings),
    })
  }

  // Toggle restaurant block override
  const toggleRestaurantOverride = async (restaurantId: string, currentOverride: boolean) => {
    const response = await fetch(`/api/restaurants/${restaurantId}/override`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ block_override: !currentOverride }),
    })
    
    if (response.ok) {
      setRestaurants(restaurants.map((r) =>
        r.id === restaurantId ? { ...r, block_override: !currentOverride } : r
      ))
    }
  }

  // Quick temp block (30 or 60 min)
  const quickBlock = async (restaurantId: string, minutes: number) => {
    const blockedUntil = new Date(Date.now() + minutes * 60 * 1000).toISOString()
    
    const response = await fetch(`/api/restaurants/${restaurantId}/block`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_manually_blocked: true, blocked_until: blockedUntil }),
    })
    
    if (response.ok) {
      setRestaurants(restaurants.map((r) =>
        r.id === restaurantId ? { ...r, is_manually_blocked: true, blocked_until: blockedUntil } : r
      ))
    }
  }

  // Toggle restaurant manual block
  const toggleRestaurantBlock = async (restaurantId: string, currentlyBlocked: boolean) => {
    const response = await fetch(`/api/restaurants/${restaurantId}/block`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_manually_blocked: !currentlyBlocked, blocked_until: null }),
    })
    
    if (response.ok) {
      setRestaurants(restaurants.map((r) =>
        r.id === restaurantId
          ? { ...r, is_manually_blocked: !currentlyBlocked, blocked_until: null }
          : r
      ))
    }
  }

  // Create scheduled block
  const createScheduledBlock = async () => {
    const startsAt = new Date(`${blockStartDate}T${formatTime12to24(blockStartTime)}`).toISOString()
    const endsAt = new Date(`${blockEndDate}T${formatTime12to24(blockEndTime)}`).toISOString()
    
    const response = await fetch("/api/blocks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        restaurant_id: blockRestaurantId,
        block_type: blockRestaurantId ? "restaurant" : "system",
        starts_at: startsAt,
        ends_at: endsAt,
        reason: blockReason || null,
      }),
    })
    
    if (response.ok) {
      const newBlock = await response.json()
      setScheduledBlocks([...scheduledBlocks, newBlock])
      setShowBlockModal(false)
      resetBlockForm()
    }
  }

  // Delete scheduled block
  const deleteScheduledBlock = async (blockId: string) => {
    const response = await fetch(`/api/blocks/${blockId}`, { method: "DELETE" })
    if (response.ok) {
      setScheduledBlocks(scheduledBlocks.filter((b) => b.id !== blockId))
    }
  }

  const resetBlockForm = () => {
    setBlockRestaurantId(null)
    setBlockStartDate("")
    setBlockStartTime("12:00 PM")
    setBlockEndDate("")
    setBlockEndTime("12:00 PM")
    setBlockReason("")
  }

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  }

  return (
    <div className="space-y-6">
      {/* Platform Status Banner */}
      <Card className={cn(
        "border-2",
        settings.emergency_block_active
          ? "border-destructive bg-destructive/5"
          : settings.is_platform_open
            ? "border-green-500 bg-green-50"
            : "border-amber-500 bg-amber-50"
      )}>
        <CardContent className="p-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            {/* Platform Toggle */}
            <div className="flex items-center gap-4">
              <div className={cn(
                "flex h-12 w-12 items-center justify-center rounded-full",
                settings.is_platform_open ? "bg-green-500" : "bg-amber-500"
              )}>
                {settings.is_platform_open ? (
                  <Power className="h-6 w-6 text-white" />
                ) : (
                  <PowerOff className="h-6 w-6 text-white" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold">Platform Status</h3>
                  <Badge variant={settings.is_platform_open ? "default" : "secondary"}>
                    {settings.is_platform_open ? "OPEN" : "CLOSED"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {settings.is_platform_open
                    ? "Orders are being accepted"
                    : "All ordering is paused"}
                </p>
              </div>
              <Switch
                checked={settings.is_platform_open}
                onCheckedChange={togglePlatform}
                className="ml-4"
              />
            </div>

            {/* Operating Hours */}
            <div className="flex flex-col gap-2">
              <Label className="text-sm font-medium">Operating Hours</Label>
              <div className="flex items-center gap-2">
                <Select
                  value={formatTime24to12(settings.operating_hours_start)}
                  onValueChange={(val) =>
                    setSettings({ ...settings, operating_hours_start: formatTime12to24(val) })
                  }
                >
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_OPTIONS.map((time) => (
                      <SelectItem key={time} value={time}>{time}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-muted-foreground">to</span>
                <Select
                  value={formatTime24to12(settings.operating_hours_end)}
                  onValueChange={(val) =>
                    setSettings({ ...settings, operating_hours_end: formatTime12to24(val) })
                  }
                >
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_OPTIONS.map((time) => (
                      <SelectItem key={time} value={time}>{time}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-1">
                {DAYS_OF_WEEK.map((day) => (
                  <button
                    key={day.key}
                    onClick={() => toggleDay(day.key)}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded text-xs font-medium transition-colors",
                      settings.operating_days[day.key as keyof typeof settings.operating_days]
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                    title={day.fullLabel}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
              <Button size="sm" onClick={savePlatformSettings} disabled={isSaving} className="mt-1">
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Hours
              </Button>
            </div>

            {/* Emergency Block */}
            <div className="flex flex-col gap-2">
              <Label className="text-sm font-medium">Emergency Block</Label>
              <Button
                variant={settings.emergency_block_active ? "destructive" : "outline"}
                onClick={toggleEmergencyBlock}
                className="gap-2"
              >
                <AlertTriangle className="h-4 w-4" />
                {settings.emergency_block_active ? "Deactivate Emergency" : "Activate Emergency Block"}
              </Button>
              {settings.emergency_block_active && settings.emergency_block_reason && (
                <p className="text-xs text-destructive">{settings.emergency_block_reason}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Default Delivery Tier Grid — applies to ALL restaurants */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Default Delivery Tiers — All Restaurants
          </CardTitle>
          <CardDescription>
            Enter base fees for each distance tier and click "Apply to All Restaurants" to set these zones across every active restaurant at once. Individual restaurants can still be adjusted from their own admin panel afterward.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left font-medium pb-2 pr-4 text-muted-foreground w-16">Tier</th>
                  <th className="text-left font-medium pb-2 pr-4 text-muted-foreground w-32">Distance</th>
                  <th className="text-left font-medium pb-2 text-muted-foreground">Base Fee</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {tierGrid.map((tier, i) => (
                  <tr key={i}>
                    <td className="py-2 pr-4 font-mono text-xs text-muted-foreground">T{i + 1}</td>
                    <td className="py-2 pr-4 text-muted-foreground whitespace-nowrap">
                      {tier.minDistance}–{tier.maxDistance} mi
                    </td>
                    <td className="py-2">
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground text-sm">$</span>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={tier.baseFee}
                          onChange={(e) => {
                            const next = [...tierGrid]
                            next[i] = { ...next[i], baseFee: e.target.value }
                            setTierGrid(next)
                          }}
                          className="h-8 w-24"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {tierGridResult && (
            <p className={cn("text-sm", tierGridResult.success ? "text-green-700" : "text-red-600")}>
              {tierGridResult.success
                ? `Applied to ${tierGridResult.updated} restaurant${tierGridResult.updated !== 1 ? "s" : ""} successfully.`
                : `Error: ${tierGridResult.error}`}
            </p>
          )}

          <div className="flex items-center gap-3">
            <Button
              disabled={isBulkApplyingAll}
              onClick={async () => {
                const filledCount = tierGrid.filter((t) => Number(t.baseFee) > 0).length
                if (filledCount === 0) return
                if (!confirm(`This will replace ALL delivery zones on every active restaurant with these ${filledCount} tier(s). This cannot be undone. Continue?`)) return
                setIsBulkApplyingAll(true)
                setTierGridResult(null)
                try {
                  const result = await bulkApplyTiersToAllRestaurants(
                    tierGrid.map((t) => ({
                      minDistance: t.minDistance,
                      maxDistance: t.maxDistance,
                      baseFee: Number.parseFloat(t.baseFee) || 0,
                    })),
                  )
                  setTierGridResult(result)
                } finally {
                  setIsBulkApplyingAll(false)
                }
              }}
              className="gap-2 bg-[#1a1a1a] hover:bg-[#333]"
            >
              {isBulkApplyingAll ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Applying...</>
              ) : (
                "Apply to All Restaurants"
              )}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setTierGrid(DEFAULT_TIERS)
                setTierGridResult(null)
              }}
            >
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delivery Fee Subsidy */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Delivery Fee Subsidy
          </CardTitle>
          <CardDescription>
            The subsidy is subtracted from the delivery fee shown to customers. The full fee is always charged and recorded in reporting. Currently <strong>${settings.delivery_fee_subsidy.toFixed(2)}</strong> off per order.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">$</span>
              <Input
                type="number"
                min="0"
                step="0.25"
                value={settings.delivery_fee_subsidy}
                onChange={(e) =>
                  setSettings({ ...settings, delivery_fee_subsidy: Number(e.target.value) || 0 })
                }
                className="w-28"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Customer sees: full fee − subsidy (minimum $0.00 shown)
            </p>
          </div>
          <Button
            onClick={async () => {
              setIsSaving(true)
              try {
                await fetch("/api/platform-settings", {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(settings),
                })
              } finally {
                setIsSaving(false)
              }
            }}
            disabled={isSaving}
            className="gap-2"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Subsidy
          </Button>
        </CardContent>
      </Card>

      {/* Blocked Zip Codes */}
      <Card className={cn(
        "border-2",
        settings.blocked_zip_codes.length > 0 ? "border-orange-400 bg-orange-50" : "border-border"
      )}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Blocked Delivery Zones
          </CardTitle>
          <CardDescription>
            Block delivery to specific zip codes temporarily — e.g. during a marathon or road closure. Customers in these zip codes will see a notice and cannot place orders.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {settings.blocked_zip_codes.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {settings.blocked_zip_codes.map((zip) => (
                <span key={zip} className="inline-flex items-center gap-1 bg-orange-100 border border-orange-300 text-orange-800 text-sm font-mono px-2.5 py-1 rounded-full">
                  {zip}
                  <button
                    onClick={() => {
                      const next = settings.blocked_zip_codes.filter((z) => z !== zip)
                      setSettings({ ...settings, blocked_zip_codes: next })
                    }}
                    className="ml-1 hover:text-orange-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 border rounded-lg p-4 bg-white">
            {[
              { zip: "00901", area: "Viejo San Juan" },
              { zip: "00907", area: "Condado" },
              { zip: "00909", area: "Santurce" },
              { zip: "00917", area: "Hato Rey" },
              { zip: "00918", area: "Hato Rey Norte" },
              { zip: "00920", area: "Río Piedras" },
              { zip: "00923", area: "Cupey" },
              { zip: "00926", area: "Cupey Gardens" },
              { zip: "00949", area: "Toa Baja" },
              { zip: "00956", area: "Bayamón" },
              { zip: "00959", area: "Bayamón Este" },
              { zip: "00965", area: "Guaynabo" },
              { zip: "00968", area: "Guaynabo Norte" },
              { zip: "00969", area: "Garden Hills" },
              { zip: "00976", area: "Trujillo Alto" },
              { zip: "00979", area: "Carolina" },
              { zip: "00983", area: "Isla Verde" },
            ].map(({ zip, area }) => {
              const checked = settings.blocked_zip_codes.includes(zip)
              return (
                <label key={zip} className="flex items-center gap-2 cursor-pointer select-none">
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => {
                      const next = checked
                        ? settings.blocked_zip_codes.filter((z) => z !== zip)
                        : [...settings.blocked_zip_codes, zip]
                      setSettings({ ...settings, blocked_zip_codes: next })
                    }}
                  />
                  <span className="text-sm">
                    <span className="font-mono font-medium">{zip}</span>
                    <span className="text-muted-foreground ml-1 text-xs">{area}</span>
                  </span>
                </label>
              )
            })}
          </div>

          <Button
            onClick={async () => {
              setIsSaving(true)
              try {
                await fetch("/api/platform-settings", {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(settings),
                })
              } finally {
                setIsSaving(false)
              }
            }}
            disabled={isSaving}
            variant={settings.blocked_zip_codes.length > 0 ? "destructive" : "default"}
            className="gap-2"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {settings.blocked_zip_codes.length > 0
              ? `Save — ${settings.blocked_zip_codes.length} zone${settings.blocked_zip_codes.length !== 1 ? "s" : ""} blocked`
              : "Save — No zones blocked"}
          </Button>
        </CardContent>
      </Card>

      {/* POP Restaurants Control */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            POP Restaurants Control
          </CardTitle>
          <CardDescription>
            Manage Pay-on-Pickup restaurants. {popRestaurants.length} POP restaurants,{" "}
            {popRestaurants.filter((r) => r.block_override).length} with override active.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <Badge variant={settings.is_pop_blocked ? "destructive" : "outline"} className="text-sm py-1 px-3">
              {settings.is_pop_blocked ? "All POP Blocked" : "POP Open"}
            </Badge>
            
            {settings.is_pop_blocked ? (
              <Button onClick={openAllPop} variant="default" className="gap-2">
                <Power className="h-4 w-4" />
                Open All POP
              </Button>
            ) : (
              <Button onClick={() => setShowPopBlockModal(true)} variant="destructive" className="gap-2">
                <PowerOff className="h-4 w-4" />
                Close All POP
              </Button>
            )}

            {settings.is_pop_blocked && settings.pop_reopen_at && (
              <span className="text-sm text-muted-foreground">
                Auto-reopen: {formatDateTime(settings.pop_reopen_at)}
              </span>
            )}
          </div>

          {/* Blocked POP Restaurants List - Shown when POP is blocked */}
          {settings.is_pop_blocked && (
            <div className="rounded-lg border-2 border-destructive/30 bg-destructive/5 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-destructive flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Blocked POP Restaurants
                </h4>
                <span className="text-sm text-muted-foreground">
                  Check to unblock individual restaurants
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {popRestaurants.filter(r => r.block_override).length} of {popRestaurants.length} restaurants are open (overridden)
              </p>
              <div className="grid gap-2 max-h-64 overflow-y-auto">
                {popRestaurants.map((restaurant) => {
                  const isOpen = restaurant.block_override
                  return (
                    <div
                      key={restaurant.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                        isOpen
                          ? "bg-green-50 border-green-200"
                          : "bg-white border-destructive/20"
                      )}
                    >
                      <Checkbox
                        id={`pop-override-${restaurant.id}`}
                        checked={restaurant.block_override}
                        onCheckedChange={() => toggleRestaurantOverride(restaurant.id, restaurant.block_override)}
                      />
                      <label
                        htmlFor={`pop-override-${restaurant.id}`}
                        className={cn(
                          "flex-1 cursor-pointer font-medium",
                          isOpen ? "text-green-700" : "text-slate-700"
                        )}
                      >
                        {restaurant.name}
                      </label>
                      <Badge variant={isOpen ? "default" : "destructive"} className="text-xs">
                        {isOpen ? "OPEN" : "BLOCKED"}
                      </Badge>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* POP Restaurant List - Full management view */}
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium">All POP Restaurants</h4>
              <span className="text-sm text-muted-foreground">
                Temp Closure: Quick block for 30 or 60 minutes
              </span>
            </div>
            <div className="grid grid-cols-[1fr,auto,auto,auto] gap-4 px-4 py-2 text-sm font-medium text-muted-foreground border-b">
              <div>Restaurant</div>
              <div className="text-center">{settings.is_pop_blocked ? "Keep Open" : "Override"}</div>
              <div className="text-center">Temp Closure</div>
              <div className="text-center">Status</div>
            </div>
            {popRestaurants.map((restaurant) => {
              const isBlocked = (settings.is_pop_blocked && !restaurant.block_override) || restaurant.is_manually_blocked
              return (
                <div
                  key={restaurant.id}
                  className={cn(
                    "grid grid-cols-[1fr,auto,auto,auto] gap-4 items-center px-4 py-3 rounded-lg",
                    isBlocked ? "bg-destructive/5" : "bg-muted/30"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{restaurant.name}</span>
                    {restaurant.is_manually_blocked && restaurant.blocked_until && (
                      <Badge variant="outline" className="text-xs">
                        Until {formatDateTime(restaurant.blocked_until)}
                      </Badge>
                    )}
                  </div>
                  <div className="flex justify-center">
                    <Checkbox
                      checked={restaurant.block_override}
                      onCheckedChange={() => toggleRestaurantOverride(restaurant.id, restaurant.block_override)}
                      disabled={!settings.is_pop_blocked}
                    />
                  </div>
                  <div className="flex justify-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => quickBlock(restaurant.id, 30)}
                      className="text-xs h-7"
                    >
                      30 min
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => quickBlock(restaurant.id, 60)}
                      className="text-xs h-7"
                    >
                      60 min
                    </Button>
                  </div>
                  <div className="flex justify-center">
                    <Badge variant={isBlocked ? "destructive" : "default"}>
                      {isBlocked ? "Blocked" : "Open"}
                    </Badge>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* All Restaurants Block/Unblock */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Block/Unblock Vendors</CardTitle>
              <CardDescription>
                Create scheduled blocks or manually block individual restaurants
              </CardDescription>
            </div>
            <Button onClick={() => setShowBlockModal(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Block
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4">
            <Input
              placeholder="Search restaurants..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
            <Select value={filterPaymentType} onValueChange={(v: "all" | "ach" | "pop") => setFilterPaymentType(v)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Payment Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="ach">ACH Only</SelectItem>
                <SelectItem value="pop">POP Only</SelectItem>
                <SelectItem value="ath">ATH Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Restaurant List */}
          <div className="border rounded-lg">
            <div className="grid grid-cols-[1fr,100px,100px,120px] gap-4 px-4 py-3 bg-muted text-sm font-medium">
              <div>Vendor</div>
              <div className="text-center">Type</div>
              <div className="text-center">Block</div>
              <div className="text-center">Status</div>
            </div>
            <div className="divide-y max-h-96 overflow-y-auto">
              {filteredRestaurants.map((restaurant) => (
                <div
                  key={restaurant.id}
                  className="grid grid-cols-[1fr,100px,100px,120px] gap-4 items-center px-4 py-3"
                >
                  <div className="font-medium">{restaurant.name}</div>
                  <div className="text-center">
                    <Badge variant="outline" className="text-xs">
                      {restaurant.payment_type?.toUpperCase() || "N/A"}
                    </Badge>
                  </div>
                  <div className="flex justify-center">
                    <Button
                      size="sm"
                      variant={restaurant.is_manually_blocked ? "default" : "outline"}
                      onClick={() => toggleRestaurantBlock(restaurant.id, restaurant.is_manually_blocked)}
                      className="text-xs"
                    >
                      {restaurant.is_manually_blocked ? "Unblock" : "Block"}
                    </Button>
                  </div>
                  <div className="flex justify-center">
                    <Badge variant={restaurant.is_manually_blocked ? "destructive" : "default"}>
                      {restaurant.is_manually_blocked ? "Blocked" : "Open"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scheduled Blocks Log */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Scheduled Blocks
          </CardTitle>
          <CardDescription>
            Active and upcoming scheduled blocks
          </CardDescription>
        </CardHeader>
        <CardContent>
          {scheduledBlocks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No scheduled blocks. Click "Add Block" to create one.
            </p>
          ) : (
            <div className="space-y-2">
              {scheduledBlocks.map((block) => (
                <div
                  key={block.id}
                  className="flex items-center justify-between px-4 py-3 bg-muted/30 rounded-lg"
                >
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {block.restaurant_name || "System-wide Block"}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {formatDateTime(block.starts_at)} - {formatDateTime(block.ends_at)}
                    </span>
                    {block.reason && (
                      <span className="text-xs text-muted-foreground">Reason: {block.reason}</span>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteScheduledBlock(block.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* POP Block Modal */}
      <Dialog open={showPopBlockModal} onOpenChange={setShowPopBlockModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close All POP Restaurants</DialogTitle>
            <DialogDescription>
              This will block all Pay-on-Pickup restaurants. You can set an auto-reopen time.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Reopen Date/Time (optional)</Label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={popReopenDate}
                  onChange={(e) => setPopReopenDate(e.target.value)}
                  className="flex-1"
                />
                <Select value={popReopenTime} onValueChange={setPopReopenTime}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_OPTIONS.map((time) => (
                      <SelectItem key={time} value={time}>{time}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Optional Message</Label>
              <Textarea
                placeholder="Message to display when POP is blocked..."
                value={popBlockMessage}
                onChange={(e) => setPopBlockMessage(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPopBlockModal(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={closeAllPop}>
              Close All POP
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Block Modal */}
      <Dialog open={showBlockModal} onOpenChange={setShowBlockModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Scheduled Block</DialogTitle>
            <DialogDescription>
              Schedule a block for a specific restaurant or system-wide
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Restaurant (leave empty for system-wide)</Label>
              <Select
                value={blockRestaurantId || "system"}
                onValueChange={(v) => setBlockRestaurantId(v === "system" ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select restaurant" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="system">System-wide (All Restaurants)</SelectItem>
                  {restaurants.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={blockStartDate}
                  onChange={(e) => setBlockStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Select value={blockStartTime} onValueChange={setBlockStartTime}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_OPTIONS.map((time) => (
                      <SelectItem key={time} value={time}>{time}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={blockEndDate}
                  onChange={(e) => setBlockEndDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Select value={blockEndTime} onValueChange={setBlockEndTime}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_OPTIONS.map((time) => (
                      <SelectItem key={time} value={time}>{time}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Reason (optional)</Label>
              <Input
                placeholder="e.g., Holiday, Maintenance, etc."
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowBlockModal(false); resetBlockForm(); }}>
              Cancel
            </Button>
            <Button onClick={createScheduledBlock} disabled={!blockStartDate || !blockEndDate}>
              Create Block
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
