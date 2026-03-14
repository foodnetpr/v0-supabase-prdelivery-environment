# Shipday Integration Export

Complete integration files for adding Shipday delivery dispatch to your project.

---

## 1. Database Migration (SQL)

Run this in your Supabase SQL Editor:

```sql
-- Add Shipday columns to your tables
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS shipday_api_key TEXT;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS shipday_api_key TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipday_order_id TEXT;
```

---

## 2. API Route: `/app/api/shipday/test-connection/route.ts`

Create this file:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// Test Shipday connection and optionally send a test order
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { restaurantId, branchId, orderId, mode = "test" } = body

    // mode: "test" = just test API connection, "send" = send actual order to Shipday

    const supabase = await createClient()

    // Get restaurant data
    const { data: restaurant, error: restaurantError } = await supabase
      .from("restaurants")
      .select("id, name, shipday_api_key, address, city, state, zip, phone")
      .eq("id", restaurantId)
      .single()

    if (restaurantError || !restaurant) {
      return NextResponse.json({ success: false, error: "Restaurant not found" }, { status: 404 })
    }

    // Get branch data if provided
    let branch = null
    if (branchId) {
      const { data: branchData } = await supabase
        .from("branches")
        .select("id, name, shipday_api_key, address, city, state, zip, phone")
        .eq("id", branchId)
        .single()
      branch = branchData
    }

    // Determine API key (branch > restaurant > env)
    const apiKey = branch?.shipday_api_key || restaurant.shipday_api_key || process.env.SHIPDAY_API_KEY

    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: "No Shipday API key configured",
        details: {
          branchKey: !!branch?.shipday_api_key,
          restaurantKey: !!restaurant.shipday_api_key,
          envKey: !!process.env.SHIPDAY_API_KEY,
        }
      }, { status: 400 })
    }

    // Test mode: just verify API connection
    if (mode === "test") {
      const testResponse = await fetch("https://api.shipday.com/carriers", {
        method: "GET",
        headers: {
          "Authorization": `Basic ${apiKey}`,
          "Content-Type": "application/json",
        },
      })

      if (testResponse.ok) {
        const carriers = await testResponse.json()
        return NextResponse.json({
          success: true,
          message: "Shipday connection successful!",
          apiKeySource: branch?.shipday_api_key ? "branch" : restaurant.shipday_api_key ? "restaurant" : "environment",
          carriersFound: Array.isArray(carriers) ? carriers.length : 0,
        })
      } else {
        const errorText = await testResponse.text()
        return NextResponse.json({
          success: false,
          error: "Shipday API connection failed",
          status: testResponse.status,
          details: errorText,
        }, { status: 400 })
      }
    }

    // Send mode: create actual Shipday order from existing order
    if (mode === "send" && orderId) {
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .select(`
          *,
          order_items (*)
        `)
        .eq("id", orderId)
        .single()

      if (orderError || !order) {
        return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 })
      }

      // Check if delivery order - adjust field names to match your schema
      if (order.order_type !== "delivery" && order.delivery_type !== "delivery") {
        return NextResponse.json({ success: false, error: "Order is not a delivery order" }, { status: 400 })
      }

      // Build pickup address from branch or restaurant
      const pickupAddress = branch 
        ? `${branch.address}, ${branch.city}, ${branch.state} ${branch.zip}`
        : `${restaurant.address}, ${restaurant.city}, ${restaurant.state} ${restaurant.zip}`

      // Build order items description
      const itemsDescription = order.order_items
        ?.map((item: any) => `${item.quantity}x ${item.name}`)
        .join(", ") || "Order"

      // Format time as HH:MM:SS (Shipday requires this format)
      const formatTime = (time: string | null) => {
        if (!time) return "12:00:00"
        if (time.match(/^\d{2}:\d{2}:\d{2}$/)) return time
        if (time.match(/^\d{2}:\d{2}$/)) return `${time}:00`
        return "12:00:00"
      }

      // Create Shipday order payload
      // IMPORTANT: Numbers must be numbers, not strings!
      const shipdayPayload = {
        orderNumber: `ORD-${order.id.slice(0, 8).toUpperCase()}`,
        customerName: order.customer_name || "Customer",
        customerPhoneNumber: order.customer_phone || "",
        customerEmail: order.customer_email || "",
        customerAddress: order.delivery_address || "",
        deliveryInstruction: order.special_instructions || "",
        restaurantName: restaurant.name,
        restaurantAddress: pickupAddress,
        restaurantPhoneNumber: branch?.phone || restaurant.phone || "",
        expectedDeliveryDate: order.order_date || new Date().toISOString().split("T")[0],
        expectedDeliveryTime: formatTime(order.order_time),
        expectedPickupTime: formatTime(order.order_time),
        orderItem: [{
          name: itemsDescription,
          quantity: 1,
          unitPrice: Number(order.total_amount) || 0,
        }],
        tips: Number(order.tip_amount) || 0,
        tax: Number(order.tax_amount) || 0,
        discountAmount: 0,
        deliveryFee: Number(order.delivery_fee) || 0,
        totalOrderCost: Number(order.total_amount) || 0,
        paymentMethod: "credit_card",
        orderSource: "YourAppName", // Change this to your app name
      }

      const shipdayResponse = await fetch("https://api.shipday.com/orders", {
        method: "POST",
        headers: {
          "Authorization": `Basic ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(shipdayPayload),
      })

      const responseText = await shipdayResponse.text()

      if (shipdayResponse.ok) {
        let shipdayResult
        try {
          shipdayResult = JSON.parse(responseText)
        } catch {
          shipdayResult = { raw: responseText }
        }
        
        const shipdayOrderId = shipdayResult.orderId || shipdayResult.orderNumber || shipdayResult.id || shipdayResult.orderID
        
        if (shipdayOrderId) {
          await supabase
            .from("orders")
            .update({ shipday_order_id: String(shipdayOrderId) })
            .eq("id", orderId)
        }

        return NextResponse.json({
          success: true,
          message: "Order sent to Shipday successfully!",
          shipdayOrderId: shipdayOrderId || "Created (check Shipday dashboard)",
          shipdayResponse: shipdayResult,
        })
      } else {
        return NextResponse.json({
          success: false,
          error: "Failed to create Shipday order",
          status: shipdayResponse.status,
          details: responseText,
        }, { status: 400 })
      }
    }

    return NextResponse.json({ success: false, error: "Invalid mode or missing orderId" }, { status: 400 })

  } catch (error) {
    console.error("[Shipday] Error:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 })
  }
}
```

---

## 3. React State (Add to your admin component)

```tsx
// State variables
const [shipdayTestStatus, setShipdayTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle")
const [shipdayTestMessage, setShipdayTestMessage] = useState("")

// Test connection handler
const handleTestShipday = async (branchId?: string) => {
  setShipdayTestStatus("testing")
  setShipdayTestMessage("Testing connection...")
  try {
    const res = await fetch("/api/shipday/test-connection", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        restaurantId: restaurant.id,
        branchId: branchId || null,
        mode: "test",
      }),
    })
    const data = await res.json()
    if (data.success) {
      setShipdayTestStatus("success")
      setShipdayTestMessage(`Connection successful! API key source: ${data.apiKeySource}`)
    } else {
      setShipdayTestStatus("error")
      setShipdayTestMessage(data.error || "Connection failed")
    }
  } catch (err) {
    setShipdayTestStatus("error")
    setShipdayTestMessage(err instanceof Error ? err.message : "Unknown error")
  }
}
```

---

## 4. Settings UI - Shipday API Key Input

```tsx
{/* Shipday Integration Section */}
<div className="border-t pt-4">
  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
    Shipday Integration
  </h3>
  <div className="space-y-2">
    <Label>Shipday API Key</Label>
    <Input
      type="password"
      value={settingsForm.shipday_api_key || ""}
      onChange={(e) => setSettingsForm({ ...settingsForm, shipday_api_key: e.target.value })}
      placeholder="Enter Shipday API key"
    />
    <div className="flex items-center gap-2 mt-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => handleTestShipday()}
        disabled={shipdayTestStatus === "testing"}
      >
        {shipdayTestStatus === "testing" ? "Testing..." : "Test Connection"}
      </Button>
      {shipdayTestStatus === "success" && (
        <span className="text-sm text-green-600">{shipdayTestMessage}</span>
      )}
      {shipdayTestStatus === "error" && (
        <span className="text-sm text-red-600">{shipdayTestMessage}</span>
      )}
    </div>
  </div>
</div>
```

---

## 5. Send to Shipday Button (On Order Cards)

```tsx
import { Truck } from "lucide-react"

{/* Show for delivery orders */}
{(order.order_type === "delivery" || order.delivery_type === "delivery") && (
  <div className="mt-2 pt-2 border-t flex items-center gap-2">
    <Button
      variant="outline"
      size="sm"
      className="gap-1.5 text-xs"
      disabled={shipdayTestStatus === "testing"}
      onClick={async () => {
        setShipdayTestStatus("testing")
        setShipdayTestMessage("Sending to Shipday...")
        try {
          const res = await fetch("/api/shipday/test-connection", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              restaurantId: restaurant.id,
              orderId: order.id,
              mode: "send",
            }),
          })
          const data = await res.json()
          if (data.success) {
            setShipdayTestStatus("success")
            setShipdayTestMessage(`Sent! Shipday ID: ${data.shipdayOrderId}`)
            toast({ title: "Shipday", description: `Order sent. ID: ${data.shipdayOrderId}` })
          } else {
            setShipdayTestStatus("error")
            setShipdayTestMessage(data.error || "Failed")
            toast({ title: "Shipday Error", description: data.error, variant: "destructive" })
          }
        } catch (err) {
          setShipdayTestStatus("error")
          setShipdayTestMessage(err instanceof Error ? err.message : "Error")
        }
      }}
    >
      <Truck className="h-3.5 w-3.5" />
      {shipdayTestStatus === "testing" ? "Sending..." : "Send to Shipday"}
    </Button>
    {shipdayTestStatus === "success" && <span className="text-xs text-green-600">{shipdayTestMessage}</span>}
    {shipdayTestStatus === "error" && <span className="text-xs text-red-600">{shipdayTestMessage}</span>}
  </div>
)}
```

---

## 6. Important Notes

### Field Mapping
Adjust these field names to match your database schema:
- `order.order_type` or `order.delivery_type` - field that indicates delivery vs pickup
- `order.customer_name`, `order.customer_phone`, `order.customer_email`
- `order.delivery_address`
- `order.order_date`, `order.order_time`
- `order.total_amount`, `order.tip_amount`, `order.tax_amount`, `order.delivery_fee`
- `order.special_instructions`

### Critical: Payload Data Types
Shipday API requires:
- **Numbers must be actual numbers** (not strings): `quantity: 1`, `unitPrice: 25.00`
- **Time format must be HH:MM:SS**: `"14:30:00"` not `"14:30"`
- **paymentMethod must be lowercase**: `"credit_card"` not `"CREDIT_CARD"`

### API Key Priority
1. Branch-level key (if set)
2. Restaurant-level key (if set)  
3. Environment variable `SHIPDAY_API_KEY`

---

## 7. Environment Variable (Optional)

Add to your `.env.local` or Vercel environment:

```
SHIPDAY_API_KEY=your_default_api_key_here
```

This serves as a fallback when no restaurant/branch-specific key is configured.
