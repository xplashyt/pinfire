import type { Config } from "tailwindcss";

/**
 * Regla de contraste (WCAG 2.1) verificada a mano para esta paleta —
 * respétala al agregar texto nuevo:
 *
 *   - `hielo` sobre `grafito`/`carbon`: ~18:1. Libre para cualquier tamaño.
 *   - `turquesa` sobre `grafito`/`carbon`: ~12.5:1. Libre para cualquier
 *     tamaño, incluido texto pequeño (precios, datos).
 *   - `magenta` sobre `grafito`/`carbon`: ~6.2:1. Ok para texto pequeño,
 *     pero en esta página se reserva para insignias/etiquetas cortas.
 *   - `ceniza` (texto secundario) sobre `grafito`/`carbon`: ~6.25:1. Ok.
 *   - Dentro del panel CLARO `papel` (la ventana de comprobante impreso):
 *     usar SOLO `grafito` como color de texto (~16:1). `turquesa` sobre
 *     `papel` da ~1.3:1 y `magenta` sobre `papel` da ~2.6:1 — ninguno de
 *     los dos acentos es legible ahí. Reserva `turquesa`/`magenta` para
 *     elementos grandes puramente decorativos sobre `papel`, nunca texto.
 */
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        grafito: "#0A0D0C", // fondo base de la página
        carbon: "#141917", // superficie de paneles y tarjetas oscuras
        papel: "#EDEAE2", // ventana clara de "comprobante impreso"
        turquesa: "#49E6C9", // acento primario — talla de diamante
        magenta: "#FF4D8D", // acento raro — holograma, solo insignias cortas
        hielo: "#F4F6F5", // texto principal sobre fondo oscuro
        ceniza: "#8A9491", // texto secundario sobre fondo oscuro
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
