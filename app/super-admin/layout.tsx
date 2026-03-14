import type React from "react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Super Admin | Catering Platform",
  description: "Manage all restaurant instances",
}

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <div className="min-h-screen bg-gray-50">{children}</div>
}
