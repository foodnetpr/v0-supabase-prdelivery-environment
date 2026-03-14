import type { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"
import {
  ChefHat,
  ShoppingCart,
  Truck,
  CreditCard,
  BarChart3,
  Phone,
  Store,
  Palette,
  Building2,
  Package,
  Sparkles,
  ArrowRight,
  Check,
} from "lucide-react"
import { PartnerContactForm } from "@/components/partner-contact-form"

export const metadata: Metadata = {
  title: "Para Restaurantes | JunteReady",
  description:
    "Digitaliza tu negocio de catering con portales personalizados, gestion de menu, ordenes online, pagos integrados y mucho mas.",
}

const FEATURES = [
  {
    icon: Store,
    title: "Portal Personalizado",
    description:
      "Tu propio portal con marca, colores y dominio personalizado. Opcion white-label disponible.",
  },
  {
    icon: ChefHat,
    title: "Menu Digital Completo",
    description:
      "Gestiona tu menu con tamanos, precios por unidad, personalizaciones, fotos y descripciones.",
  },
  {
    icon: Package,
    title: "Paquetes de Servicio",
    description:
      "Crea paquetes con add-ons como mesas, cubiertos, servilletas y extras para eventos.",
  },
  {
    icon: Truck,
    title: "Delivery y Pick-Up",
    description:
      "Ambos metodos con zonas de delivery configurables, tarifas y horarios de servicio.",
  },
  {
    icon: ShoppingCart,
    title: "Carrito con Upsells",
    description:
      "Carrito inteligente con upsells que aumentan el valor promedio de cada orden.",
  },
  {
    icon: CreditCard,
    title: "Multiples Metodos de Pago",
    description:
      "Stripe, Square y ATH Movil integrados. Tarjetas de credito, debito y pagos locales.",
    highlight: true,
  },
  {
    icon: BarChart3,
    title: "Panel de Ordenes",
    description:
      "Dashboard con calendario, estadisticas de ventas y administracion completa.",
  },
  {
    icon: Phone,
    title: "Ordenes por Telefono",
    description:
      "Formulario dedicado para registrar ordenes recibidas por telefono rapidamente.",
  },
  {
    icon: Sparkles,
    title: "Notificaciones",
    description:
      "Notificaciones automaticas al cliente con actualizaciones y confirmaciones de su orden.",
  },
  {
    icon: Palette,
    title: "Plantillas de Diseno",
    description:
      "Plantillas profesionales con colores, tipografia y layout personalizables.",
  },
  {
    icon: Building2,
    title: "Multi-Sucursal",
    description:
      "Gestiona multiples ubicaciones con menus y configuraciones independientes.",
  },
]

const STEPS = [
  {
    number: "01",
    title: "Registra tu Restaurante",
    description: "Crea tu cuenta y configura tu perfil con logo, colores de marca y datos de contacto.",
  },
  {
    number: "02",
    title: "Configura tu Menu",
    description: "Agrega platos, tamanos, precios, paquetes de servicio y extras desde tu panel.",
  },
  {
    number: "03",
    title: "Recibe Ordenes",
    description: "Comparte tu portal y comienza a recibir ordenes de catering online al instante.",
  },
]

export default function PartnersPage() {
  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Navigation - clean, logo centered feel */}
      <nav className="sticky top-0 z-50 border-b border-slate-100 bg-white/90 backdrop-blur-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link href="/" className="flex items-center">
            <Image
              src="/junte-ready-logo.png"
              alt="JunteReady"
              width={160}
              height={48}
              className="h-9 w-auto"
            />
          </Link>
          <div className="flex items-center gap-4">
            <a
              href="#contacto"
              className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-slate-800"
            >
              Solicitar Demo
            </a>
          </div>
        </div>
      </nav>

      {/* Hero - Full-width image banner */}
      <section className="relative min-h-[520px] flex items-center overflow-hidden">
        <Image
          src="/images/partners-hero.jpg"
          alt="Catering profesional"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-900/70 to-slate-900/40" />
        <div className="relative z-10 mx-auto w-full max-w-6xl px-6 py-20">
          <div className="max-w-2xl">
            <span className="mb-4 inline-block rounded-full bg-amber-400/90 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-900">
              Plataforma para Catering
            </span>
            <h1 className="text-balance text-4xl font-bold leading-tight tracking-tight text-white md:text-5xl lg:text-6xl">
              Digitaliza tu negocio de catering
            </h1>
            <p className="mt-5 max-w-xl text-pretty text-lg leading-relaxed text-slate-200">
              Portal personalizado, menu digital, ordenes online, pagos integrados y todo lo que necesitas para crecer.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <a
                href="#contacto"
                className="inline-flex items-center gap-2 rounded-lg bg-amber-400 px-7 py-3.5 text-sm font-bold text-slate-900 transition-all hover:bg-amber-300"
              >
                Comienza Ahora
                <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href="#funcionalidades"
                className="inline-flex items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20"
              >
                Ver Funcionalidades
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Visual Break - Image strip with 3 cards */}
      <section className="border-y border-slate-100 bg-slate-50 py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="group overflow-hidden rounded-2xl bg-white shadow-sm transition-shadow hover:shadow-md">
              <div className="relative h-48 overflow-hidden">
                <Image
                  src="/images/partners-chef-tablet.png"
                  alt="Gestion digital de ordenes"
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="p-5">
                <h3 className="font-semibold text-slate-900">Tu Portal, Tu Marca</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Cada restaurante obtiene un portal completamente personalizado con tu logo, colores y dominio.
                </p>
              </div>
            </div>
            <div className="group overflow-hidden rounded-2xl bg-white shadow-sm transition-shadow hover:shadow-md">
              <div className="relative h-48 overflow-hidden">
                <Image
                  src="/images/partners-delivery.jpg"
                  alt="Servicio de delivery"
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="p-5">
                <h3 className="font-semibold text-slate-900">Delivery y Pick-Up</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Zonas de entrega configurables, tarifas personalizadas y seguimiento de ordenes en tiempo real.
                </p>
              </div>
            </div>
            <div className="group overflow-hidden rounded-2xl bg-white shadow-sm transition-shadow hover:shadow-md">
              <div className="relative h-48 overflow-hidden">
                <Image
                  src="/images/slide-catering-2.jpg"
                  alt="Eventos de catering"
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="p-5">
                <h3 className="font-semibold text-slate-900">Eventos sin Limites</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Paquetes de servicio con add-ons, menus personalizados y gestion completa del evento.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ATH Movil - Featured Section */}
      <section className="relative overflow-hidden border-y-4 border-orange-400 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-16 lg:py-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(251,146,60,0.15),transparent_50%)]"></div>
        <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-orange-500/10 to-transparent"></div>
        <div className="relative mx-auto max-w-6xl px-6">
          <div className="flex flex-col items-center gap-8 md:flex-row md:gap-16">
            {/* Logo */}
            <div className="flex-shrink-0">
              <div className="rounded-2xl bg-white p-6 shadow-2xl shadow-orange-500/20">
                <Image
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-HVv8Ht9r7eSGBNySNgfiTew0oQdLLr.png"
                  alt="ATH Móvil"
                  width={200}
                  height={80}
                  className="h-16 w-auto"
                />
              </div>
            </div>
            {/* Content */}
            <div className="flex-1 text-center md:text-left">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-orange-500 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-white">
                <span className="flex items-center gap-0.5">
                  <span className="inline-block h-2.5 w-0.5 bg-red-600 rounded-sm"></span>
                  <span className="inline-block h-2.5 w-1 bg-white rounded-sm"></span>
                  <span className="inline-block h-2.5 w-0.5 bg-blue-600 rounded-sm"></span>
                </span>
                Integrado para Puerto Rico
              </div>
              <h2 className="text-balance text-2xl font-bold tracking-tight text-white md:text-3xl lg:text-4xl">
                Acepta pagos con <span className="text-orange-400">ATH Movil</span>
              </h2>
              <p className="mt-4 max-w-xl text-pretty text-base leading-relaxed text-slate-300 md:text-lg">
                El metodo de pago preferido en Puerto Rico. Tus clientes pagan directamente desde su app ATH Movil con la comodidad y seguridad que ya conocen.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-4 md:justify-start">
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Check className="h-4 w-4 text-orange-400" />
                  <span>Pagos instantaneos</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Check className="h-4 w-4 text-orange-400" />
                  <span>Sin comisiones adicionales</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Check className="h-4 w-4 text-orange-400" />
                  <span>Facil de configurar</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Other Payment Methods - Stripe & Square */}
      <section className="bg-slate-50 py-12 lg:py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto mb-8 max-w-2xl text-center">
            <h3 className="text-xl font-bold tracking-tight text-slate-900 md:text-2xl">
              Tambien aceptamos tarjetas de credito y debito
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Conecta tu cuenta de Stripe o Square para procesar pagos con tarjeta
            </p>
          </div>
          
          <div className="mx-auto grid max-w-2xl gap-6 md:grid-cols-2">
            {/* Stripe */}
            <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 transition-all hover:border-indigo-200 hover:shadow-md">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white">
                <CreditCard className="h-6 w-6" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-900">Stripe</h4>
                <p className="text-sm text-slate-600">Visa, Mastercard, Amex y mas</p>
              </div>
            </div>
            
            {/* Square */}
            <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 transition-all hover:border-slate-300 hover:shadow-md">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white">
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="4" y="4" width="16" height="16" rx="2"/>
                </svg>
              </div>
              <div>
                <h4 className="font-semibold text-slate-900">Square</h4>
                <p className="text-sm text-slate-600">Ideal si ya usas Square</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="funcionalidades" className="py-20 lg:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <h2 className="text-balance text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
              Todo lo que necesitas para tu negocio
            </h2>
            <p className="mt-4 text-pretty text-lg leading-relaxed text-slate-600">
              Funcionalidades integradas para gestionar y hacer crecer tu negocio de catering.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className={`group rounded-2xl border bg-white p-6 transition-all hover:shadow-lg ${
                  (feature as any).highlight 
                    ? "border-amber-300 bg-gradient-to-br from-amber-50 to-white shadow-md shadow-amber-100/50" 
                    : "border-slate-200 hover:border-amber-200 hover:shadow-amber-600/5"
                }`}
              >
                <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl text-white transition-colors ${
                  (feature as any).highlight 
                    ? "bg-amber-500 group-hover:bg-amber-600" 
                    : "bg-slate-900 group-hover:bg-amber-400 group-hover:text-slate-900"
                }`}>
                  <feature.icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-slate-900">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works - with photo side */}
      <section className="overflow-hidden bg-slate-900 py-20 lg:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <span className="mb-4 inline-block text-sm font-bold uppercase tracking-wider text-amber-400">
                Como Funciona
              </span>
              <h2 className="text-balance text-3xl font-bold tracking-tight text-white md:text-4xl">
                Comienza en 3 simples pasos
              </h2>
              <p className="mt-4 text-pretty text-lg leading-relaxed text-slate-400">
                Configura tu portal en minutos y recibe ordenes de catering online desde el primer dia.
              </p>

              <div className="mt-10 space-y-8">
                {STEPS.map((step) => (
                  <div key={step.number} className="flex gap-5">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-amber-400 text-lg font-bold text-slate-900">
                      {step.number}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">{step.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-slate-400">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="relative aspect-[4/5] overflow-hidden rounded-2xl">
                <Image
                  src="/images/slide-catering-3.jpg"
                  alt="Comida de catering premium"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 lg:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid items-center gap-16 lg:grid-cols-2">
            <div className="order-2 lg:order-1">
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
                <Image
                  src="/images/partners-chef-tablet.png"
                  alt="Chef gestionando ordenes digitalmente"
                  fill
                  className="object-cover"
                />
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <span className="mb-4 inline-block text-sm font-bold uppercase tracking-wider text-amber-600">
                Beneficios
              </span>
              <h2 className="text-balance text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
                Haz crecer tu negocio de catering
              </h2>
              <p className="mt-4 text-pretty text-lg leading-relaxed text-slate-600">
                Las herramientas que necesitas para profesionalizar tu operacion y aumentar tus ventas.
              </p>
              <ul className="mt-8 space-y-4">
                {[
                  "Aumenta el ticket promedio con upsells inteligentes",
                  "Reduce errores con ordenes digitales estructuradas",
                  "Ahorra tiempo con notificaciones automaticas",
                  "Proyecta imagen profesional con tu portal de marca",
                  "Llega a nuevos clientes a traves del marketplace",
                  "Gestiona todo desde un solo panel centralizado",
                ].map((benefit) => (
                  <li key={benefit} className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-amber-100">
                      <Check className="h-3 w-3 text-amber-700" />
                    </div>
                    <span className="text-sm leading-relaxed text-slate-700">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Form Section */}
      <section id="contacto" className="relative overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="/images/partners-hero.jpg"
            alt=""
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-slate-900/90" />
        </div>
        <div className="relative z-10 mx-auto max-w-2xl px-6 py-20 lg:py-28">
          <div className="mb-10 text-center">
            <h2 className="text-balance text-3xl font-bold tracking-tight text-white md:text-4xl">
              Comienza con JunteReady
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-pretty text-lg leading-relaxed text-slate-300">
              Completa el formulario y nos pondremos en contacto contigo para una demo personalizada.
            </p>
          </div>
          <PartnerContactForm />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 sm:flex-row">
          <Image
            src="/junte-ready-logo.png"
            alt="JunteReady"
            width={120}
            height={36}
            className="h-7 w-auto"
          />
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="flex items-center gap-0.5" title="Hecho en Puerto Rico">
                <span className="inline-block h-2.5 w-0.5 bg-red-500 rounded-sm"></span>
                <span className="inline-block h-2.5 w-1 bg-white border border-slate-300 rounded-sm"></span>
                <span className="inline-block h-2.5 w-0.5 bg-blue-500 rounded-sm"></span>
              </span>
              <span>Hecho en PR</span>
            </div>
            <span className="text-slate-300">|</span>
            <p className="text-xs text-slate-500" suppressHydrationWarning>
              &copy; {new Date().getFullYear()} JunteReady
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
