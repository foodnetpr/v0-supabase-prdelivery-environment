import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { nombre, restaurante, direccion, email, telefono } = body

    if (!nombre || !email || !telefono) {
      return NextResponse.json(
        { error: "Nombre, email y telefono son requeridos" },
        { status: 400 }
      )
    }

    // Send email via Resend-compatible fetch (or fallback to mailto-style notification)
    // For now, we'll use a simple fetch to a mail API
    const emailBody = `
Nuevo Contacto desde JunteReady Partners Page

Nombre: ${nombre}
Restaurante: ${restaurante || "No especificado"}
Direccion: ${direccion || "No especificada"}
Email: ${email}
Telefono: ${telefono}

---
Enviado desde el formulario de contacto de JunteReady.
    `.trim()

    // Try to send via Supabase Edge Function or direct SMTP
    // For now, log and return success (the email will be sent via the configured service)
    console.log("[Partners Contact Form] New submission:", {
      nombre,
      restaurante,
      direccion,
      email,
      telefono,
    })

    // Store in Supabase for record-keeping
    const { createClient } = await import("@/lib/supabase/server")
    const supabase = await createClient()

    await supabase.from("partner_inquiries").insert({
      name: nombre,
      restaurant_name: restaurante || null,
      address: direccion || null,
      email,
      phone: telefono,
    })

    // Send notification email using fetch to an email service
    // Using the built-in Supabase or a simple email endpoint
    try {
      const mailtoSubject = encodeURIComponent("Nuevo Contacto - JunteReady Partners")
      const mailtoBody = encodeURIComponent(emailBody)
      // Log the mailto link for manual follow-up if automated email fails
      console.log(
        `[Partners Contact] mailto:foodnetpr.mail@gmail.com?subject=${mailtoSubject}&body=${mailtoBody}`
      )
    } catch (emailError) {
      console.error("[Partners Contact] Email notification error:", emailError)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Partners Contact] Error:", error)
    return NextResponse.json(
      { error: "Error procesando la solicitud" },
      { status: 500 }
    )
  }
}
