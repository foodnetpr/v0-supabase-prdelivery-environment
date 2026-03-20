"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  Building2,
  Megaphone,
  Clock,
  Users,
  UtensilsCrossed,
  ShoppingCart,
  Phone,
  FileText,
  Images,
  Coffee,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Menu,
  X,
  Monitor,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"

interface NavItem {
  id: string
  label: string
  icon: React.ReactNode
  href?: string
  isExternal?: boolean
  highlight?: "rose" | "cyan"
}

interface SuperAdminSidebarProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

export function SuperAdminSidebar({ activeTab, onTabChange }: SuperAdminSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [shopSettings, setShopSettings] = useState({
    is_internal_shop_open: true,
    internal_shop_link_to_pop: false,
  })
  const [isTogglingShop, setIsTogglingShop] = useState(false)

  // Fetch shop settings on mount
  useEffect(() => {
    fetch("/api/platform-settings")
      .then((res) => res.json())
      .then((data) => {
        setShopSettings({
          is_internal_shop_open: data.is_internal_shop_open ?? true,
          internal_shop_link_to_pop: data.internal_shop_link_to_pop ?? false,
        })
      })
      .catch(() => {})
  }, [])

  const toggleShop = async (checked: boolean) => {
    setIsTogglingShop(true)
    try {
      const res = await fetch("/api/platform-settings")
      const currentSettings = await res.json()
      
      await fetch("/api/platform-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...currentSettings, is_internal_shop_open: checked }),
      })
      
      setShopSettings((prev) => ({ ...prev, is_internal_shop_open: checked }))
    } catch (error) {
      console.error("Failed to toggle shop:", error)
    } finally {
      setIsTogglingShop(false)
    }
  }

  const navItems: NavItem[] = [
    { id: "restaurants", label: "Restaurantes", icon: <Building2 className="h-5 w-5" /> },
    { id: "marketing", label: "Marketing & Sales", icon: <Megaphone className="h-5 w-5" /> },
    { id: "operations", label: "Operations", icon: <Clock className="h-5 w-5" /> },
    { id: "admin-users", label: "Admin Users", icon: <Users className="h-5 w-5" /> },
    { id: "cuisine-types", label: "Tipos de Cocina", icon: <UtensilsCrossed className="h-5 w-5" /> },
    { id: "internal-shop", label: "Internal Shop", icon: <ShoppingCart className="h-5 w-5" />, href: "/super-admin/internal-shop" },
    { id: "reports", label: "Reports", icon: <FileText className="h-5 w-5" /> },
    { id: "promo-cards", label: "Promo Cards", icon: <Images className="h-5 w-5" /> },
    { id: "kds", label: "KDS (Cocina)", icon: <Monitor className="h-5 w-5" /> },
  ]

  const quickLinks: NavItem[] = [
    { id: "csr", label: "CSR Portal", icon: <Phone className="h-5 w-5" />, href: "/csr", highlight: "rose" },
  ]

  const handleNavClick = (item: NavItem) => {
    if (item.href) {
      // Navigation handled by Link component
      return
    }
    onTabChange(item.id)
    setIsMobileOpen(false)
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo/Header */}
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-900 rounded-lg shrink-0">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden">
              <h1 className="text-lg font-bold text-slate-900 truncate">Super Admin</h1>
              <p className="text-xs text-slate-500 truncate">FoodNet Platform</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <p className={cn("text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-3", isCollapsed && "sr-only")}>
          Menu
        </p>
        {navItems.map((item) => {
          const isActive = activeTab === item.id
          const Component = item.href ? Link : "button"
          
          return (
            <Component
              key={item.id}
              href={item.href || "#"}
              onClick={() => !item.href && handleNavClick(item)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                isActive
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                isCollapsed && "justify-center px-2"
              )}
              title={isCollapsed ? item.label : undefined}
            >
              {item.icon}
              {!isCollapsed && <span className="truncate">{item.label}</span>}
              {item.href && !isCollapsed && <ExternalLink className="h-3 w-3 ml-auto text-slate-400" />}
            </Component>
          )
        })}

        {/* Quick Links Section */}
        <div className="pt-4 mt-4 border-t border-slate-200">
          <p className={cn("text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-3", isCollapsed && "sr-only")}>
            Quick Access
          </p>
          {quickLinks.map((item) => (
            <Link
              key={item.id}
              href={item.href || "#"}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                item.highlight === "rose" && "text-rose-600 hover:bg-rose-50 hover:text-rose-700",
                item.highlight === "cyan" && "text-cyan-600 hover:bg-cyan-50 hover:text-cyan-700",
                isCollapsed && "justify-center px-2"
              )}
              title={isCollapsed ? item.label : undefined}
            >
              {item.icon}
              {!isCollapsed && <span className="truncate">{item.label}</span>}
              {!isCollapsed && <ExternalLink className="h-3 w-3 ml-auto opacity-50" />}
            </Link>
          ))}
        </div>
      </nav>

      {/* FoodNet Shop Quick Control */}
      <div className="p-3 border-t border-slate-200 bg-slate-50">
        <div className={cn(
          "p-3 rounded-lg border bg-white",
          shopSettings.is_internal_shop_open ? "border-cyan-200" : "border-slate-200"
        )}>
          <div className={cn("flex items-center gap-3", isCollapsed ? "justify-center" : "justify-between")}>
            <div className={cn("flex items-center gap-2", isCollapsed && "hidden")}>
              <Coffee className={cn("h-4 w-4", shopSettings.is_internal_shop_open ? "text-cyan-600" : "text-slate-400")} />
              <div>
                <p className="text-xs font-semibold text-slate-700">FoodNet Shop</p>
                <Badge 
                  variant={shopSettings.is_internal_shop_open ? "default" : "secondary"}
                  className={cn("text-[10px] px-1.5 py-0", shopSettings.is_internal_shop_open && "bg-cyan-600")}
                >
                  {shopSettings.is_internal_shop_open ? "Abierto" : "Cerrado"}
                </Badge>
              </div>
            </div>
            {isCollapsed && (
              <Coffee className={cn("h-5 w-5", shopSettings.is_internal_shop_open ? "text-cyan-600" : "text-slate-400")} />
            )}
            <Switch
              checked={shopSettings.is_internal_shop_open}
              onCheckedChange={toggleShop}
              disabled={isTogglingShop}
              className="data-[state=checked]:bg-cyan-600"
            />
          </div>
        </div>
      </div>

      {/* Collapse Toggle (Desktop) */}
      <div className="hidden md:block p-3 border-t border-slate-200">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          {!isCollapsed && <span>Collapse</span>}
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md border border-slate-200"
      >
        <Menu className="h-5 w-5 text-slate-700" />
      </button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={cn(
          "md:hidden fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-xl transform transition-transform duration-300",
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <button
          onClick={() => setIsMobileOpen(false)}
          className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600"
        >
          <X className="h-5 w-5" />
        </button>
        <SidebarContent />
      </aside>

      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col fixed inset-y-0 left-0 bg-white border-r border-slate-200 shadow-sm transition-all duration-300 z-30",
          isCollapsed ? "w-[72px]" : "w-64"
        )}
      >
        <SidebarContent />
      </aside>
    </>
  )
}
