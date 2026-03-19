import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export const metadata = {
  title: "CSR Portal - FoodNetPR",
  description: "Customer Service Representative Phone Order Portal",
}

export default async function CSRLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  
  // Check if user is authenticated
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect("/login?redirect=/csr")
  }
  
  // Check if user is an admin
  const { data: adminUser } = await supabase
    .from("admin_users")
    .select("id, role")
    .eq("auth_user_id", user.id)
    .single()
  
  if (!adminUser || !["super_admin", "restaurant_admin"].includes(adminUser.role)) {
    redirect("/")
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {children}
    </div>
  )
}
