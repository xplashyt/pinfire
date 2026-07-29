import DiamondIcon from "./DiamondIcon";

export default function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-white/5 bg-ink/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <a href="#top" className="flex items-center gap-2">
          <DiamondIcon className="h-7 w-7" />
          <span className="font-display text-lg font-bold tracking-wide">
            Pin<span className="text-gold">Fire</span>
          </span>
        </a>
        <nav className="hidden gap-8 font-body text-sm text-mist md:flex">
          <a href="#paquetes" className="transition hover:text-white">
            Paquetes
          </a>
          <a href="#como-funciona" className="transition hover:text-white">
            Cómo funciona
          </a>
          <a href="#soporte" className="transition hover:text-white">
            Soporte
          </a>
        </nav>
        <a
          href="#paquetes"
          className="rounded-full bg-coral px-4 py-2 font-display text-sm font-semibold text-ink transition hover:brightness-110"
        >
          Comprar ahora
        </a>
      </div>
    </header>
  );
}
