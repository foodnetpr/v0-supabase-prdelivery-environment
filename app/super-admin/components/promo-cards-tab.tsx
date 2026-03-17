"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { ImageUpload } from "@/components/image-upload"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Pencil, Trash2, GripVertical, Eye, EyeOff, ExternalLink, Loader2 } from "lucide-react"

interface PromoCard {
  id: string
  title: string
  subtitle: string | null
  badge: string | null
  badge_color: string
  image_url: string | null
  href: string | null
  display_order: number
  is_active: boolean
}

const BADGE_COLORS = [
  { value: "bg-red-500", label: "Red", swatch: "#ef4444" },
  { value: "bg-blue-500", label: "Blue", swatch: "#3b82f6" },
  { value: "bg-emerald-500", label: "Green", swatch: "#10b981" },
  { value: "bg-amber-500", label: "Amber", swatch: "#f59e0b" },
  { value: "bg-purple-500", label: "Purple", swatch: "#8b5cf6" },
  { value: "bg-slate-700", label: "Dark", swatch: "#334155" },
]

const EMPTY_FORM = {
  title: "",
  subtitle: "",
  badge_text: "",
  badge_color: "bg-blue-500",
  image_url: "",
  href: "",
  is_active: true,
}

export function PromoCardsTab() {
  const [cards, setCards] = useState<PromoCard[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCard, setEditingCard] = useState<PromoCard | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchCards = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/super-admin/promo-cards")
      if (!res.ok) throw new Error("Failed to load promo cards")
      const data = await res.json()
      setCards(data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { fetchCards() }, [])

  // ── Dialog helpers ─────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditingCard(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  const openEdit = (card: PromoCard) => {
    setEditingCard(card)
    setForm({
      title: card.title,
      subtitle: card.subtitle ?? "",
      badge_text: card.badge ?? "",
      badge_color: card.badge_color,
      image_url: card.image_url ?? "",
      href: card.href ?? "",
      is_active: card.is_active,
    })
    setDialogOpen(true)
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.title.trim()) return
    setIsSaving(true)
    setError(null)
    try {
      const payload = {
        title: form.title.trim(),
        subtitle: form.subtitle.trim() || null,
        badge: form.badge_text.trim() || null,
        badge_color: form.badge_color,
        image_url: form.image_url || null,
        href: form.href.trim() || "#",
        is_active: form.is_active,
      }

      const res = await fetch(
        editingCard
          ? `/api/super-admin/promo-cards/${editingCard.id}`
          : "/api/super-admin/promo-cards",
        {
          method: editingCard ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      )
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        console.log("[v0] Save error:", errorData)
        throw new Error(errorData.error || `Failed to save (${res.status})`)
      }
      setDialogOpen(false)
      await fetchCards()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setIsSaving(false)
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    setIsSaving(true)
    try {
      const res = await fetch(`/api/super-admin/promo-cards/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete")
      setDeleteConfirm(null)
      await fetchCards()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setIsSaving(false)
    }
  }

  // ── Toggle active ─────────────────────────────────────────────────────────
  const toggleActive = async (card: PromoCard) => {
    try {
      await fetch(`/api/super-admin/promo-cards/${card.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !card.is_active }),
      })
      await fetchCards()
    } catch {}
  }

  // ── Move order ────────────────────────────────────────────────────────────
  const moveCard = async (id: string, direction: "up" | "down") => {
    const sorted = [...cards].sort((a, b) => a.display_order - b.display_order)
    const idx = sorted.findIndex((c) => c.id === id)
    const swapIdx = direction === "up" ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= sorted.length) return

    const a = sorted[idx]
    const b = sorted[swapIdx]

    await Promise.all([
      fetch(`/api/super-admin/promo-cards/${a.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_order: b.display_order }),
      }),
      fetch(`/api/super-admin/promo-cards/${b.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_order: a.display_order }),
      }),
    ])
    await fetchCards()
  }

  const sorted = [...cards].sort((a, b) => a.display_order - b.display_order)

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Promo Cards</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage the promotional banner cards shown on the marketplace homepage.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add Card
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-lg border border-red-200">
          {error}
        </div>
      )}

      {/* Card list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      ) : sorted.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
            <p className="text-sm">No promo cards yet.</p>
            <Button variant="outline" size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1" /> Add your first card
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sorted.map((card, idx) => (
            <Card
              key={card.id}
              className={`transition-opacity ${card.is_active ? "" : "opacity-50"}`}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {/* Order controls */}
                  <div className="flex flex-col gap-0.5 shrink-0">
                    <button
                      onClick={() => moveCard(card.id, "up")}
                      disabled={idx === 0}
                      className="p-1 rounded hover:bg-slate-100 disabled:opacity-20 disabled:cursor-not-allowed"
                      aria-label="Move up"
                    >
                      <GripVertical className="h-3.5 w-3.5 text-slate-400 rotate-90" />
                    </button>
                    <span className="text-[10px] text-slate-400 text-center font-mono">{idx + 1}</span>
                    <button
                      onClick={() => moveCard(card.id, "down")}
                      disabled={idx === sorted.length - 1}
                      className="p-1 rounded hover:bg-slate-100 disabled:opacity-20 disabled:cursor-not-allowed"
                      aria-label="Move down"
                    >
                      <GripVertical className="h-3.5 w-3.5 text-slate-400 -rotate-90" />
                    </button>
                  </div>

                  {/* Thumbnail */}
                  <div className="w-24 h-12 rounded-md overflow-hidden bg-slate-100 shrink-0 relative">
                    {card.image_url ? (
                      <Image src={card.image_url} alt={card.title} fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300 text-xs">
                        No image
                      </div>
                    )}
                    {card.badge && (
                      <span
                        className={`absolute top-1 left-1 ${card.badge_color} text-white text-[8px] font-bold px-1.5 py-0.5 rounded`}
                      >
                        {card.badge}
                      </span>
                    )}
                  </div>

                  {/* Text info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 text-sm truncate">{card.title}</p>
                    {card.subtitle && (
                      <p className="text-xs text-slate-500 truncate">{card.subtitle}</p>
                    )}
                    {card.href && (
                      <a
                        href={card.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline mt-0.5"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {card.href}
                      </a>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => toggleActive(card)}
                      className={`p-1.5 rounded hover:bg-slate-100 transition-colors ${
                        card.is_active ? "text-emerald-600" : "text-slate-400"
                      }`}
                      aria-label={card.is_active ? "Hide card" : "Show card"}
                      title={card.is_active ? "Visible — click to hide" : "Hidden — click to show"}
                    >
                      {card.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => openEdit(card)}
                      className="p-1.5 rounded hover:bg-slate-100 text-slate-600 transition-colors"
                      aria-label="Edit card"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(card.id)}
                      className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                      aria-label="Delete card"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Edit / Create dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCard ? "Edit Promo Card" : "New Promo Card"}</DialogTitle>
            <DialogDescription>
              Configure the card&apos;s image, badge, text, and the link it navigates to when clicked.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-1">
            {/* Image */}
            <div className="space-y-1.5">
              <Label>Card Image</Label>
              <ImageUpload
                value={form.image_url}
                onChange={(url) => setForm((f) => ({ ...f, image_url: url }))}
                onRemove={() => setForm((f) => ({ ...f, image_url: "" }))}
                label="Promo Image"
              />
              <p className="text-xs text-slate-400">Recommended: 600 × 240 px (5:2 ratio). Max 5 MB.</p>
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <Label htmlFor="promo-title">Title *</Label>
              <Input
                id="promo-title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Bebidas & Extras"
              />
            </div>

            {/* Subtitle */}
            <div className="space-y-1.5">
              <Label htmlFor="promo-subtitle">Subtitle</Label>
              <Input
                id="promo-subtitle"
                value={form.subtitle}
                onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))}
                placeholder="e.g. Agrega a tu orden"
              />
            </div>

            {/* Badge */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="promo-badge">Badge Text</Label>
                <Input
                  id="promo-badge"
                  value={form.badge_text}
                  onChange={(e) => setForm((f) => ({ ...f, badge_text: e.target.value }))}
                  placeholder="e.g. Nuevo, 2x1"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Badge Color</Label>
                <Select
                  value={form.badge_color}
                  onValueChange={(v) => setForm((f) => ({ ...f, badge_color: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BADGE_COLORS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full inline-block shrink-0"
                            style={{ backgroundColor: c.swatch }}
                          />
                          {c.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Link */}
            <div className="space-y-1.5">
              <Label htmlFor="promo-href">Link URL</Label>
              <Input
                id="promo-href"
                value={form.href}
                onChange={(e) => setForm((f) => ({ ...f, href: e.target.value }))}
                placeholder="e.g. /shop or https://..."
              />
              <p className="text-xs text-slate-400">
                Use a relative path (e.g. <code className="bg-slate-100 px-1 rounded">/shop</code>) for internal pages or a full URL for external links.
              </p>
            </div>

            {/* Active toggle */}
            <div className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-700">Visible on homepage</p>
                <p className="text-xs text-slate-400">Hidden cards are saved but not shown to customers.</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={form.is_active}
                onClick={() => setForm((f) => ({ ...f, is_active: !f.is_active }))}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                  form.is_active ? "bg-slate-900" : "bg-slate-200"
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    form.is_active ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving || !form.title.trim()}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingCard ? "Save Changes" : "Create Card"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirm dialog ── */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Promo Card</DialogTitle>
            <DialogDescription>
              This will permanently remove the card from the homepage. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              disabled={isSaving}
            >
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
