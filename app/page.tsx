"use client";

import { useState } from "react";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import TrustBar from "@/components/TrustBar";
import PlanCard from "@/components/PlanCard";
import HojaDeTarifas from "@/components/HojaDeTarifas";
import Perforacion from "@/components/Perforacion";
import CheckoutPanel from "@/components/CheckoutPanel";
import Footer from "@/components/Footer";
import { IconoTarjeta, IconoSello, IconoSobre } from "@/components/Iconos";
import { plans, type Plan } from "@/lib/plans";
import { CORREO_CONTACTO, HORAS_DE_ENTREGA } from "@/lib/contacto";

const PASOS = [
  {
    Icono: IconoTarjeta,
    titulo: "Elige tu carga y paga",
    detalle: "Tarjeta únicamente. El número y el CVC se cifran en tu navegador antes de salir.",
  },
  {
    Icono: IconoSello,
    titulo: "Guarda tu comprobante",
    detalle: "La referencia y el ID de transacción de Wompi quedan en pantalla apenas se aprueba.",
  },
  {
    Icono: IconoSobre,
    titulo: "Coordinamos la recarga",
    detalle: `Te escribimos a tu correo en menos de ${HORAS_DE_ENTREGA} horas pidiendo tu UID de Free Fire.`,
  },
];

const FAQ = [
  {
    q: "¿Con qué puedo pagar?",
    a: "Solo con tarjeta débito o crédito. El formulario es propio: no hay redirecciones ni ventanas emergentes, y tu tarjeta se cifra en este navegador antes de viajar a Wompi.",
  },
  {
    q: "¿Cuándo recibo mis diamantes?",
    a: `No es automático: apenas Wompi aprueba el pago, revisamos el panel y te escribimos a tu correo en menos de ${HORAS_DE_ENTREGA} horas para pedirte el UID de tu cuenta y hacer la recarga.`,
  },
  {
    q: "¿Por qué me piden el UID después del pago y no antes?",
    a: "Para mantener el formulario de pago corto: solo pedimos lo necesario para cobrar. El UID viaja por correo, ya con tu compra confirmada.",
  },
  {
    q: "Pagué y no me han escrito, ¿qué hago?",
    a: (
      <>
        Escríbenos a{" "}
        <a href={`mailto:${CORREO_CONTACTO}`} className="text-turquesa underline underline-offset-2">
          {CORREO_CONTACTO}
        </a>{" "}
        con tu referencia o el comprobante que te mostramos al pagar.
      </>
    ),
  },
  {
    q: "Mi pago quedó en DECLINED o en ERROR, ¿es lo mismo?",
    a: "No. DECLINED es un rechazo real en la ruta de pago (banco, procesador o Wompi) y sí queda registrado. ERROR es una falla de procesamiento — el caso típico es un problema de configuración, no un rechazo — y no implica que se haya intentado cobrar. La pantalla del pago siempre muestra el motivo exacto que entrega Wompi.",
  },
  {
    q: "¿Es seguro dar los datos de mi tarjeta aquí?",
    a: "El número y el CVC se cifran en tu navegador y van directo a Wompi; nuestro servidor nunca los recibe ni los registra. Eso nos mantiene fuera del alcance más exigente de PCI DSS, aunque eso por sí solo no certifica cumplimiento total.",
  },
];

export default function Home() {
  const [selected, setSelected] = useState<Plan | null>(null);

  return (
    <>
      <Header />
      <main>
        <Hero />
        <TrustBar />

        <section id="planes" className="mx-auto max-w-5xl px-6 py-16">
          <h2 className="font-display text-2xl text-hielo">Elige tu carga</h2>
          <p className="mt-2 max-w-md text-sm text-ceniza">
            Pago único con tarjeta, aquí mismo. Nunca sales de esta página.
          </p>

          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => (
              <PlanCard key={plan.id} plan={plan} onSelect={setSelected} />
            ))}
          </div>
        </section>

        <Perforacion className="mx-auto max-w-5xl px-6 text-ceniza/30" />

        <HojaDeTarifas />

        <Perforacion className="mx-auto max-w-5xl px-6 text-ceniza/30" />

        <section className="mx-auto max-w-5xl px-6 py-16">
          <h2 className="font-display text-2xl text-hielo">Cómo llega tu recarga</h2>
          <div className="mt-8 grid gap-8 sm:grid-cols-3">
            {PASOS.map(({ Icono, titulo, detalle }, i) => (
              <div key={titulo}>
                <div className="flex items-center gap-2">
                  <Icono className="h-7 w-7 text-turquesa" />
                  <span className="font-mono text-xs text-ceniza">Paso {i + 1}</span>
                </div>
                <p className="mt-3 font-display text-base text-hielo">{titulo}</p>
                <p className="mt-1 text-sm leading-relaxed text-ceniza">{detalle}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-6 py-16">
          <h2 className="font-display text-2xl text-hielo">Preguntas frecuentes</h2>
          <div className="mt-8 divide-y divide-ceniza/10 border-y border-ceniza/10">
            {FAQ.map(({ q, a }) => (
              <details key={q} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between font-display text-sm text-hielo marker:content-none">
                  {q}
                  <span className="ml-4 shrink-0 font-mono text-ceniza group-open:hidden">+</span>
                  <span className="ml-4 hidden shrink-0 font-mono text-turquesa group-open:inline">−</span>
                </summary>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ceniza">{a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
      <Footer />

      {selected && <CheckoutPanel plan={selected} onClose={() => setSelected(null)} />}
    </>
  );
}
