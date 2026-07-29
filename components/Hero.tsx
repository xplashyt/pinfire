import DiamondIcon from "./DiamondIcon";

export default function Hero() {
  return (
    <section id="top" className="mx-auto max-w-5xl px-6 pb-16 pt-14 md:pt-20">
      <div className="grid items-center gap-10 md:grid-cols-[1.2fr_1fr]">
        <div>
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-surface px-3 py-1 text-xs text-mist">
            <DiamondIcon className="h-3.5 w-3.5" />
            Recarga para Free Fire · entrega inmediata
          </p>
          <h1 className="font-display text-4xl font-bold leading-tight md:text-5xl">
            Tus diamantes,
            <br />
            en segundos.
          </h1>
          <p className="mt-5 max-w-md font-body text-mist">
            Elige tu paquete, ingresa tu ID de jugador y paga con tarjeta o
            Nequi en el mismo formulario. Sin ventanas emergentes y sin
            redirecciones: nunca sales de esta página.
          </p>
          <a
            href="#paquetes"
            className="mt-8 inline-flex rounded-full bg-gold px-6 py-3 font-display font-semibold text-ink transition hover:brightness-110"
          >
            Ver paquetes
          </a>
        </div>
        <div className="flex justify-center">
          <DiamondIcon className="h-40 w-40 md:h-52 md:w-52" glow />
        </div>
      </div>
    </section>
  );
}
