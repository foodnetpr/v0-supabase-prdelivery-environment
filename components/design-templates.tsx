"use client"

import Image from "next/image"
import { Card, CardHeader, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Package } from "lucide-react"
import {
  getUnitLabelCard as getUnitLabelCardCentral,
  getMinQtyLabel as getMinQtyLabelCentral,
} from "@/lib/selling-units"

function AvocadoIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="3.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      {/* Leaf */}
      <path d="M32 12C28 6 22 4 22 4s2 8 8 12" />
      <path d="M30 10c-3-2-7-2-7-2s1 5 5 7" />
      {/* Body */}
      <path d="M22 18c-8 6-12 16-10 26 2 8 10 14 20 14s18-6 20-14c2-10-2-20-10-26-4-3-8-5-10-5s-6 2-10 5z" />
      {/* Pit */}
      <ellipse cx="32" cy="40" rx="7" ry="9" />
    </svg>
  )
}

export type DesignTemplate =
  | "modern"
  | "classic"
  | "bold"
  | "minimal"
  | "elegant"
  | "list-right"
  | "list-left"
  | "list-right-3col"
  | "list-left-3col"
  | "list-right-4col"
  | "list-left-4col"

export const TEMPLATE_INFO: Record<DesignTemplate, { name: string; description: string }> = {
  modern: {
    name: "Modern",
    description: "Clean lines, rounded corners, subtle shadows. Great for contemporary brands.",
  },
  classic: {
    name: "Classic",
    description: "Traditional layout with serif accents and warm tones. Perfect for established restaurants.",
  },
  bold: {
    name: "Bold",
    description: "High contrast, large typography, vibrant colors. Ideal for trendy, youthful brands.",
  },
  minimal: {
    name: "Minimal",
    description: "Ultra-clean with lots of whitespace. Best for premium, upscale experiences.",
  },
  elegant: {
    name: "Elegant",
    description: "Sophisticated with gold accents and refined typography. Perfect for fine dining.",
  },
  "list-right": {
    name: "List Right (2 col)",
    description: "Horizontal rows with image on right. 2 columns on desktop.",
  },
  "list-left": {
    name: "List Left (2 col)",
    description: "Horizontal rows with image on left. 2 columns on desktop.",
  },
  "list-right-3col": {
    name: "List Right (3 col)",
    description: "Horizontal rows with image on right. 3 columns on desktop, ideal for short names.",
  },
  "list-left-3col": {
    name: "List Left (3 col)",
    description: "Horizontal rows with image on left. 3 columns on desktop, ideal for short names.",
  },
  "list-right-4col": {
    name: "List Right (4 col)",
    description: "Horizontal rows with image on right. 4 columns on desktop, best for very short items.",
  },
  "list-left-4col": {
    name: "List Left (4 col)",
    description: "Horizontal rows with image on left. 4 columns on desktop, best for very short items.",
  },
}

// Template-specific styles
const templateStyles: Record<
  DesignTemplate,
  {
    card: string
    cardHover: string
    image: string
    imageWrapper: string
    header: string
    title: string
    description: string
    price: string
    button: string
    grid: string
    sectionTitle: string
    categoryButton: string
    headerBar: string
    layout: "vertical" | "horizontal"
    imagePosition?: "left" | "right"
  }
