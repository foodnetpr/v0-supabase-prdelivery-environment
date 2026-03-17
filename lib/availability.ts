import { createClient } from "@/lib/supabase/server"

interface PlatformSettings {
  is_platform_open: boolean
  is_pop_blocked: boolean
  operating_hours_start: string
  operating_hours_end: string
  operating_days: Record<string, boolean>
  emergency_block_active: boolean
}

interface Restaurant {
  id: string
  payment_type: string | null
  is_manually_blocked: boolean
  block_override: boolean
  blocked_until: string | null
}

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

export async function getPlatformSettings(): Promise<PlatformSettings | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("platform_settings")
    .select("*")
    .single()
  return data
}

export function isWithinOperatingHours(now: Date, platform: PlatformSettings): boolean {
  // Check if current day is an operating day
  const dayName = DAY_NAMES[now.getDay()]
  if (!platform.operating_days[dayName]) {
    return false
  }

  // Check if current time is within operating hours
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
  const startTime = platform.operating_hours_start
  const endTime = platform.operating_hours_end

  return currentTime >= startTime && currentTime <= endTime
}

export async function getActiveBlocks(restaurantId: string, now: Date): Promise<any[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("scheduled_blocks")
    .select("*")
    .or(`restaurant_id.eq.${restaurantId},restaurant_id.is.null`)
    .eq("is_active", true)
    .lte("starts_at", now.toISOString())
    .gte("ends_at", now.toISOString())

  return data || []
}

export async function getRestaurantHours(restaurantId: string, dayOfWeek: number) {
  const supabase = await createClient()
  const { data } = await supabase
    .from("restaurant_hours")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .eq("day_of_week", dayOfWeek)
    .single()

  return data
}

export async function getHoursOverride(restaurantId: string, date: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from("restaurant_hours_override")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .eq("override_date", date)
    .single()

  return data
}

