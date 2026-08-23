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
  { id: "ff-100", diamonds: 100, bonus: 0, priceCOP: 2000 },
  { id: "ff-520", diamonds: 520, bonus: 20, priceCOP: 69900, popular: true },
  { id: "ff-5600", diamonds: 5600, bonus: 400, priceCOP: 494900 },
];

export function formatCOP(amount: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(amount);
}
