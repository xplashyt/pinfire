import { IconoDiamante } from "./Iconos";

export default function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-ceniza/10 bg-grafito">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
        <a href="#top" className="flex items-center gap-2">
          <IconoDiamante className="h-6 w-6 text-turquesa" />
          <span className="font-display text-base tracking-wide text-hielo">
            Pin<span className="text-turquesa">Fire</span>
          </span>
        </a>
        <nav className="hidden gap-8 font-mono text-sm text-ceniza md:flex">
          <a href="#planes" className="transition hover:text-hielo">
            Planes
          </a>
          <a href="#como-funciona" className="transition hover:text-hielo">
            Cómo funciona
          </a>
          <a href="#soporte" className="transition hover:text-hielo">
            Soporte
          </a>
        </nav>
        {/* Dos etiquetas a propósito: en 360px "Comprar" no desborda; desde
            sm cabe de sobra "Comprar ahora". whitespace-nowrap sobre el
            texto largo rompía el layout en móvil (ver README, errores ya
            cometidos en proyectos hermanos). */}
        <a
          href="#planes"
          className="shrink-0 bg-turquesa px-4 py-2 font-display text-xs text-grafito transition hover:brightness-110"
          style={{ clipPath: "polygon(8px 0, 100% 0, 100% 100%, 0 100%, 0 8px)" }}
        >
          <span className="sm:hidden">Comprar</span>
          <span className="hidden sm:inline">Comprar ahora</span>
        </a>
      </div>
    </header>
  );
}
