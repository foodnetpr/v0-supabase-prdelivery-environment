"use client"

import { useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  FileText,
  Download,
  Loader2,
  Printer,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from "lucide-react"

interface Restaurant {
  id: string
  name: string
  slug: string
}

interface ReportOrder {
  id: string
  orderNumber: string
  createdAt: string
  deliveryType: string
  status: string
  paymentMethod: string
  isPaid: boolean
  daypart: string
  subtotal: number
  tax: number
  tip: number
  deliveryFee: number
  total: number
  commission: number
  totalEarned: number
}

interface RestaurantReport {
  restaurantId: string
  restaurantName: string
  restaurantSlug: string
  commissionGeneral: number
  commissionDelivery: number
  commissionPickup: number
  orders: ReportOrder[]
  totals: {
    subtotal: number
    tax: number
    tip: number
    deliveryFee: number
    total: number
    commission: number
    totalEarned: number
  }
}

interface ReportData {
  restaurants: RestaurantReport[]
  meta: {
    startDate: string
    endDate: string
    totalOrders: number
  }
}

interface ReportsTabProps {
  restaurants: Restaurant[]
}

function fmt(n: number) {
  return n.toFixed(2)
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  })
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function weekAgo() {
  const d = new Date()
  d.setDate(d.getDate() - 6)
  return d.toISOString().slice(0, 10)
}

