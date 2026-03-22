"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { CheckCircle, XCircle, Loader2, Upload, FileText, Users } from "lucide-react"

type RowStatus = "pending" | "running" | "success" | "skipped" | "error"

type CustomerRow = {
  firstName: string
  lastName: string
  email: string
  phone: string
  status: RowStatus
  error?: string
  skipReason?: string
}

type ParsedCustomer = {
  firstName: string
  lastName: string
  email: string
  phone: string
  address1: string
  address2: string
  city: string
  state: string
  zip: string
}

function normalizePhone(raw: string): string | null {
  if (!raw) return null
  // Strip all non-numeric characters
  const digits = raw.replace(/\D/g, "")
  if (digits.length === 10) {
    // 10 digits: prefix with +1
    return `+1${digits}`
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    // 11 digits starting with 1: prefix with +
    return `+${digits}`
  }
  // Invalid phone format
  return null
}

function validateEmail(email: string): boolean {
  return email.includes("@")
}

export default function ImportCustomersPage() {
  const [rows, setRows] = useState<CustomerRow[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [summary, setSummary] = useState<{ success: number; skipped: number; errors: number; total: number } | null>(null)
  const [fileLabel, setFileLabel] = useState<string | null>(null)
  const [preview, setPreview] = useState<ParsedCustomer[]>([])
  const [validCount, setValidCount] = useState(0)
  const parsedDataRef = useRef<ParsedCustomer[] | null>(null)
  const abortRef = useRef(false)
  const [wasAborted, setWasAborted] = useState(false)
  const lastProcessedIndexRef = useRef<number>(-1)

  function parseCSV(text: string): ParsedCustomer[] {
    const lines = text.split(/\r?\n/).filter((line) => line.trim())
    if (lines.length < 2) return []

    // Parse header - look for columns with spaces
    const header = lines[0].split(",").map((h) => h.trim().toLowerCase())
    const firstNameIdx = header.findIndex((h) => h === "first name" || h === "firstname")
    const lastNameIdx = header.findIndex((h) => h === "last name" || h === "lastname")
    const phoneIdx = header.findIndex((h) => h === "phone")
    const emailIdx = header.findIndex((h) => h === "email")
    const address1Idx = header.findIndex((h) => h === "address 1" || h === "address1" || h === "address")
    const address2Idx = header.findIndex((h) => h === "address 2" || h === "address2" || h === "apt" || h === "suite")
    const cityIdx = header.findIndex((h) => h === "city")
    const stateIdx = header.findIndex((h) => h === "state")
    const zipIdx = header.findIndex((h) => h === "zip" || h === "zipcode" || h === "postal code" || h === "postalcode")

    if (firstNameIdx === -1 && lastNameIdx === -1 && phoneIdx === -1 && emailIdx === -1) {
      alert("CSV must have columns: first name, last name, phone, email")
      return []
    }

    const customers: ParsedCustomer[] = []
    for (let i = 1; i < lines.length; i++) {
      // Simple CSV parsing (handles basic cases)
      const values = lines[i].split(",").map((v) => v.trim().replace(/^"|"$/g, ""))
      
      customers.push({
        firstName: firstNameIdx >= 0 ? values[firstNameIdx] || "" : "",
        lastName: lastNameIdx >= 0 ? values[lastNameIdx] || "" : "",
        email: emailIdx >= 0 ? values[emailIdx] || "" : "",
        phone: phoneIdx >= 0 ? values[phoneIdx] || "" : "",
        address1: address1Idx >= 0 ? values[address1Idx] || "" : "",
        address2: address2Idx >= 0 ? values[address2Idx] || "" : "",
        city: cityIdx >= 0 ? values[cityIdx] || "" : "",
        state: stateIdx >= 0 ? values[stateIdx] || "" : "",
        zip: zipIdx >= 0 ? values[zipIdx] || "" : "",
      })
    }

    return customers
  }

  function isValidRow(customer: ParsedCustomer): { valid: boolean; skipReason?: string } {
    const hasEmail = customer.email.trim().length > 0
    const hasPhone = customer.phone.trim().length > 0

    // Skip if both email AND phone are empty
    if (!hasEmail && !hasPhone) {
      return { valid: false, skipReason: "No email or phone" }
    }

    // Skip if email exists but has no @ symbol
    if (hasEmail && !validateEmail(customer.email)) {
      return { valid: false, skipReason: "Invalid email format" }
    }

    return { valid: true }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setFileLabel(null)
    setPreview([])
    setValidCount(0)
    parsedDataRef.current = null
    setSummary(null)
    setRows([])

    try {
      const text = await file.text()
      const parsed = parseCSV(text)

      if (parsed.length === 0) {
        alert("No valid data found in CSV file.")
        return
      }

      parsedDataRef.current = parsed
      setPreview(parsed.slice(0, 5))

      // Count valid rows
      const valid = parsed.filter((c) => isValidRow(c).valid).length
      setValidCount(valid)
      setFileLabel(`${file.name} — ${parsed.length} rows found, ${valid} valid for import`)
    } catch (err) {
      alert("Error reading CSV file.")
    }
  }

  async function handleImport(e: React.FormEvent, resumeFromIndex: number = 0) {
    e.preventDefault()
    const data = parsedDataRef.current
    if (!data || data.length === 0) {
      alert("No data loaded — please select a valid CSV file first.")
      return
    }

    abortRef.current = false
    setWasAborted(false)
    
    // If resuming, keep existing rows state but reset pending ones
    if (resumeFromIndex === 0) {
      setSummary(null)
      setProgress(0)
      setRows(
        data.map((c) => ({
          firstName: c.firstName,
          lastName: c.lastName,
          email: c.email,
          phone: c.phone,
          status: "pending",
        }))
      )
    } else {
      setSummary(null)
    }
    
    setIsRunning(true)

    // Count existing successes/skips/errors if resuming
    let success = resumeFromIndex > 0 ? rows.filter((r, i) => i < resumeFromIndex && r.status === "success").length : 0
    let skipped = resumeFromIndex > 0 ? rows.filter((r, i) => i < resumeFromIndex && r.status === "skipped").length : 0
    let errors = resumeFromIndex > 0 ? rows.filter((r, i) => i < resumeFromIndex && r.status === "error").length : 0

    for (let i = resumeFromIndex; i < data.length; i++) {
      if (abortRef.current) break

      const customer = data[i]
      const validation = isValidRow(customer)

      if (!validation.valid) {
        skipped++
        setRows((prev) =>
          prev.map((r, idx) =>
            idx === i ? { ...r, status: "skipped", skipReason: validation.skipReason } : r
          )
        )
        setProgress(Math.round(((i + 1) / data.length) * 100))
        continue
      }

      setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, status: "running" } : r)))

      try {
        const normalizedPhone = normalizePhone(customer.phone)

        const res = await fetch("/api/import-customers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName: customer.firstName,
            lastName: customer.lastName,
            email: customer.email.trim() || null,
            phone: normalizedPhone,
            address1: customer.address1.trim() || null,
            address2: customer.address2.trim() || null,
            city: customer.city.trim() || null,
            state: customer.state.trim() || null,
            zip: customer.zip.trim() || null,
          }),
        })

        const json = await res.json()

        if (!res.ok || json.error) {
          errors++
          setRows((prev) =>
            prev.map((r, idx) =>
              idx === i ? { ...r, status: "error", error: json.error ?? `HTTP ${res.status}` } : r
            )
          )
        } else {
          success++
          setRows((prev) =>
            prev.map((r, idx) => (idx === i ? { ...r, status: "success" } : r))
          )
        }
      } catch (err: any) {
        errors++
        setRows((prev) =>
          prev.map((r, idx) =>
            idx === i ? { ...r, status: "error", error: err.message } : r
          )
        )
      }

      setProgress(Math.round(((i + 1) / data.length) * 100))
      lastProcessedIndexRef.current = i
    }

    // Check if we were aborted
    if (abortRef.current) {
      setWasAborted(true)
    } else {
      setSummary({ success, skipped, errors, total: data.length })
    }
    setIsRunning(false)
  }

  function handleResume(e: React.FormEvent) {
    // Resume from the next unprocessed row
    const startIndex = lastProcessedIndexRef.current + 1
    handleImport(e, startIndex)
  }

  const completed = rows.filter((r) => r.status !== "pending" && r.status !== "running").length

  return (
    <main className="min-h-screen bg-background p-8 font-sans">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Users className="h-6 w-6" />
            Customer Import
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Upload a CSV file with columns: <code className="bg-muted px-1 py-0.5 rounded text-xs">first name</code>,{" "}
            <code className="bg-muted px-1 py-0.5 rounded text-xs">last name</code>,{" "}
            <code className="bg-muted px-1 py-0.5 rounded text-xs">phone</code>,{" "}
            <code className="bg-muted px-1 py-0.5 rounded text-xs">email</code>,{" "}
            <code className="bg-muted px-1 py-0.5 rounded text-xs">address 1</code>,{" "}
            <code className="bg-muted px-1 py-0.5 rounded text-xs">address 2</code>,{" "}
            <code className="bg-muted px-1 py-0.5 rounded text-xs">city</code>,{" "}
            <code className="bg-muted px-1 py-0.5 rounded text-xs">state</code>,{" "}
            <code className="bg-muted px-1 py-0.5 rounded text-xs">zip</code>
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Select CSV File
            </CardTitle>
            <CardDescription>
              Each customer is created as a Supabase Auth user and added to the profiles table.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleImport} className="flex flex-wrap items-center gap-3">
              <input
                type="file"
                accept=".csv,text/csv"
                disabled={isRunning}
                onChange={handleFileChange}
                className="text-sm text-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium file:bg-muted file:text-foreground hover:file:bg-muted/70 cursor-pointer disabled:opacity-50"
              />
              <Button type="submit" disabled={isRunning || !parsedDataRef.current} className="gap-2">
                {isRunning ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Importing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" /> Start Import
                  </>
                )}
              </Button>
              {isRunning && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    abortRef.current = true
                  }}
                >
                  Stop
                </Button>
              )}
              {wasAborted && !isRunning && (
                <Button
                  type="button"
                  variant="default"
                  onClick={handleResume}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Resume Import
                </Button>
              )}
            </form>
            {fileLabel && <p className="mt-2 text-xs text-green-700 font-medium">{fileLabel}</p>}
          </CardContent>
        </Card>

        {/* Preview */}
        {preview.length > 0 && !isRunning && !summary && (
          <Card>
            <CardHeader>
              <CardTitle>Preview (First 5 Rows)</CardTitle>
              <CardDescription>{validCount} valid rows ready for import</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2">First Name</th>
                      <th className="text-left py-2 px-2">Last Name</th>
                      <th className="text-left py-2 px-2">Email</th>
                      <th className="text-left py-2 px-2">Phone</th>
                      <th className="text-left py-2 px-2">Address</th>
                      <th className="text-left py-2 px-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((c, i) => {
                      const validation = isValidRow(c)
                      const addressParts = [c.address1, c.city, c.state, c.zip].filter(Boolean)
                      return (
                        <tr key={i} className="border-b">
                          <td className="py-2 px-2">{c.firstName || "-"}</td>
                          <td className="py-2 px-2">{c.lastName || "-"}</td>
                          <td className="py-2 px-2">{c.email || "-"}</td>
                          <td className="py-2 px-2">{c.phone || "-"}</td>
                          <td className="py-2 px-2 max-w-[200px] truncate" title={addressParts.join(", ")}>
                            {addressParts.length > 0 ? addressParts.join(", ") : "-"}
                          </td>
                          <td className="py-2 px-2">
                            {validation.valid ? (
                              <span className="text-green-600 text-xs">Valid</span>
                            ) : (
                              <span className="text-amber-600 text-xs">{validation.skipReason}</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Progress */}
        {rows.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Progress</CardTitle>
                <span className="text-sm tabular-nums text-muted-foreground">
                  {completed} / {rows.length}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Progress value={progress} className="h-2" />

              {wasAborted && !isRunning && (
                <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 space-y-2">
                  <p className="font-semibold text-amber-800">Import Paused</p>
                  <p className="text-sm text-amber-700">
                    Processed {lastProcessedIndexRef.current + 1} of {rows.length} rows.
                    Click "Resume Import" to continue from where you left off.
                  </p>
                  <div className="grid grid-cols-3 gap-4 text-center mt-3">
                    <div>
                      <p className="text-2xl font-bold text-green-600">{rows.filter(r => r.status === "success").length}</p>
                      <p className="text-xs text-muted-foreground">Imported</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-amber-600">{rows.filter(r => r.status === "skipped").length}</p>
                      <p className="text-xs text-muted-foreground">Skipped</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-400">{rows.filter(r => r.status === "pending").length}</p>
                      <p className="text-xs text-muted-foreground">Remaining</p>
                    </div>
                  </div>
                </div>
              )}

              {summary && (
                <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                  <p className="font-semibold">Import Complete</p>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-green-600">{summary.success}</p>
                      <p className="text-xs text-muted-foreground">Imported</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-amber-600">{summary.skipped}</p>
                      <p className="text-xs text-muted-foreground">Skipped</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-red-600">{summary.errors}</p>
                      <p className="text-xs text-muted-foreground">Errors</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="max-h-[420px] overflow-y-auto divide-y divide-border rounded border">
                {rows.map((r, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      {r.status === "success" && <CheckCircle className="h-4 w-4 shrink-0 text-green-600" />}
                      {r.status === "error" && <XCircle className="h-4 w-4 shrink-0 text-red-500" />}
                      {r.status === "skipped" && (
                        <span className="h-4 w-4 shrink-0 flex items-center justify-center text-amber-500">—</span>
                      )}
                      {r.status === "running" && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-blue-500" />}
                      {r.status === "pending" && (
                        <span className="h-4 w-4 shrink-0 flex items-center justify-center text-muted-foreground">·</span>
                      )}
                      <span
                        className={`truncate font-medium ${r.status === "pending" ? "text-muted-foreground" : "text-foreground"}`}
                      >
                        {r.firstName} {r.lastName}
                      </span>
                      <span className="text-xs text-muted-foreground truncate">{r.email || r.phone}</span>
                    </div>
                    <div className="shrink-0 text-xs">
                      {r.error && <span className="text-red-500">{r.error}</span>}
                      {r.skipReason && <span className="text-amber-500">{r.skipReason}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  )
}
