import DiamondIcon from "./DiamondIcon";
import { formatCOP, type PinPackage } from "@/lib/products";

export default function ProductCard({
  pkg,
  onSelect,
}: {
  pkg: PinPackage;
  onSelect: (pkg: PinPackage) => void;
}) {
  return (
    <div
      className={`relative flex flex-col rounded-2xl border p-5 transition ${
        pkg.popular
          ? "border-gold/60 bg-surface2"
          : "border-white/10 bg-surface hover:border-white/20"
      }`}
    >
      {pkg.popular && (
        <span className="absolute -top-3 left-5 rounded-full bg-coral px-3 py-1 text-xs font-semibold text-ink">
          Más elegido
        </span>
      )}
      <DiamondIcon className="h-9 w-9" />
      <p className="mt-3 font-display text-xl font-bold">
        {pkg.diamonds.toLocaleString("es-CO")}
        <span className="ml-1 text-sm font-body font-normal text-mist">diamantes</span>
      </p>
      {pkg.bonus > 0 && (
        <p className="text-xs text-teal">+{pkg.bonus} de bono</p>
      )}
      <p className="mt-4 font-display text-lg font-semibold text-gold">
        {formatCOP(pkg.priceCOP)}
      </p>
      <button
        onClick={() => onSelect(pkg)}
        className="mt-4 rounded-full bg-white/10 py-2 font-display text-sm font-semibold transition hover:bg-gold hover:text-ink"
      >
        Comprar
      </button>
    </div>
  );
}
