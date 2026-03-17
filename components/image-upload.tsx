"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Upload, Loader2, RefreshCw, ImageOff } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface ImageUploadProps {
  value: string
  onChange: (url: string) => void
  onRemove?: () => void
  label?: string
  bucket?: string
  folder?: string
}

export function ImageUpload({ 
  value, 
  onChange, 
  onRemove, 
  label = "Image",
  bucket = "images",
  folder = "uploads"
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    // Reset input so the same file can be re-selected
    e.target.value = ""

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file")
      return
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be less than 5MB")
      return
    }

    setError("")
    setIsUploading(true)

    try {
      const supabase = createClient()
      
      // Generate unique filename
      const timestamp = Date.now()
      const fileExtension = file.name.split(".").pop()
      const baseName = file.name.replace(/[^a-zA-Z0-9]/g, "-").replace(`.${fileExtension}`, "")
      const uniqueFileName = `${folder}/${baseName}-${timestamp}.${fileExtension}`

      // Upload to Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(uniqueFileName, file, {
          cacheControl: "3600",
          upsert: false,
        })

      if (uploadError) {
        throw new Error(uploadError.message)
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path)

      onChange(urlData.publicUrl)
    } catch (err) {
      console.error("[v0] Upload error:", err)
      const message = err instanceof Error ? err.message : "Unknown error"
      setError(`Failed to upload image: ${message}`)
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemove = () => {
    if (onRemove) {
      onRemove()
    } else {
      onChange("")
    }
  }

  const triggerFileSelect = () => {
    fileInputRef.current?.click()
  }

  return (
    <div>
      {label && <label className="block text-xs font-bold text-gray-600 uppercase mb-2">{label}</label>}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        disabled={isUploading}
        className="hidden"
      />

      <div className="space-y-3">
        {value ? (
          /* -- HAS IMAGE: show preview + Replace / Remove buttons -- */
          <div className="space-y-2">
            <div className="relative rounded-lg overflow-hidden border border-gray-200">
              <img
                src={value}
                alt="Preview"
                className="w-full h-36 object-cover"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={triggerFileSelect}
                disabled={isUploading}
                className="flex-1 flex items-center justify-center gap-1.5 text-sm px-3 py-2 rounded-md border border-gray-300 hover:bg-gray-50 transition disabled:opacity-50"
              >
                {isUploading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw size={14} />
                    <span>Replace</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleRemove}
                disabled={isUploading}
                className="flex items-center justify-center gap-1.5 text-sm px-3 py-2 rounded-md border border-red-200 text-red-600 hover:bg-red-50 transition disabled:opacity-50"
              >
                <ImageOff size={14} />
                <span>Remove</span>
              </button>
            </div>
          </div>
        ) : (
          /* -- NO IMAGE: show upload dropzone -- */
          <div className="relative">
            <button
              type="button"
              onClick={triggerFileSelect}
              disabled={isUploading}
              className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-lg px-4 py-6 hover:border-gray-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? (
                <>
                  <Loader2 size={18} className="animate-spin text-gray-400" />
                  <span className="text-sm text-gray-600">Uploading...</span>
                </>
              ) : (
                <>
                  <Upload size={18} className="text-gray-400" />
                  <span className="text-sm text-gray-600">Click to upload image</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Error Message */}
        {error && <p className="text-xs text-red-600">{error}</p>}

        {/* Help Text */}
        <p className="text-xs text-gray-500">PNG, JPG or WebP. Max 5MB.</p>
      </div>
    </div>
  )
}
