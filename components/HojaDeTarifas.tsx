import { plans, formatCOP, totalDiamonds, effectiveRate } from "@/lib/plans";
import { usosDeDiamantes, NOTA_EQUIVALENCIAS } from "@/lib/equivalencias";
import Perforacion from "./Perforacion";

/**
 * La hoja de referencia: la tabla que un jugador de verdad querría tener
 * a mano antes de recargar. La parte de arriba (nuestras 7 tarjetas) es
 * 100% verificable porque son nuestros propios precios. La de abajo es
 * orientación cualitativa a propósito: los precios dentro de Free Fire
 * cambian con cada actualización, así que publicar una cifra fija hoy
 * sería un dato inventado dentro de un mes (ver NOTA_EQUIVALENCIAS).
 */
export default function HojaDeTarifas() {
  return (
    <section id="hoja" className="mx-auto max-w-5xl px-6 py-16">
      <h2 className="font-display text-2xl text-hielo">Hoja de tarifas</h2>
      <p className="mt-2 max-w-lg text-sm text-ceniza">
        La tarifa efectiva por diamante baja mientras más grande es la carga.
        Compara antes de elegir.
      </p>

      {/* min-w-0 en la columna de grid: sin esto, la tabla ancha empuja el
          ancho de toda la página en vez de scrollear dentro de su propio
          contenedor (ver README, errores ya cometidos). */}
      <div className="mt-6 min-w-0 overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse font-mono text-sm">
          <thead>
            <tr className="border-b border-ceniza/20 text-left text-ceniza">
              <th className="py-2 pr-4 font-normal">Rango</th>
              <th className="py-2 pr-4 font-normal">Precio</th>
              <th className="py-2 pr-4 font-normal">Base</th>
              <th className="py-2 pr-4 font-normal">Bono</th>
              <th className="py-2 pr-4 font-normal">Total</th>
              <th className="py-2 font-normal">$ / diamante</th>
            </tr>
          </thead>
          <tbody>
            {plans.map((plan) => (
              <tr key={plan.id} className="border-b border-ceniza/10 text-hielo">
                <td className="py-2 pr-4">{plan.name}</td>
                <td className="py-2 pr-4">{formatCOP(plan.priceCOP)}</td>
                <td className="py-2 pr-4 text-ceniza">{plan.diamonds.toLocaleString("es-CO")}</td>
                <td className="py-2 pr-4 text-ceniza">+{plan.bonus.toLocaleString("es-CO")}</td>
                <td className="py-2 pr-4 text-turquesa">
                  {totalDiamonds(plan).toLocaleString("es-CO")}
                </td>
                <td className="py-2 text-ceniza">{formatCOP(effectiveRate(plan))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Perforacion className="my-10 text-ceniza" />

      <h3 className="font-display text-lg text-hielo">¿En qué se van los diamantes?</h3>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {usosDeDiamantes.map((uso) => (
          <div key={uso.item} className="border border-ceniza/15 bg-carbon/50 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-hielo">{uso.item}</p>
              <span className="shrink-0 font-mono text-[10px] uppercase tracking-wide text-turquesa">
                {uso.costo}
              </span>
            </div>
            <p className="mt-1 text-xs text-ceniza">{uso.nota}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-ceniza/80">{NOTA_EQUIVALENCIAS}</p>
    </section>
  );
}
