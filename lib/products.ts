export interface PinPackage {
  id: string;
  diamonds: number;
  bonus: number;
  priceCOP: number;
  popular?: boolean;
}

// Precios de ejemplo en pesos colombianos (COP). Reemplázalos por tus
// costos reales del proveedor + tu margen antes de salir a producción.
export const packages: PinPackage[] = [
  { id: "ff-100", diamonds: 100, bonus: 0, priceCOP: 4900 },
  { id: "ff-310", diamonds: 310, bonus: 10, priceCOP: 14900 },
  { id: "ff-520", diamonds: 520, bonus: 20, priceCOP: 24900, popular: true },
  { id: "ff-1060", diamonds: 1060, bonus: 60, priceCOP: 48900 },
  { id: "ff-2200", diamonds: 2200, bonus: 150, priceCOP: 98900 },
  { id: "ff-5600", diamonds: 5600, bonus: 400, priceCOP: 239900 },
];

export function formatCOP(amount: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(amount);
}
