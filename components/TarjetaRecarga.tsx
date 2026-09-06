import { plans, formatCOP, totalDiamonds } from "@/lib/plans";
import { IconoSello, IconoDiamante } from "./Iconos";

/**
 * El objeto firma de la página: una tarjeta de recarga con sello
 * holográfico, como las que se venden rasca-y-gana en cualquier tienda de
 * barrio. Es puramente ilustrativa (no es un comprobante real), por eso
 * lleva `aria-hidden`: el mensaje real vive en el texto del Hero.
 *
 * Al montarse, la tarjeta "se imprime" desde abajo y el sello hace un
 * único barrido de luz al asentarse — ver las animaciones en globals.css,
 * ambas desactivadas si el usuario prefiere menos movimiento.
 */
export default function TarjetaRecarga() {
  const destacado = plans.find((p) => p.popular) ?? plans[0];

  return (
    <div
      aria-hidden="true"
      className="tarjeta-animada relative mx-auto w-full max-w-sm"
      style={{
        clipPath: "polygon(0 0, calc(100% - 28px) 0, 100% 28px, 100% 100%, 0 100%)",
      }}
    >
      <div className="relative overflow-hidden bg-carbon p-6 pb-7">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              "linear-gradient(115deg, transparent 30%, rgba(73,230,201,0.18) 45%, rgba(255,77,141,0.16) 56%, transparent 72%)",
          }}
        />

        <div className="relative flex items-center justify-between">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-ceniza">
            Comprobante de recarga
          </p>
          <div className="sello-animado h-8 w-8 text-turquesa">
            <IconoSello className="h-8 w-8" />
          </div>
        </div>

        <div
          className="relative mt-5 bg-papel px-4 py-4"
          style={{
            clipPath: "polygon(0 0, 100% 0, 100% 100%, 12px 100%, 0 calc(100% - 12px))",
          }}
        >
          <p className="font-mono text-[10px] uppercase tracking-widest text-grafito/60">
            Monto
          </p>
          <p className="font-display text-3xl leading-none text-grafito">
            {formatCOP(destacado.priceCOP)}
          </p>
          <p className="mt-3 font-mono text-sm tracking-[0.3em] text-grafito/60">
            •••• •••• •••• ••••
          </p>
          <div className="mt-3 flex items-center justify-between font-mono text-[10px] text-grafito/70">
            <span>PLAN {destacado.name.toUpperCase()}</span>
            <span className="inline-flex items-center gap-1">
              <IconoDiamante className="h-3 w-3 text-grafito/70" />
              {totalDiamonds(destacado).toLocaleString("es-CO")}
            </span>
          </div>
        </div>

        <p className="relative mt-4 font-mono text-[11px] text-ceniza">
          Verificado por Wompi · pago único
        </p>
      </div>
    </div>
  );
}
