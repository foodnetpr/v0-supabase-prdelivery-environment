"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider, type ThemeProviderProps } from "next-themes"

interface TenantThemeProviderProps {
  children: React.ReactNode
  primaryColor?: string | null
}

// Helper function to convert hex color to oklch approximation
function hexToOklchApprox(hex: string): string {
  // Remove # if present
  const cleanHex = hex.replace("#", "")

  // Parse RGB values
  const r = Number.parseInt(cleanHex.substring(0, 2), 16) / 255
  const g = Number.parseInt(cleanHex.substring(2, 4), 16) / 255
  const b = Number.parseInt(cleanHex.substring(4, 6), 16) / 255

  // Simple luminance calculation (approximate)
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b

  // Calculate approximate chroma and hue
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const chroma = max - min

  let hue = 0
  if (chroma > 0) {
    if (max === r) {
      hue = ((g - b) / chroma) % 6
    } else if (max === g) {
      hue = (b - r) / chroma + 2
    } else {
      hue = (r - g) / chroma + 4
    }
    hue = Math.round(hue * 60)
    if (hue < 0) hue += 360
  }

  // Convert to oklch format (simplified approximation)
  const l = Math.round(luminance * 100) / 100
  const c = Math.round(chroma * 0.4 * 100) / 100 // Scaled chroma

  return `oklch(${l} ${c} ${hue})`
}

// Generate color variants
function generateColorVariants(primaryHex: string) {
  const cleanHex = primaryHex.replace("#", "")
  const r = Number.parseInt(cleanHex.substring(0, 2), 16)
  const g = Number.parseInt(cleanHex.substring(2, 4), 16)
  const b = Number.parseInt(cleanHex.substring(4, 6), 16)

  // Darken for dark variant
  const darkR = Math.max(0, Math.floor(r * 0.7))
  const darkG = Math.max(0, Math.floor(g * 0.7))
  const darkB = Math.max(0, Math.floor(b * 0.7))
  const darkHex = `#${darkR.toString(16).padStart(2, "0")}${darkG.toString(16).padStart(2, "0")}${darkB.toString(16).padStart(2, "0")}`

  // Lighten for light variant
  const lightR = Math.min(255, Math.floor(r + (255 - r) * 0.85))
  const lightG = Math.min(255, Math.floor(g + (255 - g) * 0.85))
  const lightB = Math.min(255, Math.floor(b + (255 - b) * 0.85))
  const lightHex = `#${lightR.toString(16).padStart(2, "0")}${lightG.toString(16).padStart(2, "0")}${lightB.toString(16).padStart(2, "0")}`

  return {
    primary: hexToOklchApprox(primaryHex),
    dark: hexToOklchApprox(darkHex),
    light: hexToOklchApprox(lightHex),
  }
}

export function TenantThemeProvider({ children, primaryColor }: TenantThemeProviderProps) {
  React.useEffect(() => {
    if (primaryColor) {
      const variants = generateColorVariants(primaryColor)

      // Apply CSS custom properties
      document.documentElement.style.setProperty("--primary", variants.primary)
      document.documentElement.style.setProperty("--burgundy", variants.primary)
      document.documentElement.style.setProperty("--burgundy-dark", variants.dark)
      document.documentElement.style.setProperty("--burgundy-light", variants.light)
    }

    return () => {
      // Reset to defaults when unmounting
      document.documentElement.style.removeProperty("--primary")
      document.documentElement.style.removeProperty("--burgundy")
      document.documentElement.style.removeProperty("--burgundy-dark")
      document.documentElement.style.removeProperty("--burgundy-light")
    }
  }, [primaryColor])

  return <>{children}</>
}

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
