import { updateSession } from "@/lib/supabase/proxy"
import type { NextRequest } from "next/server"

// Next.js 16 requires either a default export or named "proxy" export
async function proxyHandler(request: NextRequest) {
  return await updateSession(request)
}

// Export as default (required by Next.js 16)
export default proxyHandler

// Also export as named "proxy" and "middleware" for compatibility
export const proxy = proxyHandler
export const middleware = proxyHandler

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
