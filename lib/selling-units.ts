/**
 * Centralized Selling Unit Configuration
 *
 * To add a new selling unit:
 * 1. Add a new entry to SELLING_UNITS below
 * 2. That's it! All admin dropdowns, customer labels, and cart displays update automatically.
 */

export interface SellingUnit {
  /** Internal key stored in the database (e.g. "bowl_8oz") */
  key: string
  /** Display name in the admin dropdown (e.g. "Bowl 8oz") */
  adminLabel: string
  /** Optional description shown in admin dropdown (e.g. "serves multiple people") */
  adminDescription?: string
  /** Singular label for price display (e.g. "Bowl 8oz") */
  priceSingular: string
  /** Plural label for price display (e.g. "Bowls 8oz") */
  pricePlural: string
  /** Singular label for quantity/count context (e.g. "Bowl 8oz") */
  qtySingular: string
  /** Plural label for quantity/count context (e.g. "Bowls 8oz") */
  qtyPlural: string
  /** Lowercase singular for card display (e.g. "bowl 8oz") */
  cardSingular: string
  /** Lowercase plural for card display (e.g. "bowls 8oz") */
  cardPlural: string
  /** Plural for admin quantity_unit field (e.g. "bowls 8oz") */
  quantityUnit: string
}

/**
 * All selling unit definitions.
 * Order matters -- this is the order they appear in admin dropdowns.
 */
