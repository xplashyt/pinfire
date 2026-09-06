import { plans, type Plan } from "./plans";

/**
 * Este proyecto no tiene base de datos. El único dato propio que Wompi nos
 * devuelve sin alterar es la referencia, así que la usamos para transportar
 * qué tarjeta se compró:
 *
 *   pin-<idPlan>-<timestamp>
 *   pin-pin-medio-1753632000000
 *
 * El timestamp solo existe para que cada referencia sea única (Wompi
 * rechaza referencias repetidas). Se parsea DESDE LA DERECHA porque el id
 * del plan (p. ej. "pin-medio") ya contiene guiones.
 *
 * El UID del jugador NO viaja en la referencia ni se pide en el checkout:
 * la entrega es manual (ver lib/contacto.ts), así que el vendedor lo pide
 * por correo después de confirmar el pago.
 */
const PREFIX = "pin";

export function buildReference(planId: string): string {
  return `${PREFIX}-${planId}-${Date.now()}`;
}

export interface ParsedOrder {
  planId: string;
  plan: Plan | null;
}

export function parseReference(reference: string): ParsedOrder | null {
  const parts = reference.split("-");

  // pin + al menos un segmento de plan + timestamp
  if (parts.length < 3 || parts[0] !== PREFIX) return null;

  const timestamp = parts[parts.length - 1];
  const planId = parts.slice(1, -1).join("-");

  if (!/^\d+$/.test(timestamp) || !planId) return null;

  return {
    planId,
    plan: plans.find((p) => p.id === planId) ?? null,
  };
}
