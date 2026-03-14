import type React from "react"
import { createServerClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { TenantThemeProvider } from "@/components/theme-provider"

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createServerClient()

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("name, logo_url")
    .eq("slug", slug)
    .eq("is_active", true)
    .single()

  if (!restaurant) {
    return { title: "Restaurant Not Found" }
  }

  return {
    title: restaurant.name,
    description: `Ordena catering de ${restaurant.name}`,
    icons: restaurant.logo_url ? [{ rel: "icon", url: restaurant.logo_url }] : undefined,
    openGraph: {
      title: restaurant.name,
      description: `Ordena catering de ${restaurant.name}`,
      ...(restaurant.logo_url ? { images: [{ url: restaurant.logo_url }] } : {}),
    },
  }
}

export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createServerClient()

  // Don't filter by is_active in layout - let individual pages handle access control
  // This allows KDS and admin pages to work even if restaurant is temporarily inactive
  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("primary_color, name")
    .eq("slug", slug)
    .single()

  if (!restaurant) {
    notFound()
  }

  return <TenantThemeProvider primaryColor={restaurant.primary_color}>{children}</TenantThemeProvider>
}
