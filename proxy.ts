import { updateSession } from "@/lib/supabase/proxy"
import type { NextRequest } from "next/server"

// Next.js 16 proxy file - must export a function named "proxy"
export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

// Also export as middleware for backwards compatibility
export const middleware = proxy

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