export const SELLING_UNITS: SellingUnit[] = [
  {
    key: "each",
    adminLabel: "Each (standard item)",
    priceSingular: "por unidad",
    pricePlural: "por unidad",
    qtySingular: "Unidad",
    qtyPlural: "Unidades",
    cardSingular: "por unidad",
    cardPlural: "por unidad",
    quantityUnit: "",
  },
  {
    key: "tray",
    adminLabel: "Tray / Bandeja (serves multiple people)",
    priceSingular: "Bandeja",
    pricePlural: "Bandejas",
    qtySingular: "Bandeja",
    qtyPlural: "Bandejas",
    cardSingular: "bandeja",
    cardPlural: "bandejas",
    quantityUnit: "bandejas",
  },
  {
    key: "half_tray",
    adminLabel: "Half Tray / Bandejita",
    priceSingular: "Bandejita",
    pricePlural: "Bandejitas",
    qtySingular: "Bandejita",
    qtyPlural: "Bandejitas",
    cardSingular: "bandejita",
    cardPlural: "bandejitas",
    quantityUnit: "bandejitas",
  },
  {
    key: "bowl",
    adminLabel: "Bowl",
    priceSingular: "Bowl",
    pricePlural: "Bowls",
    qtySingular: "Bowl",
    qtyPlural: "Bowls",
    cardSingular: "Bowl",
    cardPlural: "Bowls",
    quantityUnit: "bowls",
  },
  {
    key: "bowl_8oz",
    adminLabel: "Bowl 8oz",
    priceSingular: "Bowl 8oz",
    pricePlural: "Bowls 8oz",
    qtySingular: "Bowl 8oz",
    qtyPlural: "Bowls 8oz",
    cardSingular: "Bowl 8oz",
    cardPlural: "Bowls 8oz",
    quantityUnit: "bowls 8oz",
  },
  {
    key: "bowl_16oz",
    adminLabel: "Bowl 16oz",
    priceSingular: "Bowl 16oz",
    pricePlural: "Bowls 16oz",
    qtySingular: "Bowl 16oz",
    qtyPlural: "Bowls 16oz",
    cardSingular: "Bowl 16oz",
    cardPlural: "Bowls 16oz",
    quantityUnit: "bowls 16oz",
  },
  {
    key: "bowl_32oz",
    adminLabel: "Bowl 32oz",
    priceSingular: "Bowl 32oz",
    pricePlural: "Bowls 32oz",
    qtySingular: "Bowl 32oz",
    qtyPlural: "Bowls 32oz",
    cardSingular: "Bowl 32oz",
    cardPlural: "Bowls 32oz",
    quantityUnit: "bowls 32oz",
  },
  {
    key: "bowl_64oz",
    adminLabel: "Bowl 64oz",
    priceSingular: "Bowl 64oz",
    pricePlural: "Bowls 64oz",
    qtySingular: "Bowl 64oz",
    qtyPlural: "Bowls 64oz",
    cardSingular: "Bowl 64oz",
    cardPlural: "Bowls 64oz",
    quantityUnit: "bowls 64oz",
  },
  {
    key: "botella_750ml",
    adminLabel: "Botella 750ml",
    priceSingular: "Botella 750ml",
    pricePlural: "Botellas 750ml",
    qtySingular: "Botella 750ml",
    qtyPlural: "Botellas 750ml",
    cardSingular: "Botella 750ml",
    cardPlural: "Botellas 750ml",
    quantityUnit: "botellas",
  },
  {
    key: "gallon",
    adminLabel: "Gallon / Galon",
    priceSingular: "Galon",
    pricePlural: "Galones",
    qtySingular: "Galon",
    qtyPlural: "Galones",
    cardSingular: "galon",
    cardPlural: "galones",
    quantityUnit: "gallons",
  },
  {
    key: "half_gallon",
    adminLabel: "Half Gallon / Medio Galon",
    priceSingular: "Medio Galon",
    pricePlural: "Medios Galones",
    qtySingular: "Medio Galon",
    qtyPlural: "Medios Galones",
    cardSingular: "medio galon",
    cardPlural: "medios galones",
    quantityUnit: "half gallons",
  },
  {
    key: "liter",
    adminLabel: "Liter / Litro",
    priceSingular: "Litro",
    pricePlural: "Litros",
    qtySingular: "Litro",
    qtyPlural: "Litros",
    cardSingular: "litro",
    cardPlural: "litros",
    quantityUnit: "litros",
  },
  {
    key: "pound",
    adminLabel: "Per Pound / Por Libra (sold by weight)",
    priceSingular: "Por Libra",
    pricePlural: "Por Libra",
    qtySingular: "Libra",
    qtyPlural: "Libras",
    cardSingular: "libra",
    cardPlural: "libras",
    quantityUnit: "libras",
  },
  {
    key: "person",
    adminLabel: "Per Person / Por Persona (priced per guest)",
    priceSingular: "Por Persona",
    pricePlural: "Por Persona",
    qtySingular: "Persona",
    qtyPlural: "Personas",
    cardSingular: "persona",
    cardPlural: "personas",
    quantityUnit: "personas",
  },
  {
    key: "cena_completa",
    adminLabel: "Cena Completa (combo / full dinner)",
    priceSingular: "Cena Completa",
    pricePlural: "Cenas Completas",
    qtySingular: "Cena Completa",
    qtyPlural: "Cenas Completas",
    cardSingular: "Cena Completa",
    cardPlural: "Cenas Completas",
    quantityUnit: "cenas completas",
  },
  {
    key: "box",
    adminLabel: "Box (boxed portions)",
    priceSingular: "Box",
    pricePlural: "Boxes",
    qtySingular: "Caja",
    qtyPlural: "Cajas",
    cardSingular: "caja",
    cardPlural: "cajas",
    quantityUnit: "boxes",
  },
  {
    key: "boxed_lunch",
    adminLabel: "Boxed Lunch (individual meals)",
    priceSingular: "Boxed Lunch",
    pricePlural: "Boxed Lunches",
    qtySingular: "Boxed Lunch",
    qtyPlural: "Boxed Lunches",
    cardSingular: "almuerzo",
    cardPlural: "almuerzos",
    quantityUnit: "boxed lunches",
  },
  {
    key: "paquete",
    adminLabel: "Paquete",
    priceSingular: "Paquete",
    pricePlural: "Paquetes",
    qtySingular: "Paquete",
    qtyPlural: "Paquetes",
    cardSingular: "paquete",
    cardPlural: "paquetes",
    quantityUnit: "paquetes",
  },
  {
    key: "bolsa",
    adminLabel: "Bolsa",
    priceSingular: "Bolsa",
    pricePlural: "Bolsas",
    qtySingular: "Bolsa",
    qtyPlural: "Bolsas",
    cardSingular: "bolsa",
    cardPlural: "bolsas",
    quantityUnit: "bolsas",
  },
  {
    key: "orden",
    adminLabel: "Orden",
    priceSingular: "Orden",
    pricePlural: "Ordenes",
    qtySingular: "Orden",
    qtyPlural: "Ordenes",
    cardSingular: "orden",
    cardPlural: "ordenes",
    quantityUnit: "ordenes",
  },
]

