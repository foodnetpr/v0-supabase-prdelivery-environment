import { NextResponse } from "next/server"
import { isInternalShopAvailable, getInternalShopSettings } from "@/lib/availability"

export async function GET() {
  try {
    const isAvailable = await isInternalShopAvailable()
    const settings = await getInternalShopSettings()
    
    return NextResponse.json({
      available: isAvailable,
      standaloneEnabled: settings?.standaloneEnabled ?? false,
      deliveryFee: settings?.deliveryFee ?? 3.00,
      minOrder: settings?.minOrder ?? 0,
    })
  } catch (error: any) {
    console.error("Error checking shop availability:", error)
    return NextResponse.json({ 
      available: false,
      error: error.message 
    }, { status: 500 })
  }
}
