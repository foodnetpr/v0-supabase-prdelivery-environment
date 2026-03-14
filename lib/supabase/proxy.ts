import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || globalThis.process?.env?.NEXT_PUBLIC_SUPABASE_URL || ""
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || globalThis.process?.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

  if (!supabaseUrl || !supabaseAnonKey) {
    return supabaseResponse
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({
          request,
        })
        cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const hostname = request.headers.get("host") || ""
  const pathname = request.nextUrl.pathname

  // Skip routing for known system paths and already-routed paths
  const isSystemPath =
    pathname.startsWith("/api") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/admin")

  // Check if we're on a custom domain (not localhost, not vercel preview, not the main app domain)
  const isCustomDomain =
    !hostname.includes("localhost") &&
    !hostname.includes("vercel.app") &&
    !hostname.includes("v0.dev") &&
    !hostname.includes("vusercontent.net")

  if (isCustomDomain && !isSystemPath) {
    // Look up the restaurant by standalone_domain
    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("slug")
      .eq("standalone_domain", hostname.replace("www.", ""))
      .eq("is_active", true)
      .maybeSingle()

    if (restaurant) {
      // If at root, rewrite to the restaurant's portal
      if (pathname === "/" || pathname === "") {
        const url = request.nextUrl.clone()
        url.pathname = `/${restaurant.slug}`
        return NextResponse.rewrite(url)
      }

      // If accessing admin on custom domain, rewrite to correct path
      if (pathname === "/admin" || pathname.startsWith("/admin/")) {
        const url = request.nextUrl.clone()
        url.pathname = `/${restaurant.slug}${pathname}`
        return NextResponse.rewrite(url)
      }
    }
  }

  // Protect restaurant admin routes
  if (request.nextUrl.pathname.includes("/admin") && !request.nextUrl.pathname.startsWith("/api") && !user) {
    const url = request.nextUrl.clone()
    url.pathname = "/auth/login"
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
