"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Download } from "lucide-react"

interface CSVItem {
  category_name: string
  item_name: string
  description: string
  price: number
  is_active: boolean
  rowNumber: number
  errors: string[]
}

interface CSVUploadModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImport: (items: CSVItem[]) => Promise<void>
}

export function CSVUploadModal({ open, onOpenChange, onImport }: CSVUploadModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [parsedItems, setParsedItems] = useState<CSVItem[]>([])
  const [parseError, setParseError] = useState<string | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const resetState = () => {
    setFile(null)
    setParsedItems([])
    setParseError(null)
    setImportResult(null)
  }

  const handleClose = () => {
    resetState()
    onOpenChange(false)
  }

  const parseCSV = (text: string): CSVItem[] => {
    const lines = text.split(/\r?\n/).filter((line) => line.trim())
    if (lines.length < 2) {
      throw new Error("CSV must have a header row and at least one data row")
    }

    // Parse header
    const header = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/['"]/g, ""))
    const requiredColumns = ["category_name", "item_name", "price"]
    const missingColumns = requiredColumns.filter((col) => !header.includes(col))

    if (missingColumns.length > 0) {
      throw new Error(`Missing required columns: ${missingColumns.join(", ")}`)
    }

    const categoryIdx = header.indexOf("category_name")
    const nameIdx = header.indexOf("item_name")
    const descIdx = header.indexOf("description")
    const priceIdx = header.indexOf("price")
    const activeIdx = header.indexOf("is_active")

    const items: CSVItem[] = []

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]
      // Handle quoted values with commas inside
      const values: string[] = []
      let current = ""
      let inQuotes = false

      for (const char of line) {
        if (char === '"') {
          inQuotes = !inQuotes
        } else if (char === "," && !inQuotes) {
          values.push(current.trim().replace(/^["']|["']$/g, ""))
          current = ""
        } else {
          current += char
        }
      }
      values.push(current.trim().replace(/^["']|["']$/g, ""))

      const errors: string[] = []
      console.log("[v0] Raw values from CSV:", values)
      const categoryName = values[categoryIdx] || ""
      const itemName = values[nameIdx] || ""
      console.log("[v0] Extracted categoryName:", categoryName, "itemName:", itemName)
      const description = descIdx >= 0 ? values[descIdx] || "" : ""
      const priceStr = values[priceIdx] || ""
      const isActiveStr = activeIdx >= 0 ? values[activeIdx]?.toLowerCase().trim() || "true" : "true"

      if (!categoryName) errors.push("Missing category name")
      if (!itemName) errors.push("Missing item name")

      const price = Number.parseFloat(priceStr.replace(/[$,]/g, ""))
      if (isNaN(price) || price < 0) errors.push("Invalid price")

      const isActive = !["false", "0", "no", "n", "inactive"].includes(isActiveStr)

      items.push({
        category_name: categoryName,
        item_name: itemName,
        description,
        price: isNaN(price) ? 0 : price,
        is_active: isActive,
        rowNumber: i + 1,
        errors,
      })
    }

    return items
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    setParseError(null)
    setImportResult(null)

    if (!selectedFile) {
      setFile(null)
      setParsedItems([])
      return
    }

    if (!selectedFile.name.endsWith(".csv")) {
      setParseError("Please select a CSV file")
      return
    }

    setFile(selectedFile)

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string
        const items = parseCSV(text)
        setParsedItems(items)
      } catch (err) {
        setParseError(err instanceof Error ? err.message : "Failed to parse CSV")
        setParsedItems([])
      }
    }
    reader.readAsText(selectedFile)
  }

  const handleImport = async () => {
    const validItems = parsedItems.filter((item) => item.errors.length === 0)
    if (validItems.length === 0) {
      setParseError("No valid items to import")
      return
    }

    setIsImporting(true)
    try {
      await onImport(validItems)
      setImportResult({
        success: true,
        message: `Successfully imported ${validItems.length} items`,
      })
    } catch (err) {
      setImportResult({
        success: false,
        message: err instanceof Error ? err.message : "Import failed",
      })
    } finally {
      setIsImporting(false)
    }
  }

  const downloadTemplate = () => {
    console.log("[v0] Starting CSV template download")

    const csvRows = [
      ["category_name", "item_name", "description", "price", "is_active"],
      ["Sandwiches", "Turkey Club", "Fresh turkey with bacon and avocado", "12.99", "true"],
      ["Sandwiches", "BLT Classic", "Bacon lettuce and tomato", "9.99", "true"],
      ["Salads", "Caesar Salad", "Romaine with house-made dressing", "11.50", "true"],
      ["Salads", "Garden Salad", "Mixed greens with vegetables", "8.99", "true"],
    ]

    // Convert to proper CSV format with quoted fields
    const csvContent = csvRows.map((row) => row.map((field) => `"${field}"`).join(",")).join("\r\n")

    console.log("[v0] CSV content generated:", csvContent.substring(0, 100))

    // Add UTF-8 BOM for Excel and Google Sheets compatibility
    const BOM = "\uFEFF"
    const fullContent = BOM + csvContent

    // Create Blob and download
    const blob = new Blob([fullContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)

    const a = document.createElement("a")
    a.href = url
    a.download = "menu_items_template.csv"
    a.style.display = "none"
    document.body.appendChild(a)
    a.click()

    setTimeout(() => {
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }, 100)
  }

  const validCount = parsedItems.filter((item) => item.errors.length === 0).length
  const errorCount = parsedItems.filter((item) => item.errors.length > 0).length

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Import Menu Items from CSV
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {/* Template Download */}
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-2">
              Download the template to see the required format. Edit in Google Sheets or Excel, then export as CSV.
            </p>
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Download Template
            </Button>
          </div>

          {/* File Upload */}
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
            <Upload className="h-10 w-10 mx-auto text-gray-400 mb-3" />
            <p className="text-sm text-gray-600">{file ? file.name : "Click to select or drag and drop a CSV file"}</p>
          </div>

          {/* Parse Error */}
          {parseError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{parseError}</AlertDescription>
            </Alert>
          )}

          {/* Import Result */}
          {importResult && (
            <Alert variant={importResult.success ? "default" : "destructive"}>
              {importResult.success ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertDescription>{importResult.message}</AlertDescription>
            </Alert>
          )}

          {/* Preview Table */}
          {parsedItems.length > 0 && !importResult?.success && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">Preview ({parsedItems.length} items)</h3>
                <div className="text-sm">
                  <span className="text-green-600">{validCount} valid</span>
                  {errorCount > 0 && <span className="text-red-600 ml-2">{errorCount} with errors</span>}
                </div>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="text-left p-2 font-medium">Row</th>
                        <th className="text-left p-2 font-medium">Category</th>
                        <th className="text-left p-2 font-medium">Item Name</th>
                        <th className="text-left p-2 font-medium">Price</th>
                        <th className="text-left p-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedItems.map((item, idx) => (
                        <tr key={idx} className={item.errors.length > 0 ? "bg-red-50" : ""}>
                          <td className="p-2 text-gray-500">{item.rowNumber}</td>
                          <td className="p-2">{item.category_name}</td>
                          <td className="p-2">{item.item_name}</td>
                          <td className="p-2">${item.price.toFixed(2)}</td>
                          <td className="p-2">
                            {item.errors.length > 0 ? (
                              <span className="text-red-600 text-xs">{item.errors.join(", ")}</span>
                            ) : (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {importResult?.success ? "Close" : "Cancel"}
          </Button>
          {!importResult?.success && (
            <Button
              onClick={handleImport}
              disabled={validCount === 0 || isImporting}
              className="bg-[#5d1f1f] hover:bg-[#4a1818]"
            >
              {isImporting ? "Importing..." : `Import ${validCount} Items`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
