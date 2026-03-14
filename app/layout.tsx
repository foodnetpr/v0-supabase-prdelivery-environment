import type React from "react"
import { Inter, Playfair_Display } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "@/components/ui/toaster"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-playfair",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className={`${inter.variable} ${playfair.variable}`} suppressHydrationWarning>
      <body className={`font-sans antialiased`} suppressHydrationWarning>
        {children}
        <Toaster />
        <Analytics />
      </body>
    </html>
  )
}

export const metadata = {
      generator: 'v0.app'
    };