// ─── Pre-built lookup maps (generated once at import time) ───

const unitMap = new Map(SELLING_UNITS.map((u) => [u.key, u]))
const fallback = unitMap.get("each")!

/** Get the full SellingUnit definition by key */
export function getSellingUnit(key: string | null | undefined): SellingUnit {
  return unitMap.get(key || "each") || fallback
}

/** Price context label: "Bandeja" / "Bandejas", "por unidad" / "por unidad" */
export function getUnitLabel(unit: string | null | undefined, count: number): string {
  const u = getSellingUnit(unit)
  return count === 1 ? u.priceSingular : u.pricePlural
}

/** Quantity/count context label: "Bandeja" / "Bandejas", "Unidad" / "Unidades" */
export function getQuantityUnitLabel(unit: string | null | undefined, count: number): string {
  const u = getSellingUnit(unit)
  return count === 1 ? u.qtySingular : u.qtyPlural
}

/** Card display label: "bandeja" / "bandejas", "por unidad" */
export function getUnitLabelCard(unit: string | null | undefined, count: number): string {
  const u = getSellingUnit(unit)
  return count === 1 ? u.cardSingular : u.cardPlural
}

/** Min quantity badge label (uses quantity label, falls back to Unidad/Unidades for "each") */
export function getMinQtyLabel(unit: string | null | undefined, count: number): string {
  if (!unit || unit === "each") return count === 1 ? "Unidad" : "Unidades"
  return getUnitLabelCard(unit, count)
}

/** Admin display label (singular, for price suffix) */
export function getAdminDisplayLabel(unit: string | null | undefined): string {
  return getSellingUnit(unit).priceSingular
}

/** Admin quantity_unit value for database */
export function getQuantityUnitValue(unit: string | null | undefined): string {
  return getSellingUnit(unit).quantityUnit
}

/** Bulk order plural label */
export function getBulkPluralLabel(unit: string | null | undefined): string {
  const u = getSellingUnit(unit)
  return u.quantityUnit || u.qtyPlural.toLowerCase()
}

/** Bulk order singular label */
export function getBulkSingularLabel(unit: string | null | undefined): string {
  const u = getSellingUnit(unit)
  return u.qtySingular.toLowerCase()
}

// ─── Container types (for delivery rate configuration) ───

export interface ContainerType {
  key: string
  label: string
}

export const CONTAINER_TYPES: ContainerType[] = [
  { key: "heavy_tray", label: "Bandeja Pesada (Heavy Tray)" },
  { key: "light_tray", label: "Bandeja Liviana (Light Tray)" },
  { key: "full_tray", label: "Full Tray" },
  { key: "half_tray", label: "Half Tray" },
  { key: "bowl", label: "Bowl" },
  { key: "bowl_8oz", label: "Bowl 8oz" },
  { key: "bowl_16oz", label: "Bowl 16oz" },
  { key: "bowl_32oz", label: "Bowl 32oz" },
  { key: "bowl_64oz", label: "Bowl 64oz" },
  { key: "bag", label: "Bolsa (Bag)" },
  { key: "box", label: "Caja (Box)" },
  { key: "package", label: "Paquete (Package)" },
]

const containerMap = new Map(CONTAINER_TYPES.map((c) => [c.key, c]))

/** Get container display label by key */
export function getContainerLabel(key: string): string {
  return containerMap.get(key)?.label || key
}

/** Get short container label (for display in tables, etc.) */
export function getContainerShortLabel(key: string): string {
  const labels: Record<string, string> = {
    heavy_tray: "Bandeja Pesada",
    light_tray: "Bandeja Liviana",
    full_tray: "Full Tray",
    half_tray: "Half Tray",
    bowl: "Bowl",
    bowl_8oz: "Bowl 8oz",
    bowl_16oz: "Bowl 16oz",
    bowl_32oz: "Bowl 32oz",
    bowl_64oz: "Bowl 64oz",
    bag: "Bolsa",
    box: "Caja",
    package: "Paquete",
  }
  return labels[key] || key
}