> = {
  modern: {
    card: "overflow-hidden p-0 flex flex-col h-full gap-0 rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300",
    cardHover: "hover:scale-[1.02] transition-transform duration-300",
    image: "object-cover transition-transform duration-300 group-hover:scale-105",
    imageWrapper: "relative h-48 w-full overflow-hidden rounded-t-xl",
    header: "p-3 pb-1 flex-1 gap-0",
    title: "text-base font-semibold text-foreground",
    description: "text-sm text-muted-foreground line-clamp-2",
    price: "text-sm font-medium text-primary",
    button: "w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg",
    grid: "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6",
    sectionTitle: "text-xl font-bold mb-6 text-foreground",
    categoryButton: "shrink-0 bg-transparent hover:bg-primary/10 rounded-full",
    headerBar: "sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b shadow-sm",
    layout: "vertical",
  },
  classic: {
    card: "overflow-hidden p-0 flex flex-col h-full gap-0 rounded-none border-2 border-amber-200/50 shadow-sm",
    cardHover: "hover:border-amber-300 transition-colors duration-300",
    image: "object-cover",
    imageWrapper: "relative h-52 w-full overflow-hidden border-b-2 border-amber-200/50",
    header: "p-4 pb-2 flex-1 gap-0 bg-amber-50/30",
    title: "text-lg font-serif font-semibold text-amber-950",
    description: "text-sm text-amber-800/70 line-clamp-2 font-serif",
    price: "text-base font-medium text-amber-800",
    button: "w-full bg-amber-800 hover:bg-amber-900 text-white rounded-none border-2 border-amber-900",
    grid: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8",
    sectionTitle: "text-2xl font-serif font-bold mb-6 text-amber-950 border-b-2 border-amber-300 pb-2",
    categoryButton: "shrink-0 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-none border border-amber-300",
    headerBar: "sticky top-0 z-50 bg-amber-50 border-b-2 border-amber-200",
    layout: "vertical",
  },
  bold: {
    card: "overflow-hidden p-0 flex flex-col h-full gap-0 rounded-2xl shadow-xl border-4 border-black",
    cardHover: "hover:shadow-2xl hover:-translate-y-1 transition-all duration-300",
    image: "object-cover grayscale-[20%] contrast-110",
    imageWrapper: "relative h-56 w-full overflow-hidden",
    header: "p-4 pb-2 flex-1 gap-0 bg-black text-white",
    title: "text-xl font-black uppercase tracking-tight text-white",
    description: "text-sm text-gray-300 line-clamp-2",
    price: "text-lg font-normal text-yellow-400",
    button: "w-full bg-yellow-400 hover:bg-yellow-500 text-black font-black uppercase rounded-none",
    grid: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8",
    sectionTitle: "text-3xl font-black uppercase mb-6 text-black",
    categoryButton:
      "shrink-0 bg-black text-white hover:bg-gray-800 rounded-none border-2 border-black font-bold uppercase",
    headerBar: "sticky top-0 z-50 bg-black border-b-4 border-yellow-400",
    layout: "vertical",
  },
  minimal: {
    card: "overflow-hidden p-0 flex flex-col h-full gap-0 rounded-none border-0 shadow-none bg-transparent",
    cardHover: "hover:opacity-80 transition-opacity duration-300",
    image: "object-cover",
    imageWrapper: "relative h-64 w-full overflow-hidden",
    header: "p-2 pb-1 flex-1 gap-0",
    title: "text-sm font-light tracking-wide text-foreground",
    description: "text-xs text-muted-foreground line-clamp-2 font-light",
    price: "text-xs font-normal text-muted-foreground",
    button:
      "w-full bg-transparent border border-foreground text-foreground hover:bg-foreground hover:text-background rounded-none text-sm font-light",
    grid: "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4",
    sectionTitle: "text-sm font-light tracking-[0.3em] uppercase mb-8 text-muted-foreground",
    categoryButton: "shrink-0 bg-transparent hover:bg-muted text-muted-foreground rounded-none border-0 font-light",
    headerBar: "sticky top-0 z-50 bg-background border-b border-muted",
    layout: "vertical",
  },
  elegant: {
    card: "overflow-hidden p-0 flex flex-col h-full gap-0 rounded-sm border border-amber-200/30 shadow-lg bg-gradient-to-b from-amber-50/50 to-white",
    cardHover: "hover:shadow-xl hover:border-amber-300/50 transition-all duration-500",
    image: "object-cover",
    imageWrapper: "relative h-52 w-full overflow-hidden",
    header: "p-4 pb-2 flex-1 gap-0",
    title: "text-lg font-light tracking-wide text-amber-950",
    description: "text-sm text-amber-800/60 line-clamp-2 italic",
    price: "text-base font-light text-amber-700",
    button:
      "w-full bg-gradient-to-r from-amber-700 to-amber-800 hover:from-amber-800 hover:to-amber-900 text-white rounded-sm font-light tracking-wide",
    grid: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10",
    sectionTitle: "text-2xl font-light tracking-wide mb-8 text-amber-900 border-b border-amber-200 pb-3",
    categoryButton:
      "shrink-0 bg-gradient-to-r from-amber-100 to-amber-50 hover:from-amber-200 hover:to-amber-100 text-amber-800 rounded-sm border border-amber-200 font-light",
    headerBar: "sticky top-0 z-50 bg-gradient-to-r from-amber-50 to-white border-b border-amber-200",
    layout: "vertical",
  },
  "list-right": {
    card: "bg-white border-b border-gray-100 hover:bg-gray-50/50 transition-colors",
    cardHover: "",
    image: "object-cover rounded-lg",
    imageWrapper: "relative w-20 h-20 md:w-24 md:h-24 flex-shrink-0 overflow-hidden rounded-lg",
    header: "",
    title: "text-sm md:text-base font-semibold text-foreground line-clamp-2",
    description: "text-xs md:text-sm text-muted-foreground line-clamp-2 mt-0.5",
    price: "text-sm font-normal mt-1",
    button: "",
    grid: "grid grid-cols-1 md:grid-cols-2 gap-0 divide-y md:divide-y-0",
    sectionTitle: "text-lg font-bold mb-4 text-foreground uppercase tracking-wide",
    categoryButton: "shrink-0 bg-transparent hover:bg-primary/10 rounded-full",
    headerBar: "sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b shadow-sm",
    layout: "horizontal",
    imagePosition: "right",
  },
  "list-left": {
    card: "bg-white border-b border-gray-100 hover:bg-gray-50/50 transition-colors",
    cardHover: "",
    image: "object-cover rounded-lg",
    imageWrapper: "relative w-20 h-20 md:w-24 md:h-24 flex-shrink-0 overflow-hidden rounded-lg",
    header: "",
    title: "text-sm md:text-base font-semibold text-foreground line-clamp-2",
    description: "text-xs md:text-sm text-muted-foreground line-clamp-2 mt-0.5",
    price: "text-sm font-normal mt-1",
    button: "",
    grid: "grid grid-cols-1 md:grid-cols-2 gap-0 divide-y md:divide-y-0",
    sectionTitle: "text-lg font-bold mb-4 text-foreground uppercase tracking-wide",
    categoryButton: "shrink-0 bg-transparent hover:bg-primary/10 rounded-full",
    headerBar: "sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b shadow-sm",
    layout: "horizontal",
    imagePosition: "left",
  },
  "list-right-3col": {
    card: "bg-white border-b border-gray-100 hover:bg-gray-50/50 transition-colors",
    cardHover: "",
    image: "object-cover rounded-lg",
    imageWrapper: "relative w-16 h-16 md:w-20 md:h-20 flex-shrink-0 overflow-hidden rounded-lg",
    header: "",
    title: "text-xs md:text-sm font-semibold text-foreground line-clamp-2",
    description: "text-xs text-muted-foreground line-clamp-1 mt-0.5",
    price: "text-xs md:text-sm font-normal mt-1",
    button: "",
    grid: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 divide-y md:divide-y-0",
    sectionTitle: "text-lg font-bold mb-4 text-foreground uppercase tracking-wide",
    categoryButton: "shrink-0 bg-transparent hover:bg-primary/10 rounded-full",
    headerBar: "sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b shadow-sm",
    layout: "horizontal",
    imagePosition: "right",
  },
  "list-left-3col": {
    card: "bg-white border-b border-gray-100 hover:bg-gray-50/50 transition-colors",
    cardHover: "",
    image: "object-cover rounded-lg",
    imageWrapper: "relative w-16 h-16 md:w-20 md:h-20 flex-shrink-0 overflow-hidden rounded-lg",
    header: "",
    title: "text-xs md:text-sm font-semibold text-foreground line-clamp-2",
    description: "text-xs text-muted-foreground line-clamp-1 mt-0.5",
    price: "text-xs md:text-sm font-normal mt-1",
    button: "",
    grid: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 divide-y md:divide-y-0",
    sectionTitle: "text-lg font-bold mb-4 text-foreground uppercase tracking-wide",
    categoryButton: "shrink-0 bg-transparent hover:bg-primary/10 rounded-full",
    headerBar: "sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b shadow-sm",
    layout: "horizontal",
    imagePosition: "left",
  },
  "list-right-4col": {
    card: "bg-white border-b border-gray-100 hover:bg-gray-50/50 transition-colors",
    cardHover: "",
    image: "object-cover rounded-md",
    imageWrapper: "relative w-14 h-14 md:w-16 md:h-16 flex-shrink-0 overflow-hidden rounded-md",
    header: "",
    title: "text-xs font-semibold text-foreground line-clamp-1",
    description: "hidden",
    price: "text-xs font-normal mt-0.5",
    button: "",
    grid: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-0 divide-y sm:divide-y-0",
    sectionTitle: "text-lg font-bold mb-4 text-foreground uppercase tracking-wide",
    categoryButton: "shrink-0 bg-transparent hover:bg-primary/10 rounded-full",
    headerBar: "sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b shadow-sm",
    layout: "horizontal",
    imagePosition: "right",
  },
  "list-left-4col": {
    card: "bg-white border-b border-gray-100 hover:bg-gray-50/50 transition-colors",
    cardHover: "",
    image: "object-cover rounded-md",
    imageWrapper: "relative w-14 h-14 md:w-16 md:h-16 flex-shrink-0 overflow-hidden rounded-md",
    header: "",
    title: "text-xs font-semibold text-foreground line-clamp-1",
    description: "hidden",
    price: "text-xs font-normal mt-0.5",
    button: "",
    grid: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-0 divide-y sm:divide-y-0",
    sectionTitle: "text-lg font-bold mb-4 text-foreground uppercase tracking-wide",
    categoryButton: "shrink-0 bg-transparent hover:bg-primary/10 rounded-full",
    headerBar: "sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b shadow-sm",
    layout: "horizontal",
    imagePosition: "left",
  },
}