function formatTimeForComparison(date: Date): string {
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:00`
}

export async function isRestaurantOpenNow(restaurantId: string, now: Date): Promise<boolean> {
  const dayOfWeek = now.getDay()
  const currentTime = formatTimeForComparison(now)
  const dateStr = now.toISOString().split('T')[0]

  // Check for override first
  const override = await getHoursOverride(restaurantId, dateStr)
  const hours = override || await getRestaurantHours(restaurantId, dayOfWeek)

  if (!hours) return true // No hours set = always open (default)

  // Check each shift
  const shifts = [
    { open: hours.breakfast_open, close: hours.breakfast_close },
    { open: hours.lunch_open, close: hours.lunch_close },
    { open: hours.dinner_open, close: hours.dinner_close },
  ]

  for (const shift of shifts) {
    if (shift.open && shift.close) {
      if (currentTime >= shift.open && currentTime <= shift.close) {
        return true
      }
    }
  }

  // If all shifts are null/closed, assume open (no hours configured)
  const hasAnyShift = shifts.some(s => s.open && s.close)
  return !hasAnyShift
}

export async function isRestaurantAvailable(restaurant: Restaurant): Promise<{
  available: boolean
  reason?: string
}> {
  const now = new Date()

  // 1. Check platform status
  const platform = await getPlatformSettings()
  if (!platform) {
    return { available: false, reason: "Platform settings not configured" }
  }

  if (!platform.is_platform_open) {
    return { available: false, reason: "Platform is closed" }
  }

  if (platform.emergency_block_active) {
    return { available: false, reason: "Emergency block active" }
  }

  // 2. Check platform operating hours
  if (!isWithinOperatingHours(now, platform)) {
    return { available: false, reason: "Outside operating hours" }
  }

  // 3. Check if blocked_until has passed (auto-unblock)
  if (restaurant.blocked_until && new Date(restaurant.blocked_until) < now) {
    // Time has passed, should be unblocked - but we still check the flag
  }

  // 4. Check individual restaurant block
  if (restaurant.is_manually_blocked) {
    // Check if blocked_until has passed
    if (restaurant.blocked_until && new Date(restaurant.blocked_until) < now) {
      // Block has expired, should be unblocked automatically
      // This will be handled by a cron job or the next update
    } else {
      return { available: false, reason: "Restaurant is temporarily blocked" }
    }
  }

  // 5. Check POP bulk block (with override)
  if (restaurant.payment_type === 'pop' && platform.is_pop_blocked) {
    if (!restaurant.block_override) {
      return { available: false, reason: "All POP restaurants are currently blocked" }
    }
  }

  // 6. Check scheduled blocks
  const activeBlocks = await getActiveBlocks(restaurant.id, now)
  if (activeBlocks.length > 0) {
    return { available: false, reason: activeBlocks[0].reason || "Scheduled block active" }
  }

  // 7. Check restaurant's own operating hours
  const restaurantOpen = await isRestaurantOpenNow(restaurant.id, now)
  if (!restaurantOpen) {
    return { available: false, reason: "Restaurant is outside its operating hours" }
  }

  return { available: true }
}

// Get the next opening time for a restaurant
export async function getNextOpenTime(restaurantId: string, now: Date): Promise<string | null> {
  const supabase = await createClient()
  const currentTime = formatTimeForComparison(now)
  const dayOfWeek = now.getDay()
  
  // First check today's remaining hours
  const todayHours = await getRestaurantHours(restaurantId, dayOfWeek)
  if (todayHours) {
    const shifts = [
      { name: 'breakfast', open: todayHours.breakfast_open, close: todayHours.breakfast_close },
      { name: 'lunch', open: todayHours.lunch_open, close: todayHours.lunch_close },
      { name: 'dinner', open: todayHours.dinner_open, close: todayHours.dinner_close },
    ]
    
    // Find next shift that opens today
    for (const shift of shifts) {
      if (shift.open && shift.close && currentTime < shift.open) {
        // Format time for display (e.g., "11:30AM")
        const [hours, minutes] = shift.open.split(':')
        const hour = parseInt(hours)
        const ampm = hour >= 12 ? 'PM' : 'AM'
        const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour)
        return `${displayHour}:${minutes}${ampm}`
      }
    }
  }
  
  // Check tomorrow and the next 6 days
  for (let i = 1; i <= 7; i++) {
    const nextDay = (dayOfWeek + i) % 7
    const nextHours = await getRestaurantHours(restaurantId, nextDay)
    if (nextHours) {
      const shifts = [
        { open: nextHours.breakfast_open },
        { open: nextHours.lunch_open },
        { open: nextHours.dinner_open },
      ]
      
      // Find first open shift
      for (const shift of shifts) {
        if (shift.open) {
          const [hours, minutes] = shift.open.split(':')
          const hour = parseInt(hours)
          const ampm = hour >= 12 ? 'PM' : 'AM'
          const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour)
          const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
          return i === 1 ? `Mañana ${displayHour}:${minutes}${ampm}` : `${dayNames[nextDay]} ${displayHour}:${minutes}${ampm}`
        }
      }
    }
  }
  
  return null
}

// Batch check open status for multiple restaurants (efficient for marketplace)
export async function getRestaurantsOpenStatus(restaurantIds: string[]): Promise<Map<string, { isOpen: boolean; nextOpenTime: string | null }>> {
  const supabase = await createClient()
  
  // Use Puerto Rico timezone (AST = UTC-4)
  const now = new Date()
  const prFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Puerto_Rico',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    weekday: 'short'
  })
  const prParts = prFormatter.formatToParts(now)
  const prHour = prParts.find(p => p.type === 'hour')?.value || '00'
  const prMinute = prParts.find(p => p.type === 'minute')?.value || '00'
  const prSecond = prParts.find(p => p.type === 'second')?.value || '00'
  const currentTime = `${prHour}:${prMinute}:${prSecond}`
  
  // Get day of week in Puerto Rico timezone
  const prDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/Puerto_Rico' }))
  const dayOfWeek = prDate.getDay()
  
  // Fetch all hours for these restaurants for today
  const { data: allHours } = await supabase
    .from("restaurant_hours")
    .select("*")
    .in("restaurant_id", restaurantIds)
    .eq("day_of_week", dayOfWeek)
  
  const hoursMap = new Map<string, any>()
  allHours?.forEach(h => hoursMap.set(h.restaurant_id, h))
  
  const results = new Map<string, { isOpen: boolean; nextOpenTime: string | null }>()
  
  for (const id of restaurantIds) {
    const hours = hoursMap.get(id)
    
    if (!hours) {
      // No hours set = always open
      results.set(id, { isOpen: true, nextOpenTime: null })
      continue
    }
    
    const shifts = [
      { open: hours.breakfast_open, close: hours.breakfast_close },
      { open: hours.lunch_open, close: hours.lunch_close },
      { open: hours.dinner_open, close: hours.dinner_close },
    ]
    
    let isOpen = false
    let nextOpenTime: string | null = null
    
    // Check if currently open
    for (const shift of shifts) {
      if (shift.open && shift.close) {
        if (currentTime >= shift.open && currentTime <= shift.close) {
          isOpen = true
          break
        }
      }
    }
    
    // If all shifts are null, assume always open
    const hasAnyShift = shifts.some(s => s.open && s.close)
    if (!hasAnyShift) {
      isOpen = true
    }
    
    // If not open, find next opening time today
    if (!isOpen) {
      for (const shift of shifts) {
        if (shift.open && shift.close && currentTime < shift.open) {
          const [h, m] = shift.open.split(':')
          const hour = parseInt(h)
          const ampm = hour >= 12 ? 'PM' : 'AM'
          const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour)
          nextOpenTime = `${displayHour}:${m}${ampm}`
          break
        }
      }
      
      // If no more shifts today, show "Mañana"
      if (!nextOpenTime) {
        nextOpenTime = "Mañana"
      }
    }
    
    results.set(id, { isOpen, nextOpenTime })
  }
  
  return results
}

/**
 * Check if the FoodNet Internal Shop is currently available
 * Returns false if:
 * - is_internal_shop_open is false (manually closed)
 * - internal_shop_link_to_pop is true AND is_pop_blocked is true
 * - Platform emergency block is active
 */
export async function isInternalShopAvailable(): Promise<boolean> {
  const platform = await getPlatformSettings()
  
  if (!platform) {
    return false
  }
  
  // Check if shop is manually closed
  if (!(platform as any).is_internal_shop_open) {
    return false
  }
  
  // Check if linked to POP and POP is blocked
  if ((platform as any).internal_shop_link_to_pop && platform.is_pop_blocked) {
    return false
  }
  
  // Check platform-wide emergency block
  if (platform.emergency_block_active) {
    return false
  }
  
  return true
}

/**
 * Get internal shop settings for standalone order handling
 */
export async function getInternalShopSettings(): Promise<{
  isOpen: boolean
  standaloneEnabled: boolean
  deliveryFee: number
  minOrder: number
} | null> {
  const platform = await getPlatformSettings()
  
  if (!platform) {
    return null
  }
  
  const isOpen = await isInternalShopAvailable()
  
  return {
    isOpen,
    standaloneEnabled: (platform as any).internal_shop_standalone_enabled ?? false,
    deliveryFee: (platform as any).internal_shop_delivery_fee ?? 3.00,
    minOrder: (platform as any).internal_shop_min_order ?? 0,
  }
}

export type { PlatformSettings, Restaurant }
