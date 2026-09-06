/**
 * El separador entre secciones: la línea perforada de una boleta o un
 * comprobante, con las dos muescas semicirculares de los extremos por
 * donde se rasga. Es el mismo objeto firma del hero (la tarjeta de
 * recarga) llevado al límite de la página — no un marquee genérico.
 *
 * Las muescas de los extremos se "recortan" pintándolas del mismo color
 * que el fondo de la página (--bg-page, definido en globals.css). Los
 * puntos de la línea usan `currentColor`, así que heredan el color de
 * texto de donde se use (normalmente text-ceniza/40).
 */
export default function Perforacion({ className = "" }: { className?: string }) {
  return (
    // overflow-hidden: las dos muescas se pintan a caballo del borde, y sin
    // recortarlas la mitad que sobresale a la derecha empuja el ancho de la
    // página y aparece scroll horizontal a 360 px. Recortada se ve igual: la
    // mordida que queda es justo la mitad que se quiere.
    <div className={`relative h-5 w-full overflow-hidden ${className}`} aria-hidden="true">
      <div
        className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 opacity-60"
        style={{
          backgroundImage: "radial-gradient(circle, currentColor 1.5px, transparent 1.8px)",
          backgroundSize: "16px 100%",
          backgroundRepeat: "repeat-x",
        }}
      />
      <span className="absolute left-0 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--bg-page)]" />
      <span className="absolute right-0 top-1/2 h-4 w-4 translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--bg-page)]" />
    </div>
  );
}
