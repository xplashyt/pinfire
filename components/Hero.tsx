import TarjetaRecarga from "./TarjetaRecarga";
import { HORAS_DE_ENTREGA } from "@/lib/contacto";

export default function Hero() {
  return (
    <section id="top" className="mx-auto max-w-5xl px-6 pb-16 pt-14 md:pt-20">
      <div className="grid items-center gap-12 md:grid-cols-[1.15fr_0.85fr]">
        <div>
          <p className="mb-4 inline-flex items-center gap-2 border border-ceniza/20 bg-carbon px-3 py-1 font-mono text-[11px] uppercase tracking-widest text-ceniza">
            Recarga de diamantes · Free Fire
          </p>
          <h1 className="font-display text-4xl leading-tight text-hielo md:text-5xl">
            Tu comprobante
            <br />
            queda sellado
            <br />
            al pagar.
          </h1>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-ceniza">
            Elige tu carga, paga con tarjeta y guarda el comprobante con tu
            referencia. Te escribimos a tu correo en menos de{" "}
            {HORAS_DE_ENTREGA} horas para pedirte el UID de tu cuenta y
            completar la recarga.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#planes"
              className="bg-turquesa px-6 py-3 font-display text-sm text-grafito transition hover:brightness-110"
              style={{ clipPath: "polygon(10px 0, 100% 0, 100% 100%, 0 100%, 0 10px)" }}
            >
              Ver planes
            </a>
            <a
              href="#como-funciona"
              className="border border-ceniza/25 px-6 py-3 font-display text-sm text-hielo transition hover:border-ceniza/50"
            >
              Cómo funciona
            </a>
          </div>
        </div>
        <TarjetaRecarga />
      </div>
    </section>
  );
}
