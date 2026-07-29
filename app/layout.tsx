import type { Metadata } from "next";
import { Chakra_Petch, Manrope } from "next/font/google";
import "./globals.css";

const chakraPetch = Chakra_Petch({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
});

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "700", "800"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "PinFire — Diamantes para Free Fire al instante",
  description:
    "Recarga diamantes de Free Fire y paga sin salir de la página. Entrega inmediata.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${chakraPetch.variable} ${manrope.variable}`}>
      {/* Ya no cargamos el widget de Wompi: el formulario de pago es
          nuestro y habla con la API de Wompi directamente. Ver
          components/CheckoutPanel.tsx y lib/wompi-api.ts. */}
      <body className="bg-ink font-body text-white antialiased">{children}</body>
    </html>
  );
}
