import type { CapacitorConfig } from "@capacitor/cli"

const config: CapacitorConfig = {
  // Must match the Bundle ID registered in Apple Developer account
  // and configured in Supabase Apple OAuth provider.
  // Existing users who signed in with Apple Sign In retain their accounts
  // because Supabase matches by Apple user ID (sub claim), not by Bundle ID.
  appId: "ca.salecalle.marketplace.app",
  appName: "SaleCalle Marketplace",
  webDir: "out",
  server: {
    // During development, point to your local Next.js dev server.
    // Comment this out for production builds.
    // url: "http://localhost:3000",
    // cleartext: true,
  },
  ios: {
    // Use WKWebView (default). Allows cookies and Supabase session storage.
    contentInset: "automatic",
    // Allow deep links back into the app after Apple OAuth redirect.
    // Add this URL scheme to your Apple Developer app's Associated Domains.
    scheme: "salecalle",
  },
  plugins: {
    // @capacitor-community/apple-sign-in plugin configuration
    SignInWithApple: {
      // The clientId here is the Bundle ID for native iOS flows.
      clientId: "ca.salecalle.marketplace.app",
    },
  },
}

export default config
