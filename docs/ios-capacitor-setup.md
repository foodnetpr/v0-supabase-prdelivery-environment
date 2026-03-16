# iOS Capacitor Setup Guide

Bundle ID: **ca.salecalle.marketplace.app**

---

## 1. Install dependencies and add iOS platform

Run these commands once in your project root (requires macOS with Xcode installed):

```bash
pnpm install
pnpm build:mobile        # runs next build && next export — outputs to /out
npx cap add ios          # scaffolds the ios/ directory
npx cap sync             # copies /out into ios/ and syncs plugins
npx cap open ios         # opens Xcode
```

---

## 2. Apple Developer Account — App ID

1. Go to https://developer.apple.com → Certificates, Identifiers & Profiles → Identifiers.
2. Create a new App ID with Bundle ID: `ca.salecalle.marketplace.app`.
3. Under Capabilities, enable **Sign In with Apple**.
4. Save.

---

## 3. Apple Developer Account — Service ID (for web OAuth)

Supabase uses a Service ID for the web-based Apple OAuth redirect flow.

1. Create a new Identifier of type **Services ID**.
2. Set the identifier to: `ca.salecalle.marketplace.web` (convention — must be different from Bundle ID).
3. Enable **Sign In with Apple**, then configure:
   - Primary App ID: `ca.salecalle.marketplace.app`
   - Domains: your Supabase project domain (e.g. `xxxx.supabase.co`) and your app domain.
   - Return URLs: `https://<your-supabase-project>.supabase.co/auth/v1/callback`
4. Save, then generate a **private key** with Sign In with Apple enabled. Download it — you only get one chance.

---

## 4. Supabase — Configure Apple OAuth Provider

In your Supabase dashboard → Authentication → Providers → Apple:

| Field | Value |
|---|---|
| Service ID | `ca.salecalle.marketplace.web` |
| Team ID | Your 10-char Apple Team ID |
| Key ID | The ID of the private key you downloaded |
| Private Key | Paste the contents of the `.p8` file |

Leave **Bundle ID** blank (it is only for native flows; Supabase handles it via the identity token).

Enable the provider and save.

---

## 5. Supabase — Allow native Apple Sign In (identity token)

For the native Capacitor flow, the app sends an Apple identity token directly to Supabase via `signInWithIdToken`. No extra Supabase configuration is needed beyond step 4 — Supabase validates the token against Apple's public keys automatically as long as the Apple provider is enabled.

---

## 6. Associated Domains (deep linking back to the app)

To handle OAuth redirects back into the native app:

1. In Xcode, select your target → Signing & Capabilities → + Capability → Associated Domains.
2. Add: `applinks:salecalle.app` (or your domain).
3. Host a `/.well-known/apple-app-site-association` file on your domain pointing to the app.

Alternatively, for development use Capacitor's built-in custom URL scheme (`salecalle://`) configured in `capacitor.config.ts`.

---

## 7. Existing users — continuity guarantee

Supabase identifies Apple users by their **stable Apple user ID** (the `sub` claim in the identity token), not by Bundle ID. This means:

- Users who previously signed in with Apple on the old app will be matched automatically by their Apple user ID.
- If their `customers` row was unlinked (no `auth_user_id`), the callback redirects them to `/auth/link-account` to claim their history.
- No re-registration is required.

---

## 8. Build for production

```bash
pnpm build:mobile        # export static Next.js build
npx cap sync             # sync to ios/
npx cap open ios         # open Xcode → Archive → distribute
```

Make sure `next.config.mjs` has `output: 'export'` set for static export, and all API routes use the Vercel deployment URL (not relative paths) since Capacitor serves static files locally.