// Single restaurant invoice panel
function RestaurantInvoice({
  report,
  startDate,
  endDate,
}: {
  report: RestaurantReport
  startDate: string
  endDate: string
}) {
  const [expanded, setExpanded] = useState(true)
  const printRef = useRef<HTMLDivElement>(null)

  const handlePrint = () => {
    const content = printRef.current?.innerHTML
    if (!content) return
    const w = window.open("", "_blank")
    if (!w) return
    w.document.write(`
      <html>
        <head>
          <title>${report.restaurantName} Invoice</title>
          <style>
            body { font-family: Arial, sans-serif; font-size: 12px; margin: 24px; color: #1a1a1a; }
            table { width: 100%; border-collapse: collapse; }
            th { text-align: left; padding: 6px 8px; border-bottom: 2px solid #ddd; font-weight: 600; font-size: 11px; color: #555; }
            td { padding: 6px 8px; border-bottom: 1px solid #eee; }
            .totals-row td { font-weight: 700; border-top: 2px solid #ddd; background: #f5f5f5; }
            .summary { margin-top: 24px; border-top: 1px solid #ddd; padding-top: 12px; }
            .summary-row { display: flex; justify-content: space-between; padding: 4px 0; }
            .summary-row.total { font-weight: 700; font-size: 13px; border-top: 1px solid #ddd; margin-top: 8px; padding-top: 8px; }
            h1 { font-size: 18px; text-align: center; margin-bottom: 4px; }
            h2 { font-size: 13px; text-align: center; color: #555; margin-bottom: 20px; }
            .badge-paid { color: green; } .badge-unpaid { color: red; }
          </style>
        </head>
        <body>${content}</body>
      </html>
    `)
    w.document.close()
    w.focus()
    w.print()
    w.close()
  }

  // Commission is already computed per-order by the API using each restaurant's
  // own rates (delivery_discount_percent / pickup_discount_percent / restaurant_discount_percent).
  const commissionedOrders = report.orders

  const totals = commissionedOrders.reduce(
    (acc, o) => ({
      subtotal: acc.subtotal + o.subtotal,
      tax: acc.tax + o.tax,
      tip: acc.tip + o.tip,
      deliveryFee: acc.deliveryFee + o.deliveryFee,
      total: acc.total + o.total,
      commission: acc.commission + o.commission,
      totalEarned: acc.totalEarned + o.totalEarned,
    }),
    { subtotal: 0, tax: 0, tip: 0, deliveryFee: 0, total: 0, commission: 0, totalEarned: 0 }
  )

  // Derive a display rate for the invoice header. Show all three if they differ.
  const { commissionGeneral, commissionDelivery, commissionPickup } = report
  const rateLabel =
    commissionDelivery === 0 && commissionPickup === 0
      ? `${commissionGeneral}%`
      : `General ${commissionGeneral}% | Delivery ${commissionDelivery || commissionGeneral}% | Pickup ${commissionPickup || commissionGeneral}%`

  return (
    <Card className="border border-slate-200 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setExpanded((v) => !v)}
              className="flex items-center gap-2 text-left"
            >
              {expanded ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
              <CardTitle className="text-base font-semibold text-slate-900">
                {report.restaurantName}
              </CardTitle>
            </button>
            <a
              href={`/${report.restaurantSlug}/admin`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline text-xs flex items-center gap-0.5"
            >
              View Profile <ExternalLink className="h-3 w-3 ml-0.5" />
            </a>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {report.orders.length} orders
            </Badge>
            <Badge variant="outline" className="text-xs font-mono text-slate-600">
              Commission: {rateLabel}
            </Badge>
            <span className="text-sm font-semibold text-slate-700">
              ${fmt(totals.totalEarned)} earned
            </span>
            <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5">
              <Printer className="h-3.5 w-3.5" />
              Print
            </Button>
          </div>
        </div>
        {!expanded && (
          <p className="text-xs text-slate-500 ml-6">
            {formatDate(startDate)} – {formatDate(endDate)} &nbsp;|&nbsp;
            Subtotal ${fmt(totals.subtotal)} &nbsp;|&nbsp; Tax ${fmt(totals.tax)} &nbsp;|&nbsp; Total ${fmt(totals.totalEarned)}
          </p>
        )}
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0">
          <div ref={printRef}>
            {/* Print header */}
            <div className="hidden print:block text-center mb-6">
              <h1 className="text-xl font-bold">{report.restaurantName} Invoice</h1>
              <h2 className="text-sm text-slate-500">{formatDate(startDate)} – {formatDate(endDate)}</h2>
            </div>

            {/* Orders table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left py-2.5 px-3 font-semibold text-slate-600 w-8">#</th>
                    <th className="text-left py-2.5 px-3 font-semibold text-slate-600">Order #</th>
                    <th className="text-left py-2.5 px-3 font-semibold text-slate-600">Paid</th>
                    <th className="text-left py-2.5 px-3 font-semibold text-slate-600">Type</th>
                    <th className="text-left py-2.5 px-3 font-semibold text-slate-600">Date</th>
                    <th className="text-left py-2.5 px-3 font-semibold text-slate-600">Payment</th>
                    <th className="text-left py-2.5 px-3 font-semibold text-slate-600">Period</th>
                    <th className="text-right py-2.5 px-3 font-semibold text-slate-600">Commission</th>
                    <th className="text-right py-2.5 px-3 font-semibold text-slate-600">Sub-Total</th>
                    <th className="text-right py-2.5 px-3 font-semibold text-slate-600">Tip</th>
                    <th className="text-right py-2.5 px-3 font-semibold text-slate-600">Tax</th>
                    <th className="text-right py-2.5 px-3 font-semibold text-slate-600">Total</th>
                    <th className="text-right py-2.5 px-3 font-semibold text-slate-600">Total Earned</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {commissionedOrders.map((order, idx) => (
                    <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 text-slate-400">{idx + 1}.</td>
                      <td className="py-2.5 px-3 font-mono text-blue-600 font-medium">
                        {order.orderNumber || order.id.slice(0, 8)}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`font-semibold ${order.isPaid ? "text-green-600" : "text-red-500"}`}>
                          {order.isPaid ? "Yes" : "No"}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-700">{order.deliveryType}</td>
                      <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">{formatDate(order.createdAt)}</td>
                      <td className="py-2.5 px-3 text-slate-700">{order.paymentMethod}</td>
                      <td className="py-2.5 px-3 text-slate-600">{order.daypart}</td>
                      <td className="py-2.5 px-3 text-right text-slate-600">
                        {order.subtotal > 0
                          ? `${((order.commission / order.subtotal) * 100).toFixed(2)}%`
                          : "0.00%"}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-800">${fmt(order.subtotal)}</td>
                      <td className="py-2.5 px-3 text-right text-slate-800">${fmt(order.tip)}</td>
                      <td className="py-2.5 px-3 text-right text-slate-800">${fmt(order.tax)}</td>
                      <td className="py-2.5 px-3 text-right text-slate-800">${fmt(order.total)}</td>
                      <td className="py-2.5 px-3 text-right font-semibold text-slate-900">${fmt(order.totalEarned)}</td>
                    </tr>
                  ))}
                </tbody>
                {/* Totals row */}
                <tfoot>
                  <tr className="bg-slate-100 border-t-2 border-slate-300">
                    <td colSpan={7} className="py-2.5 px-3 text-right font-bold text-slate-700 text-xs">
                      Totals
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900">${fmt(totals.commission)}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900">${fmt(totals.subtotal)}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900">${fmt(totals.tip)}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900">${fmt(totals.tax)}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900">${fmt(totals.total)}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900">${fmt(totals.totalEarned)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Payment summary footer */}
            <div className="mt-6 border-t border-slate-200 pt-4">
              <p className="text-xs font-semibold text-slate-700 mb-3">Payment Information</p>
              <div className="ml-auto max-w-sm space-y-1">
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Subtotal of Delivery Sales</span>
                  <span>${fmt(totals.subtotal)}</span>
                </div>
                {totals.commission > 0 && (
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>Platform Commission ({rateLabel})</span>
                    <span>- ${fmt(totals.commission)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Plus Sales Tax Payable to State/Local Authority</span>
                  <span>${fmt(totals.tax)}</span>
                </div>
                {totals.tip > 0 && (
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>Restaurant Tips</span>
                    <span>${fmt(totals.tip)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-slate-900 border-t border-slate-300 pt-2 mt-2">
                  <span>Total Money Owed to Restaurant</span>
                  <span>${fmt(totals.totalEarned)}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}

// Platform-wide totals summary card
// Commission is already computed per-order with each restaurant's own rates.
function PlatformSummaryCard({ data }: { data: ReportData }) {
  const grandTotals = data.restaurants.reduce(
    (acc, r) => {
      r.orders.forEach((o) => {
        acc.subtotal += o.subtotal
        acc.tax += o.tax
        acc.tip += o.tip
        acc.total += o.total
        acc.commission += o.commission
        acc.totalEarned += o.totalEarned
        acc.orders++
      })
      return acc
    },
    { subtotal: 0, tax: 0, tip: 0, total: 0, commission: 0, totalEarned: 0, orders: 0 }
  )

  return (
    <Card className="border-2 border-slate-900 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold text-slate-900 uppercase tracking-wide">
          Platform Summary — {formatDate(data.meta.startDate)} to {formatDate(data.meta.endDate)}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
          {[
            { label: "Orders", value: grandTotals.orders.toString(), money: false },
            { label: "Subtotal", value: fmt(grandTotals.subtotal), money: true },
            { label: "Tax", value: fmt(grandTotals.tax), money: true },
            { label: "Tips", value: fmt(grandTotals.tip), money: true },
            { label: "Total Charged", value: fmt(grandTotals.total), money: true },
            { label: "Platform Commission", value: fmt(grandTotals.commission), money: true },
            { label: "Total Owed to Restaurants", value: fmt(grandTotals.totalEarned), money: true },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-xs text-slate-500 mb-0.5">{stat.label}</p>
              <p className="text-base font-bold text-slate-900">
                {stat.money ? "$" : ""}{stat.value}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function ReportsTab({ restaurants }: ReportsTabProps) {
  const [startDate, setStartDate] = useState(weekAgo())
  const [endDate, setEndDate] = useState(today())
  const [restaurantId, setRestaurantId] = useState("all")
  const [deliveryType, setDeliveryType] = useState("all")
  const [paymentMethod, setPaymentMethod] = useState("all")
  const [paidFilter, setPaidFilter] = useState("all")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reportData, setReportData] = useState<ReportData | null>(null)

  const handleGenerate = async () => {
    setIsLoading(true)
    setError(null)
    setReportData(null)
    try {
      const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
        restaurant_id: restaurantId,
        delivery_type: deliveryType,
        payment_method: paymentMethod,
        paid: paidFilter,
      })
      const res = await fetch(`/api/super-admin/reports?${params.toString()}`)
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error || "Failed to generate report")
      }
      const data: ReportData = await res.json()
      setReportData(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleExportCSV = () => {
    if (!reportData) return
    const rows: string[][] = [
      ["Restaurant", "Order #", "Date", "Type", "Payment", "Period", "Paid", "Subtotal", "Tax", "Tip", "Total", "Commission", "Total Earned"],
    ]
    reportData.restaurants.forEach((r) => {
      r.orders.forEach((o) => {
        rows.push([
          r.restaurantName,
          o.orderNumber || o.id.slice(0, 8),
          formatDate(o.createdAt),
          o.deliveryType,
          o.paymentMethod,
          o.daypart,
          o.isPaid ? "Yes" : "No",
          fmt(o.subtotal),
          fmt(o.tax),
          fmt(o.tip),
          fmt(o.total),
          fmt(o.commission),
          fmt(o.totalEarned),
        ])
      })
    })
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `report_${startDate}_to_${endDate}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-6 space-y-6">
      {/* Filter panel */}
      <Card className="border border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" />
            Generate Payout Report
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Date range */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                max={endDate}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
              />
            </div>

            {/* Restaurant */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">Restaurant</Label>
              <Select value={restaurantId} onValueChange={setRestaurantId}>
                <SelectTrigger>
                  <SelectValue placeholder="All restaurants" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Restaurants ({restaurants.length})</SelectItem>
                  {restaurants
                    .slice()
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Order Type */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">Order Type</Label>
              <Select value={deliveryType} onValueChange={setDeliveryType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="delivery">Delivery</SelectItem>
                  <SelectItem value="pickup">Pickup</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Payment Method */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  <SelectItem value="CREDIT">Credit Card</SelectItem>
                  <SelectItem value="ATHMOVIL">ATH Movil</SelectItem>
                  <SelectItem value="CASH">Cash</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Paid status */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">Paid Status</Label>
              <Select value={paidFilter} onValueChange={setPaidFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Paid & Unpaid</SelectItem>
                  <SelectItem value="paid">Paid Only</SelectItem>
                  <SelectItem value="unpaid">Unpaid Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Quick date presets */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">Quick Range</Label>
              <div className="flex gap-1.5 flex-wrap">
                {[
                  { label: "Today", days: 0 },
                  { label: "Last 7d", days: 6 },
                  { label: "Last 30d", days: 29 },
                ].map(({ label, days }) => (
                  <button
                    key={label}
                    onClick={() => {
                      const end = new Date()
                      const start = new Date()
                      start.setDate(start.getDate() - days)
                      setEndDate(end.toISOString().slice(0, 10))
                      setStartDate(start.toISOString().slice(0, 10))
                    }}
                    className="px-2.5 py-1 text-xs border border-slate-200 rounded-md hover:bg-slate-100 transition-colors text-slate-600"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-5 pt-4 border-t border-slate-100">
            <Button
              onClick={handleGenerate}
              disabled={isLoading}
              className="bg-slate-900 hover:bg-slate-800 text-white gap-2"
            >
              {isLoading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Generating...</>
              ) : (
                <><FileText className="h-4 w-4" /> Generate Report</>
              )}
            </Button>
            {reportData && (
              <Button variant="outline" onClick={handleExportCSV} className="gap-2">
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Results */}
      {reportData && (
        <div className="space-y-4">
          {/* Platform summary */}
          {reportData.restaurants.length > 0 && (
            <PlatformSummaryCard data={reportData} />
          )}

          {/* No results */}
          {reportData.restaurants.length === 0 && (
            <Card className="border border-slate-200">
              <CardContent className="py-12 text-center">
                <FileText className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">No orders found for the selected date range and filters.</p>
              </CardContent>
            </Card>
          )}

          {/* Per-restaurant invoices */}
          {reportData.restaurants
            .filter((r) => r.orders.length > 0)
            .map((r) => (
              <RestaurantInvoice
                key={r.restaurantId}
                report={r}
                startDate={reportData.meta.startDate}
                endDate={reportData.meta.endDate}
              />
            ))}
        </div>
      )}
    </div>
  )
}
