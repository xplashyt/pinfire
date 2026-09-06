/**
 * Catálogo de recargas. Los nombres son el mismo escalafón de rangos de
 * Free Fire (Bronce → Gran Maestro): cualquier jugador ya sabe leer ese
 * orden sin que se lo expliquemos.
 *
 * Los diamantes y el bono son EJEMPLO — reemplázalos por tu costo real de
 * proveedor + margen antes de vender (ver README, sección de pendientes).
 * Los 7 precios son pago único, no suscripción.
 */
export interface Plan {
  id: string;
  name: string;
  priceCOP: number;
  diamonds: number;
  bonus: number;
  summary: string;
  includes: string[];
  popular?: boolean;
}

const ENTREGA = "Entrega manual: te escribimos al correo para coordinar la recarga con tu UID.";
const PAGO_UNICO = "Pago único con tarjeta. No es una suscripción ni un cobro recurrente.";
const SERVIDOR = "Válido para cuentas de Free Fire en servidor Latinoamérica (LAS).";

export const plans: Plan[] = [
  {
    id: "pin-entrada",
    name: "Bronce",
    priceCOP: 4_000,
    diamonds: 40,
    bonus: 0,
    summary: "La ficha de entrada: para probar el proceso de pago antes de recargar en serio.",
    includes: [
      "40 diamantes",
      SERVIDOR,
      PAGO_UNICO,
      ENTREGA,
    ],
  },
  {
    id: "pin-basico",
    name: "Plata",
    priceCOP: 10_000,
    diamonds: 110,
    bonus: 10,
    summary: "Para una skin de arma sencilla o completar lo que te falta del pase semanal.",
    includes: [
      "110 diamantes + 10 de bono (120 en total)",
      SERVIDOR,
      PAGO_UNICO,
      ENTREGA,
    ],
  },
  {
    id: "pin-inicio",
    name: "Oro",
    priceCOP: 25_000,
    diamonds: 290,
    bonus: 35,
    summary: "El punto donde el bono ya se nota: 35 diamantes extra sobre los 290 base.",
    includes: [
      "290 diamantes + 35 de bono (325 en total)",
      SERVIDOR,
      PAGO_UNICO,
      ENTREGA,
    ],
  },
  {
    id: "pin-medio",
    name: "Platino",
    priceCOP: 69_900,
    diamonds: 850,
    bonus: 130,
    summary: "La más elegida: alcanza para el Pase Elite de un mes con margen para algo más.",
    includes: [
      "850 diamantes + 130 de bono (980 en total)",
      SERVIDOR,
      PAGO_UNICO,
      ENTREGA,
    ],
    popular: true,
  },
  {
    id: "pin-avanzado",
    name: "Diamante",
    priceCOP: 100_000,
    diamonds: 1_260,
    bonus: 220,
    summary: "Pase Elite del mes cubierto y saldo para un personaje o una mascota.",
    includes: [
      "1.260 diamantes + 220 de bono (1.480 en total)",
      SERVIDOR,
      PAGO_UNICO,
      ENTREGA,
    ],
  },
  {
    id: "pin-experto",
    name: "Heroico",
    priceCOP: 150_000,
    diamonds: 1_960,
    bonus: 380,
    summary: "Para quien recarga cada temporada: cubre pase, personaje y varias skins.",
    includes: [
      "1.960 diamantes + 380 de bono (2.340 en total)",
      SERVIDOR,
      PAGO_UNICO,
      ENTREGA,
    ],
  },
  {
    id: "pin-pro",
    name: "Gran Maestro",
    priceCOP: 494_000,
    diamonds: 6_800,
    bonus: 1_600,
    summary: "La carga más grande del catálogo: la mejor tarifa por diamante de las siete.",
    includes: [
      "6.800 diamantes + 1.600 de bono (8.400 en total)",
      SERVIDOR,
      PAGO_UNICO,
      ENTREGA,
    ],
  },
];

export function totalDiamonds(plan: Plan): number {
  return plan.diamonds + plan.bonus;
}

/** Precio efectivo por diamante, redondeado — para la hoja de referencia. */
export function effectiveRate(plan: Plan): number {
  return Math.round(plan.priceCOP / totalDiamonds(plan));
}

export function formatCOP(amount: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(amount);
}
