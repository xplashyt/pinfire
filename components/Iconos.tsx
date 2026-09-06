/**
 * Iconos propios en polígonos, sin librería. Todos usan `currentColor`
 * para heredar el color de texto de Tailwind (p. ej. `text-turquesa`) y
 * comparten una retícula de 48×48 con esquinas en bisel — nada de círculos
 * perfectos ni radios, para no salirse de la geometría de "recortes y
 * máscaras" del resto de la página.
 */

type IconProps = { className?: string };

/** El diamante tallado: mesa + facetas de corona y pabellón. */
export function IconoDiamante({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none" aria-hidden="true">
      <polygon points="14,14 34,14 24,4" fill="currentColor" opacity="0.55" />
      <polygon points="4,14 14,14 24,4" fill="currentColor" opacity="0.85" />
      <polygon points="34,14 44,14 24,4" fill="currentColor" opacity="0.85" />
      <polygon points="4,14 14,14 24,44" fill="currentColor" opacity="0.7" />
      <polygon points="34,14 44,14 24,44" fill="currentColor" opacity="0.7" />
      <polygon points="14,14 34,14 24,44" fill="currentColor" />
    </svg>
  );
}

/** Sello holográfico de autenticidad: octágono con marca interior. */
export function IconoSello({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none" aria-hidden="true">
      <polygon
        points="16,3 32,3 45,16 45,32 32,45 16,45 3,32 3,16"
        stroke="currentColor"
        strokeWidth="2.5"
      />
      <polygon
        points="18,10 30,10 38,18 38,30 30,38 18,38 10,30 10,18"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.6"
      />
      <polygon points="24,17 31,24 24,31 17,24" fill="currentColor" />
    </svg>
  );
}

/** Tarjeta de recarga: esquina troquelada + banda + chip. */
export function IconoTarjeta({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none" aria-hidden="true">
      <polygon
        points="4,10 34,10 44,20 44,38 4,38"
        stroke="currentColor"
        strokeWidth="2.5"
      />
      <rect x="4" y="17" width="40" height="5" fill="currentColor" opacity="0.85" />
      <rect x="9" y="27" width="9" height="6" fill="currentColor" opacity="0.6" />
    </svg>
  );
}

/** Carnet de jugador (UID): ficha con silueta y dígitos. */
export function IconoUID({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none" aria-hidden="true">
      <polygon
        points="4,6 38,6 44,12 44,42 4,42"
        stroke="currentColor"
        strokeWidth="2.5"
      />
      <polygon points="24,14 29,20 24,26 19,20" fill="currentColor" />
      <polygon points="14,34 34,34 30,28 18,28" fill="currentColor" opacity="0.8" />
      <rect x="12" y="12" width="7" height="2.5" fill="currentColor" opacity="0.5" />
    </svg>
  );
}

/** Sobre de contacto: rectángulo con solapa. */
export function IconoSobre({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none" aria-hidden="true">
      <rect x="4" y="10" width="40" height="28" stroke="currentColor" strokeWidth="2.5" />
      <polygon points="4,10 24,26 44,10" stroke="currentColor" strokeWidth="2.5" fill="none" />
    </svg>
  );
}

/** Reloj de entrega: carátula octagonal, no circular. */
export function IconoReloj({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none" aria-hidden="true">
      <polygon
        points="16,4 32,4 44,16 44,32 32,44 16,44 4,32 4,16"
        stroke="currentColor"
        strokeWidth="2.5"
      />
      <polygon points="24,12 26,12 26,25 34,30 33,32 24,26" fill="currentColor" />
    </svg>
  );
}

/** Candado: cifrado y pago protegido. Solo trazos + el ojo de la llave
 * relleno, para no depender del color del fondo donde se use el icono. */
export function IconoCandado({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none" aria-hidden="true">
      <path
        d="M14 21V15A10 10 0 0 1 34 15V21"
        stroke="currentColor"
        strokeWidth="3"
        fill="none"
      />
      <polygon
        points="8,21 40,21 40,42 8,42"
        stroke="currentColor"
        strokeWidth="2.5"
        fill="none"
      />
      <polygon points="24,27 28,33 24,36 20,33" fill="currentColor" />
    </svg>
  );
}
