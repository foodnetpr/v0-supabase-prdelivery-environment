"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { CheckCircle, XCircle, Loader2, Upload } from "lucide-react"

type RowStatus = "pending" | "running" | "done" | "error"

type RestaurantRow = {
  name: string
  status: RowStatus
  categories?: number
  items?: number
  options?: number
  choices?: number
  error?: string
}

export default function ImportPage() {
  const [rows, setRows] = useState<RestaurantRow[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [summary, setSummary] = useState<{ done: number; errors: number; total: number } | null>(null)
  const [fileLabel, setFileLabel] = useState<string | null>(null)
  // Parsed data lives in a ref so re-renders never lose it
  const parsedDataRef = useRef<any[] | null>(null)
  const abortRef = useRef(false)

  function updateRow(i: number, patch: Partial<RestaurantRow>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  }

  // Parse the file as soon as it's selected — don't wait for submit
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileLabel(null)
    parsedDataRef.current = null
    try {
      const text = await file.text()
      const parsed = JSON.parse(text)
      if (!Array.isArray(parsed)) {
        alert("JSON must be a top-level array of restaurant entries.")
        return
      }
      parsedDataRef.current = parsed
      // Expose to window for console testing
      ;(window as any)._parsedData = parsed
      setFileLabel(`${file.name} — ${parsed.length} restaurants ready`)
      console.log("[v0] data length:", parsed.length, "first entry keys:", Object.keys(parsed[0] ?? {}))
    } catch {
      alert("Invalid JSON — could not parse file.")
    }
  }

  async function handleImport(e: React.FormEvent) {
    e.preventDefault()
    const data = parsedDataRef.current
    if (!data || data.length === 0) {
      alert("No data loaded — please select a valid JSON file first.")
      return
    }

    console.log("[v0] Starting import, data length:", data.length)

    abortRef.current = false
    setSummary(null)
    setProgress(0)
    setRows(data.map((entry: any) => ({ name: entry?.restaurant?.name ?? "Unknown", status: "pending" })))
    setIsRunning(true)

    let done = 0
    let errors = 0

    for (let i = 0; i < data.length; i++) {
      if (abortRef.current) break

      updateRow(i, { status: "running" })

      try {
        // POST single restaurant entry to /api/import-restaurant
        const res = await fetch("/api/import-restaurant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data[i]),
        })
        const json = await res.json()

        if (!res.ok || json.error) {
          errors++
          updateRow(i, { status: "error", error: json.error ?? `HTTP ${res.status}` })
        } else {
          done++
          updateRow(i, {
            status: "done",
            categories: json.results?.categories ?? 0,
            items: json.results?.items ?? 0,
            options: json.results?.options ?? 0,
            choices: json.results?.choices ?? 0,
          })
        }
      } catch (err: any) {
        errors++
        updateRow(i, { status: "error", error: err.message })
      }

      setProgress(Math.round(((i + 1) / data.length) * 100))
    }

    setSummary({ done, errors, total: data.length })
    setIsRunning(false)
  }

  const completed = rows.filter((r) => r.status === "done" || r.status === "error").length

  return (
    <main className="min-h-screen bg-background p-8 font-sans">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Restaurant Import</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Upload <code className="bg-muted px-1 py-0.5 rounded text-xs">foodnet_import_complete.json</code> — the
            browser reads it locally and sends each restaurant individually to avoid server timeouts.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Select File</CardTitle>
            <CardDescription>
              Each restaurant is sent to{" "}
              <code className="bg-muted px-1 py-0.5 rounded text-xs">/api/import-restaurant</code> one at a time.
              59 restaurants takes roughly 1–2 minutes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleImport} className="flex flex-wrap items-center gap-3">
              <input
                type="file"
                accept=".json,application/json"
                disabled={isRunning}
                onChange={handleFileChange}
                className="text-sm text-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium file:bg-muted file:text-foreground hover:file:bg-muted/70 cursor-pointer disabled:opacity-50"
              />
              <Button type="submit" disabled={isRunning || !parsedDataRef.current} className="gap-2">
                {isRunning ? <><Loader2 className="h-4 w-4 animate-spin" /> Importing...</> : <><Upload className="h-4 w-4" /> Start Import</>}
              </Button>
              {isRunning && (
                <Button type="button" variant="outline" onClick={() => { abortRef.current = true }}>
                  Stop
                </Button>
              )}
            </form>
            {fileLabel && (
              <p className="mt-2 text-xs text-green-700 font-medium">{fileLabel}</p>
            )}
          </CardContent>
        </Card>

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

              {summary && (
                <p className={`text-sm font-medium ${summary.errors > 0 ? "text-amber-600" : "text-green-700"}`}>
                  Done — {summary.done} succeeded, {summary.errors} failed out of {summary.total}
                </p>
              )}

              <div className="max-h-[420px] overflow-y-auto divide-y divide-border rounded border">
                {rows.map((r, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      {r.status === "done" && <CheckCircle className="h-4 w-4 shrink-0 text-green-600" />}
                      {r.status === "error" && <XCircle className="h-4 w-4 shrink-0 text-red-500" />}
                      {r.status === "running" && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-blue-500" />}
                      {r.status === "pending" && <span className="h-4 w-4 shrink-0 flex items-center justify-center text-muted-foreground">·</span>}
                      <span className={`truncate font-medium ${r.status === "pending" ? "text-muted-foreground" : "text-foreground"}`}>
                        {r.name}
                      </span>
                      {r.error && <span className="truncate text-xs text-red-500">{r.error}</span>}
                    </div>
                    {r.status === "done" && (
                      <span className="shrink-0 tabular-nums text-xs text-muted-foreground">
                        {r.categories}c {r.items}i {r.options}o {r.choices}ch
                      </span>
                    )}
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
