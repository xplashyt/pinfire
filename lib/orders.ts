import { packages, type PinPackage } from "./products";

/**
 * Este proyecto no tiene base de datos. El único dato propio que Wompi
 * nos devuelve sin alterar en el webhook es la referencia, así que la
 * usamos para transportar el paquete y el UID del jugador:
 *
 *   pinfire-<idPaquete>-<uid>-<timestamp>
 *   pinfire-ff-520-123456789-1753632000000
 *
 * El timestamp está solo para que cada referencia sea única (Wompi
 * rechaza referencias repetidas). Se parsea desde la derecha porque los
 * ids de paquete contienen guiones ("ff-520").
 */

const PREFIX = "pinfire";

export function sanitizePlayerId(raw: string): string {
  // Los UID de Free Fire son numéricos. Limpiamos cualquier otro
  // carácter para que no rompa el formato de la referencia.
  return raw.replace(/\D/g, "");
}

export function buildReference(packageId: string, playerId: string): string {
  const uid = sanitizePlayerId(playerId);
  return `${PREFIX}-${packageId}-${uid}-${Date.now()}`;
}

export interface ParsedOrder {
  packageId: string;
  playerId: string;
  pkg: PinPackage | null;
}

export function parseReference(reference: string): ParsedOrder | null {
  const parts = reference.split("-");

  // pinfire + al menos un segmento de paquete + uid + timestamp
  if (parts.length < 4 || parts[0] !== PREFIX) return null;

  const timestamp = parts[parts.length - 1];
  const playerId = parts[parts.length - 2];
  const packageId = parts.slice(1, -2).join("-");

  if (!/^\d+$/.test(timestamp) || !/^\d+$/.test(playerId) || !packageId) {
    return null;
  }

  return {
    packageId,
    playerId,
    pkg: packages.find((p) => p.id === packageId) ?? null,
  };
}
