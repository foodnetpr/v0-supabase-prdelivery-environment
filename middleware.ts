import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Middleware to handle KDS PWA session restoration
 * 
 * When a PWA is launched from the home screen, URL query params are lost.
 * This middleware reads the kds_session cookie (set when token was first validated)
 * and redirects to include the token in the URL so server-side auth works.
 */
export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl
  
  // Only handle KDS routes
  if (!pathname.match(/^\/[^\/]+\/kds$/)) {
    return NextResponse.next()
  }

  // If token is already in URL, let the request proceed
  const urlToken = searchParams.get('token')
  console.log('[v0] KDS Middleware - pathname:', pathname, 'urlToken:', urlToken ? 'present' : 'missing')
  if (urlToken) {
    return NextResponse.next()
  }

  // Extract slug from pathname (e.g., /restaurant-slug/kds -> restaurant-slug)
  const slugMatch = pathname.match(/^\/([^\/]+)\/kds$/)
  if (!slugMatch) {
    return NextResponse.next()
  }
  const slug = slugMatch[1]

  // Check for saved KDS session cookie
  const sessionCookie = request.cookies.get(`kds_session_${slug}`)
  console.log('[v0] KDS Middleware - looking for cookie:', `kds_session_${slug}`, 'found:', !!sessionCookie?.value)
  if (!sessionCookie?.value) {
    // No saved session - let the server handle auth (will redirect to login if needed)
    return NextResponse.next()
  }

  try {
    // Cookie value is URL-encoded when set, so decode it first
    const decodedValue = decodeURIComponent(sessionCookie.value)
    const session = JSON.parse(decodedValue)
    
    if (!session.token) {
      return NextResponse.next()
    }

    // Reconstruct URL with saved token and branch
    const url = request.nextUrl.clone()
    url.searchParams.set('token', session.token)
    if (session.branchId) {
      url.searchParams.set('branch', session.branchId)
    }

    return NextResponse.redirect(url)
  } catch {
    // Invalid cookie format - let the server handle auth
    return NextResponse.next()
  }
}

export const config = {
  // Only run on KDS routes - explicitly excludes static files, API routes, and _next
  matcher: [
    /*
     * Match KDS routes only: /:slug/kds
     * Exclude:
     * - api routes (/api/...)
     * - static files (_next/static, _next/image, favicon.ico, etc.)
     * - public files (icons, manifest, sw, etc.)
     */
    '/((?!api|_next/static|_next/image|favicon\\.ico|icons|.*\\.(?:svg|png|jpg|jpeg|gif|webp|js|css|json|woff|woff2)$).*)/kds',
  ],
}
