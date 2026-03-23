import { updateSession } from "@/lib/supabase/proxy"
import type { NextRequest } from "next/server"

// Next.js 16 uses proxy.ts but is backwards compatible with middleware export name
export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
