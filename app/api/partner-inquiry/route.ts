import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { Resend } from "resend"

const NOTIFY_EMAIL = "foodnetpr.mail@gmail.com"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, restaurant_name, address, email, phone } = body

    // Validate required fields
    if (!name || !restaurant_name || !email || !phone) {
      return NextResponse.json(
        { error: "Todos los campos requeridos deben ser completados." },
        { status: 400 },
      )
    }

    // Save to database
    const supabase = await createClient()
    const { error: dbError } = await supabase.from("partner_inquiries").insert({
      name,
      restaurant_name,
      address: address || null,
      email,
      phone,
    })

    if (dbError) {
      console.error("[Partner Inquiry] DB error:", dbError)
    }

    // Send email notification via Resend
    try {
      const resend = new Resend(process.env.RESEND_API_KEY)

      const fecha = new Date().toLocaleString("es-PR", { timeZone: "America/Puerto_Rico" })

      const { error: emailError } = await resend.emails.send({
        from: "JunteReady <onboarding@resend.dev>",
        to: [NOTIFY_EMAIL],
        subject: `Nuevo Interes: ${restaurant_name} - ${name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #1e293b; padding: 24px; border-radius: 8px 8px 0 0;">
              <h1 style="color: #ffffff; margin: 0; font-size: 20px;">Nuevo Interes de Restaurante</h1>
              <p style="color: #94a3b8; margin: 4px 0 0;">JunteReady - Formulario de Partners</p>
            </div>
            <div style="background-color: #ffffff; padding: 24px; border: 1px solid #e2e8f0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; font-weight: bold; color: #334155; width: 140px;">Nombre</td>
                  <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #1e293b;">${name}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; font-weight: bold; color: #334155;">Restaurante</td>
                  <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #1e293b;">${restaurant_name}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; font-weight: bold; color: #334155;">Direccion</td>
                  <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #1e293b;">${address || "No provista"}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; font-weight: bold; color: #334155;">Email</td>
                  <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #1e293b;"><a href="mailto:${email}" style="color: #2563eb;">${email}</a></td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; font-weight: bold; color: #334155;">Telefono</td>
                  <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #1e293b;"><a href="tel:${phone}" style="color: #2563eb;">${phone}</a></td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; font-weight: bold; color: #334155;">Fecha</td>
                  <td style="padding: 12px 0; color: #1e293b;">${fecha}</td>
                </tr>
              </table>
            </div>
            <div style="background-color: #f8fafc; padding: 16px 24px; border-radius: 0 0 8px 8px; border: 1px solid #e2e8f0; border-top: none;">
              <p style="margin: 0; font-size: 13px; color: #64748b;">Este mensaje fue generado automaticamente desde el formulario de partners en junteready.com</p>
            </div>
          </div>
        `,
      })

      if (emailError) {
        console.error("[Partner Inquiry] Resend error:", emailError)
      }
    } catch (emailError) {
      console.error("[Partner Inquiry] Email notification error:", emailError)
      // Non-fatal: form was saved to DB even if email fails
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Partner Inquiry] Unexpected error:", error)
    return NextResponse.json(
      { error: "Error inesperado. Intenta nuevamente." },
      { status: 500 },
    )
  }
}
