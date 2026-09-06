import type { Metadata } from "next";
import { Allerta_Stencil, Space_Mono } from "next/font/google";
import "./globals.css";

// Titulares: look de sello estampado / hologram de tarjeta prepago.
// Solo mayúsculas y un peso — por diseño se usa nada más en titulares
// cortos, nunca en párrafos.
const allertaStencil = Allerta_Stencil({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
});

// Cuerpo y datos: una sola tipografía para ambos, a propósito. El
// monoespaciado de un recibo impreso (impresora térmica/matriz de puntos)
// es coherente con el motivo firma de la página, y evita meter una tercera
// identidad tipográfica solo para el cuerpo.
const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "PinFire — recarga de diamantes para Free Fire",
  description:
    "Compra diamantes de Free Fire con tarjeta, sin salir de la página. Pago único, comprobante al instante y coordinación de la recarga por correo.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${allertaStencil.variable} ${spaceMono.variable}`}>
      {/* Sin widget ni Web Checkout de Wompi: el formulario es propio y
          habla contra la API REST. Ver components/CheckoutPanel.tsx y
          lib/wompi-api.ts. */}
      <body className="bg-grafito font-mono text-hielo antialiased">{children}</body>
    </html>
  );
}
