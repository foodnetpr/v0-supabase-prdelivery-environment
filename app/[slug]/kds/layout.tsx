import type { Metadata, Viewport } from "next"
import type { ReactNode } from "react"
import { Inter } from "next/font/google"
import "@/app/globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

export const metadata: Metadata = {
  title: "KDS - Kitchen Display System",
  description: "Sistema de visualización de pedidos para cocina",
  manifest: "/kds-manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "KDS",
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  minimumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#1f2937",
}

export default function KDSLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={inter.variable}>
      <head>
        {/* iOS PWA meta tags */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="KDS" />
        
        {/* iOS icons */}
        <link rel="apple-touch-icon" href="/icons/kds-icon-192.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/kds-icon-192.png" />
        
        {/* iOS splash screens would go here for different device sizes */}
        
        {/* Prevent text selection and callouts on iOS */}
        <style>{`
          * {
            -webkit-touch-callout: none;
            -webkit-user-select: none;
            user-select: none;
          }
          input, textarea {
            -webkit-user-select: auto;
            user-select: auto;
          }
          html, body {
            overscroll-behavior: none;
            overflow: hidden;
            position: fixed;
            width: 100%;
            height: 100%;
          }
        `}</style>
      </head>
      <body 
        className="font-sans antialiased bg-gray-800 text-white overflow-hidden"
        style={{ 
          touchAction: "none",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {children}
        
        {/* Service Worker Registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                // Register service worker immediately for faster caching
                navigator.serviceWorker.register('/kds-sw.js', { scope: '/' })
                  .then(function(registration) {
                    console.log('[KDS] Service Worker registered:', registration.scope);
                    
                    // Check for updates periodically
                    setInterval(function() {
                      registration.update();
                    }, 60 * 60 * 1000); // Check every hour
                    
                    // Handle updates
                    registration.addEventListener('updatefound', function() {
                      var newWorker = registration.installing;
                      newWorker.addEventListener('statechange', function() {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                          console.log('[KDS] New version available');
                        }
                      });
                    });
                  })
                  .catch(function(error) {
                    console.error('[KDS] Service Worker registration failed:', error);
                  });
                
                // Handle controller change (new SW activated)
                navigator.serviceWorker.addEventListener('controllerchange', function() {
                  console.log('[KDS] Service Worker controller changed');
                });
              }
            `,
          }}
        />
      </body>
    </html>
  )
}
