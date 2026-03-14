"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Upload, CheckCircle, AlertCircle } from "lucide-react"

export default function ImportPage() {
  const [jsonData, setJsonData] = useState("")
  const [loading, setLoading] = useState(false)
  const [quickLoading, setQuickLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string; details?: any } | null>(null)

  const handleQuickImport = async () => {
    setQuickLoading(true)
    setResult(null)

    try {
      const response = await fetch("/api/import-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })

      const data = await response.json()

      if (response.ok) {
        setResult({ 
          success: true, 
          message: `Import completed! ${data.results?.restaurants || 0} restaurants, ${data.results?.categories || 0} categories, ${data.results?.items || 0} items, ${data.results?.options || 0} options, ${data.results?.choices || 0} choices`,
          details: data
        })
      } else {
        setResult({ 
          success: false, 
          message: data.error || data.message || "Import failed",
          details: data
        })
      }
    } catch (error: any) {
      setResult({ 
        success: false, 
        message: error.message || "Import failed" 
      })
    } finally {
      setQuickLoading(false)
    }
  }

  const handleImport = async () => {
    if (!jsonData.trim()) {
      setResult({ success: false, message: "Please paste JSON data to import" })
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const parsed = JSON.parse(jsonData)
      
      const response = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      })

      const data = await response.json()

      if (response.ok) {
        setResult({ 
          success: true, 
          message: `Successfully imported ${data.imported?.length || 0} restaurants`,
          details: data
        })
        setJsonData("")
      } else {
        setResult({ 
          success: false, 
          message: data.error || "Import failed",
          details: data
        })
      }
    } catch (error: any) {
      setResult({ 
        success: false, 
        message: error.message || "Invalid JSON or import failed" 
      })
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        setJsonData(event.target?.result as string)
      }
      reader.readAsText(file)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Import Restaurant Data
            </CardTitle>
            <CardDescription>
              Import restaurants with their categories, menu items, and options from JSON
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Quick Import Section */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-blue-900 mb-2">Quick Import</h3>
              <p className="text-sm text-blue-700 mb-3">
                Import all restaurant data from the pre-loaded JSON file
              </p>
              <Button 
                onClick={handleQuickImport} 
                disabled={quickLoading}
                variant="default"
                className="bg-blue-600 hover:bg-blue-700"
              >
                {quickLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing All Data...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Import All Restaurants
                  </>
                )}
              </Button>
            </div>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-muted-foreground">Or upload manually</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Upload JSON File
              </label>
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Or Paste JSON Data
              </label>
              <Textarea
                value={jsonData}
                onChange={(e) => setJsonData(e.target.value)}
                placeholder='[{"id": "restaurant-1", "name": "My Restaurant", ...}]'
                className="min-h-[300px] font-mono text-sm"
              />
            </div>

            {result && (
              <Alert variant={result.success ? "default" : "destructive"}>
                {result.success ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertDescription>
                  {result.message}
                  {result.details?.imported && (
                    <ul className="mt-2 text-sm">
                      {result.details.imported.map((r: any, i: number) => (
                        <li key={i}>
                          {r.name}: {r.categoriesCount} categories, {r.itemsCount} items
                        </li>
                      ))}
                    </ul>
                  )}
                </AlertDescription>
              </Alert>
            )}

            <Button onClick={handleImport} disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Import Data
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>API Endpoints</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 font-mono text-sm">
            <div>
              <p className="font-semibold text-slate-700">POST /api/import</p>
              <p className="text-slate-500">Import restaurant data from JSON array</p>
            </div>
            <div>
              <p className="font-semibold text-slate-700">GET /api/restaurants/[id]/menu</p>
              <p className="text-slate-500">Get full menu for a restaurant by ID or slug</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
