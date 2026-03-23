import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl

  // Handle KDS PWA session restoration FIRST, before any other processing
  // When a PWA is launched from the home screen, URL query params are lost.
  // This reads the kds_session cookie and redirects to include the token.
  if (pathname.match(/^\/[^\/]+\/kds$/)) {
    const urlToken = searchParams.get('token')
    
    // If token is already in URL, continue to normal processing
    if (!urlToken) {
      // Extract slug from pathname (e.g., /restaurant-slug/kds -> restaurant-slug)
      const slugMatch = pathname.match(/^\/([^\/]+)\/kds$/)
      if (slugMatch) {
        const slug = slugMatch[1]
        const sessionCookie = request.cookies.get(`kds_session_${slug}`)
        
        if (sessionCookie?.value) {
          try {
            const decodedValue = decodeURIComponent(sessionCookie.value)
            const session = JSON.parse(decodedValue)
            
            if (session.token) {
              // Reconstruct URL with saved token and branch
              const url = request.nextUrl.clone()
              url.searchParams.set('token', session.token)
              if (session.branchId) {
                url.searchParams.set('branch', session.branchId)
              }
              return NextResponse.redirect(url)
            }
          } catch {
            // Invalid cookie format - continue to normal processing
          }
        }
      }
    }
  }

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
  // pathname already declared at top of function from request.nextUrl

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
