"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Package,
  ArrowLeft,
  Loader2,
  GripVertical,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface InternalShopItem {
  id: string
  name: string
  description: string | null
  price: number
  image_url: string | null
  category: string | null
  is_active: boolean
  display_order: number
  sku: string | null
  created_at: string
  updated_at: string
}

interface InternalShopClientProps {
  initialItems: InternalShopItem[]
}

const DEFAULT_CATEGORIES = [
  "Beverages",
  "Snacks",
  "Desserts",
  "Extras",
  "Merchandise",
]

export function InternalShopClient({ initialItems }: InternalShopClientProps) {
  const [items, setItems] = useState<InternalShopItem[]>(initialItems)
  const [searchQuery, setSearchQuery] = useState("")
  const [showItemModal, setShowItemModal] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [editingItem, setEditingItem] = useState<InternalShopItem | null>(null)
  const [deletingItem, setDeletingItem] = useState<InternalShopItem | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    image_url: "",
    category: "",
    is_active: true,
    display_order: 0,
    sku: "",
  })

  const filteredItems = items.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const categories = [...new Set(items.map((i) => i.category).filter(Boolean))]

  const openCreateModal = () => {
    setEditingItem(null)
    setFormData({
      name: "",
      description: "",
      price: "",
      image_url: "",
      category: "",
      is_active: true,
      display_order: items.length,
      sku: "",
    })
    setError(null)
    setShowItemModal(true)
  }

  const openEditModal = (item: InternalShopItem) => {
    setEditingItem(item)
    setFormData({
      name: item.name,
      description: item.description || "",
      price: String(item.price),
      image_url: item.image_url || "",
      category: item.category || "",
      is_active: item.is_active,
      display_order: item.display_order,
      sku: item.sku || "",
    })
    setError(null)
    setShowItemModal(true)
  }

  const handleSave = async () => {
    if (!formData.name || !formData.price) {
      setError("Name and price are required")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const payload = {
        name: formData.name,
        description: formData.description || null,
        price: parseFloat(formData.price),
        image_url: formData.image_url || null,
        category: formData.category || null,
        is_active: formData.is_active,
        display_order: formData.display_order,
        sku: formData.sku || null,
      }

      let response: Response
      if (editingItem) {
        response = await fetch(`/api/internal-shop/items/${editingItem.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      } else {
        response = await fetch("/api/internal-shop/items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      }

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to save item")
      }

      const data = await response.json()

      if (editingItem) {
        setItems(items.map((i) => (i.id === editingItem.id ? data.item : i)))
      } else {
        setItems([...items, data.item])
      }

      setShowItemModal(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save item")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingItem) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/internal-shop/items/${deletingItem.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to delete item")
      }

      setItems(items.filter((i) => i.id !== deletingItem.id))
      setShowDeleteDialog(false)
      setDeletingItem(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete item")
    } finally {
      setIsLoading(false)
    }
  }

  const toggleItemActive = async (item: InternalShopItem) => {
    try {
      const response = await fetch(`/api/internal-shop/items/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !item.is_active }),
      })

      if (!response.ok) {
        throw new Error("Failed to update item")
      }

      const data = await response.json()
      setItems(items.map((i) => (i.id === item.id ? data.item : i)))
    } catch (err) {
      console.error("Failed to toggle item:", err)
    }
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <div className="border-b bg-background">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/super-admin">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Dashboard
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold">Internal Shop</h1>
                <p className="text-sm text-muted-foreground">
                  Manage platform-owned items (drinks, snacks, extras)
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/shop" target="_blank">
                <Button variant="outline" size="sm">
                  <Package className="mr-2 h-4 w-4" />
                  View Shop
                </Button>
              </Link>
              <Button onClick={openCreateModal}>
                <Plus className="mr-2 h-4 w-4" />
                Add Item
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Stats */}
        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-primary/10 p-3">
                  <Package className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{items.length}</p>
                  <p className="text-sm text-muted-foreground">Total Items</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-green-100 p-3">
                  <Package className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {items.filter((i) => i.is_active).length}
                  </p>
                  <p className="text-sm text-muted-foreground">Active Items</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-blue-100 p-3">
                  <Package className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{categories.length}</p>
                  <p className="text-sm text-muted-foreground">Categories</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-amber-100 p-3">
                  <Package className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    ${items.reduce((sum, i) => sum + Number(i.price), 0).toFixed(2)}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Value</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search items by name, category, or SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Items Table */}
        <Card>
          <CardHeader>
            <CardTitle>Items ({filteredItems.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Package className="mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-semibold">No items found</h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  {searchQuery
                    ? "Try adjusting your search"
                    : "Add your first internal shop item"}
                </p>
                {!searchQuery && (
                  <Button onClick={openCreateModal}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Item
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {item.image_url ? (
                            <Image
                              src={item.image_url}
                              alt={item.name}
                              width={40}
                              height={40}
                              className="rounded-md object-cover"
                            />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
                              <Package className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{item.name}</p>
                            {item.description && (
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {item.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {item.category ? (
                          <Badge variant="secondary">{item.category}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        ${Number(item.price).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {item.sku ? (
                          <code className="text-xs">{item.sku}</code>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={item.is_active}
                          onCheckedChange={() => toggleItemActive(item)}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditModal(item)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              setDeletingItem(item)
                              setShowDeleteDialog(true)
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Item Modal */}
      <Dialog open={showItemModal} onOpenChange={setShowItemModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Edit Item" : "Add New Item"}
            </DialogTitle>
            <DialogDescription>
              {editingItem
                ? "Update the item details below"
                : "Add a new item to the internal shop"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Coca-Cola 12oz"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Classic refreshing beverage"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="price">Price *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: e.target.value })
                  }
                  placeholder="2.50"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="sku">SKU</Label>
                <Input
                  id="sku"
                  value={formData.sku}
                  onChange={(e) =>
                    setFormData({ ...formData, sku: e.target.value })
                  }
                  placeholder="BEV-001"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                placeholder="Beverages"
                list="categories"
              />
              <datalist id="categories">
                {DEFAULT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat} />
                ))}
                {categories
                  .filter((c) => !DEFAULT_CATEGORIES.includes(c as string))
                  .map((cat) => (
                    <option key={cat} value={cat as string} />
                  ))}
              </datalist>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="image_url">Image URL</Label>
              <Input
                id="image_url"
                value={formData.image_url}
                onChange={(e) =>
                  setFormData({ ...formData, image_url: e.target.value })
                }
                placeholder="https://..."
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="is_active">Active</Label>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_active: checked })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowItemModal(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingItem ? "Save Changes" : "Add Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deletingItem?.name}&quot;? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
