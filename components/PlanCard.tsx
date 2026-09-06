import { formatCOP, totalDiamonds, type Plan } from "@/lib/plans";
import { IconoDiamante, IconoSello } from "./Iconos";

export default function PlanCard({
  plan,
  onSelect,
}: {
  plan: Plan;
  onSelect: (plan: Plan) => void;
}) {
  return (
    <div
      className={`sello-hover relative flex flex-col border p-5 transition ${
        plan.popular
          ? "border-turquesa/50 bg-carbon"
          : "border-ceniza/15 bg-carbon/60 hover:border-ceniza/30"
      }`}
      style={{ clipPath: "polygon(14px 0, 100% 0, 100% 100%, 0 100%, 0 14px)" }}
    >
      {plan.popular && (
        <span
          className="sello-hover-barrido absolute -top-3 left-5 flex items-center gap-1 bg-magenta px-3 py-1 font-mono text-[10px] uppercase tracking-wide text-grafito"
          style={{ clipPath: "polygon(6px 0, 100% 0, 100% 100%, 0 100%, 0 6px)" }}
        >
          <IconoSello className="h-3 w-3" />
          Más elegido
        </span>
      )}

      <p className="font-display text-xl text-hielo">{plan.name}</p>
      <p className="mt-3 flex items-center gap-1.5 font-mono text-lg text-turquesa">
        <IconoDiamante className="h-4 w-4" />
        {totalDiamonds(plan).toLocaleString("es-CO")}
        <span className="font-mono text-xs font-normal text-ceniza"> diamantes</span>
      </p>
      <p className="mt-1 text-xs leading-relaxed text-ceniza">{plan.summary}</p>

      <ul className="mt-4 space-y-1.5 text-xs text-ceniza">
        {plan.includes.map((line) => (
          <li key={line} className="flex gap-2">
            <span className="text-turquesa">›</span>
            <span>{line}</span>
          </li>
        ))}
      </ul>

      <div className="mt-5 flex-1" />

      <p className="font-display text-lg text-hielo">{formatCOP(plan.priceCOP)}</p>
      <button
        onClick={() => onSelect(plan)}
        className="mt-3 bg-ceniza/10 py-2 font-display text-sm text-hielo transition hover:bg-turquesa hover:text-grafito"
        style={{ clipPath: "polygon(8px 0, 100% 0, 100% 100%, 0 100%, 0 8px)" }}
      >
        Comprar
      </button>
    </div>
  );
}