export function getTemplateStyles(template: DesignTemplate = "modern") {
  return templateStyles[template] || templateStyles.modern
}

interface MenuItemCardProps {
  item: {
    id: string
    name: string
    description: string | null
    image_url: string | null
    base_price: number
    pricing_unit?: string | null
    per_unit_price?: number | null
    serves?: string | null
    min_quantity?: number | null
  }
  template: DesignTemplate
  onSelect: () => void
  primaryColor?: string
}

// Centralized unit label helpers (from lib/selling-units.ts)
const getMinQtyLabel = getMinQtyLabelCentral
const getUnitLabelCard = getUnitLabelCardCentral

export function MenuItemCard({ item, template, onSelect, primaryColor }: MenuItemCardProps) {
  const styles = getTemplateStyles(template)

  const buttonStyle = primaryColor
    ? {
        backgroundColor: primaryColor,
        borderColor: primaryColor,
      }
    : {}

  const showPrice = item.base_price > 0
  const hasUnit = true // Always show unit label (defaults to "por unidad")
  const unitPrice = item.per_unit_price || item.base_price

  // Horizontal list layout
  if (styles.layout === "horizontal") {
    const imageOnLeft = styles.imagePosition === "left"

    return (
      <div
        className={`group flex items-center gap-3 p-3 cursor-pointer ${styles.card} ${styles.cardHover}`}
        onClick={onSelect}
      >
        {imageOnLeft && (
          <div className={`${styles.imageWrapper}`}>
            {item.image_url ? (
              <Image
                src={item.image_url}
                alt={item.name}
                fill
                className={styles.image}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: `${primaryColor || 'hsl(var(--primary))'}15` }}>
                <AvocadoIcon className="w-6 h-6" style={{ color: `${primaryColor || 'hsl(var(--primary))'}60` }} />
              </div>
            )}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className={styles.title}>{item.name}</h3>
          {item.description && <p className={styles.description}>{item.description}</p>}
          {showPrice && (
            hasUnit ? (
              <div>
                <p className={`${styles.price} text-muted-foreground/90`}>
                  ${unitPrice.toFixed(2)} / {getUnitLabelCard(item.pricing_unit, 1)}
                </p>
                {item.serves && item.pricing_unit !== "person" && (
                  <p className="text-xs text-muted-foreground/70">Sirve {item.serves}</p>
                )}
                {item.min_quantity && item.min_quantity > 1 && (
                  <p className="text-xs text-muted-foreground/70">Min. {item.min_quantity} {getMinQtyLabel(item.pricing_unit, item.min_quantity)}</p>
                )}
              </div>
            ) : (
              <div>
                <p className={`${styles.price} text-muted-foreground/90`}>${item.base_price.toFixed(2)}</p>
                {item.serves && (
                  <p className="text-xs text-muted-foreground/70">Sirve {item.serves}</p>
                )}
              </div>
            )
          )}
        </div>
        <button
          className="flex-shrink-0 w-6 h-6 rounded-full shadow-md flex items-center justify-center text-white transition-transform hover:scale-110"
          style={{ backgroundColor: primaryColor || "hsl(var(--primary))" }}
          onClick={(e) => {
            e.stopPropagation()
            onSelect()
          }}
        >
          <Plus className="w-4 h-4" />
        </button>
        {!imageOnLeft && (
          <div className={`${styles.imageWrapper}`}>
            {item.image_url ? (
              <Image
                src={item.image_url}
                alt={item.name}
                fill
                className={styles.image}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: `${primaryColor || 'hsl(var(--primary))'}15` }}>
                <AvocadoIcon className="w-6 h-6" style={{ color: `${primaryColor || 'hsl(var(--primary))'}60` }} />
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // Vertical card layout
  return (
    <Card className={`group ${styles.card} ${styles.cardHover} cursor-pointer`} onClick={onSelect}>
      <div className={`${styles.imageWrapper}`}>
        {item.image_url ? (
          <Image
            src={item.image_url}
            alt={item.name}
            fill
            className={styles.image}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: `${primaryColor || 'hsl(var(--primary))'}15` }}>
            <AvocadoIcon className="w-10 h-10" style={{ color: `${primaryColor || 'hsl(var(--primary))'}60` }} />
          </div>
        )}
      </div>
      <CardHeader className={`${styles.header} flex flex-row items-center justify-between`}>
        <div className="flex-1 min-w-0">
          <h3 className={styles.title}>{item.name}</h3>
          <p className={styles.description}>{item.description}</p>
          {showPrice && (
            hasUnit ? (
              <div>
                <p className={`${styles.price} text-muted-foreground/90`}>
                  ${unitPrice.toFixed(2)} / {getUnitLabelCard(item.pricing_unit, 1)}
                </p>
                {item.serves && item.pricing_unit !== "person" && (
                  <p className="text-xs text-muted-foreground/70">Sirve {item.serves}</p>
                )}
                {item.min_quantity && item.min_quantity > 1 && (
                  <p className="text-xs text-muted-foreground/70">Min. {item.min_quantity} {getMinQtyLabel(item.pricing_unit, item.min_quantity)}</p>
                )}
              </div>
            ) : (
              <div>
                <p className={`${styles.price} text-muted-foreground/90`}>${item.base_price.toFixed(2)}</p>
                {item.serves && (
                  <p className="text-xs text-muted-foreground/70">Sirve {item.serves}</p>
                )}
              </div>
            )
          )}
        </div>
        <button
          className="flex-shrink-0 w-6 h-6 rounded-full shadow-md flex items-center justify-center text-white transition-transform hover:scale-110"
          style={{ backgroundColor: primaryColor || "hsl(var(--primary))" }}
          onClick={(e) => {
            e.stopPropagation()
            onSelect()
          }}
        >
          <Plus className="w-4 h-4" />
        </button>
      </CardHeader>
    </Card>
  )
}

interface ServicePackageCardProps {
  pkg: {
    id: string
    name: string
    description: string | null
    image_url: string | null
    base_price: number
  }
  template: DesignTemplate
  onSelect: () => void
  primaryColor?: string
}

export function ServicePackageCard({ pkg, template, onSelect, primaryColor }: ServicePackageCardProps) {
  const styles = getTemplateStyles(template)

  const buttonStyle = primaryColor
    ? {
        backgroundColor: primaryColor,
        borderColor: primaryColor,
      }
    : {}

  // Horizontal list layout
  if (styles.layout === "horizontal") {
    const imageOnLeft = styles.imagePosition === "left"

    return (
      <div
        className={`group flex items-center gap-3 p-3 cursor-pointer ${styles.card} ${styles.cardHover}`}
        onClick={onSelect}
      >
        {imageOnLeft && (
          <div className={styles.imageWrapper}>
            {pkg.image_url ? (
              <Image
                src={pkg.image_url}
                alt={pkg.name}
                fill
                className={styles.image}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: `${primaryColor || 'hsl(var(--primary))'}15` }}>
                <Package className="w-6 h-6" style={{ color: `${primaryColor || 'hsl(var(--primary))'}60` }} />
              </div>
            )}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className={styles.title}>{pkg.name}</h3>
          {pkg.description && <p className={styles.description}>{pkg.description}</p>}
        <p className={`${styles.price} text-muted-foreground/90`}><span className="text-sm font-normal">Desde </span>${(pkg.base_price || 0).toFixed(2)}</p>
        </div>
        {!imageOnLeft && (
          <div className={styles.imageWrapper}>
            {pkg.image_url ? (
              <Image
                src={pkg.image_url}
                alt={pkg.name}
                fill
                className={styles.image}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: `${primaryColor || 'hsl(var(--primary))'}15` }}>
                <Package className="w-6 h-6" style={{ color: `${primaryColor || 'hsl(var(--primary))'}60` }} />
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // Vertical card layout
  return (
    <Card className={`group ${styles.card} ${styles.cardHover}`}>
      <div className={styles.imageWrapper}>
        {pkg.image_url ? (
          <Image
            src={pkg.image_url}
            alt={pkg.name}
            fill
            className={styles.image}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: `${primaryColor || 'hsl(var(--primary))'}15` }}>
            <Package className="w-10 h-10" style={{ color: `${primaryColor || 'hsl(var(--primary))'}60` }} />
          </div>
        )}
      </div>
      <CardHeader className={styles.header}>
        <h3 className={styles.title}>{pkg.name}</h3>
        <p className={styles.description}>{pkg.description}</p>
        <p className={`${styles.price} text-muted-foreground/90`}><span className="text-sm font-normal">Desde </span>${(pkg.base_price || 0).toFixed(2)}</p>
      </CardHeader>
      <CardFooter className="p-3 pt-0">
        <Button className={styles.button} style={buttonStyle} onClick={onSelect}>
          {template === "minimal" ? "Ver" : template === "bold" ? "Ordenar" : "Personalizar"}
        </Button>
      </CardFooter>
    </Card>
  )
}

interface TemplatePreviewProps {
  template: DesignTemplate
  isSelected: boolean
  onSelect: () => void
}

export function TemplatePreview({ template, isSelected, onSelect }: TemplatePreviewProps) {
  const info = TEMPLATE_INFO[template]
  const styles = getTemplateStyles(template)
  const isListTemplate = styles.layout === "horizontal"

  return (
    <div
      className={`relative cursor-pointer rounded-lg border-2 p-4 transition-all ${
        isSelected ? "border-primary ring-2 ring-primary/20" : "border-gray-200 hover:border-gray-300"
      }`}
      onClick={onSelect}
    >
      {isSelected && (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}

      {/* Mini preview */}
      <div className="mb-3 rounded overflow-hidden border">
        <div
          className={`h-8 ${template === "bold" ? "bg-black" : template === "classic" ? "bg-amber-50" : template === "elegant" ? "bg-gradient-to-r from-amber-50 to-white" : "bg-white"}`}
        >
          <div className="h-full flex items-center px-2">
            <div className="w-6 h-4 bg-gray-300 rounded-sm"></div>
            <div className="ml-auto flex gap-1">
              <div className={`w-8 h-4 rounded-sm ${template === "bold" ? "bg-yellow-400" : "bg-gray-200"}`}></div>
              <div className={`w-8 h-4 rounded-sm ${template === "bold" ? "bg-gray-700" : "bg-gray-200"}`}></div>
            </div>
          </div>
        </div>
        <div
          className={`p-2 ${template === "classic" ? "bg-amber-50/50" : template === "elegant" ? "bg-amber-50/30" : "bg-gray-50"}`}
        >
          {isListTemplate ? (
            // List-style preview
            <div className="space-y-1">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-1 bg-white p-1 border-b border-gray-100">
                  {styles.imagePosition === "left" && <div className="w-6 h-6 bg-gray-200 rounded-sm shrink-0"></div>}
                  <div className="flex-1 space-y-0.5">
                    <div className="h-1.5 bg-gray-300 rounded w-3/4"></div>
                    <div className="h-1 bg-gray-200 rounded w-1/2"></div>
                  </div>
                  {styles.imagePosition === "right" && <div className="w-6 h-6 bg-gray-200 rounded-sm shrink-0"></div>}
                </div>
              ))}
            </div>
          ) : (
            // Card-style preview
            <div className="grid grid-cols-3 gap-1">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`h-12 ${
                    template === "bold"
                      ? "bg-black rounded-none border-2 border-black"
                      : template === "classic"
                        ? "bg-white border-2 border-amber-200"
                        : template === "minimal"
                          ? "bg-white border-0"
                          : template === "elegant"
                            ? "bg-white rounded-sm shadow-sm"
                            : "bg-white rounded-lg shadow-sm"
                  }`}
                ></div>
              ))}
            </div>
          )}
        </div>
      </div>

      <h4 className="font-semibold text-sm">{info.name}</h4>
      <p className="text-xs text-muted-foreground mt-1">{info.description}</p>
    </div>
  )
}
