import { createServerClient } from "@/lib/supabase/server"
import { DeliveryLanding } from "@/components/delivery-landing"

export const metadata = {
  title: "FoodNetDelivery - Delivery & Pick-Up",
  description: "Order your favorite food for delivery or pick-up",
}

export default async function LandingPage() {
  const supabase = await createServerClient()

  // Fetch marketplace settings for hero customization
  const { data: marketplaceSettings } = await supabase
    .from("marketplace_settings")
    .select("hero_image_url, hero_title, hero_subtitle")
    .limit(1)
    .single()

  return (
    <DeliveryLanding
      heroImage={marketplaceSettings?.hero_image_url || "/images/partners-hero.jpg"}
      heroTitle={marketplaceSettings?.hero_title || "TUS PLATOS FAVORITOS"}
      heroSubtitle={marketplaceSettings?.hero_subtitle || "¡A tu Puerta!"}
    />
  )
}
