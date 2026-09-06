import { IconoCandado, IconoSello, IconoSobre } from "./Iconos";
import { HORAS_DE_ENTREGA } from "@/lib/contacto";

const items = [
  {
    Icono: IconoCandado,
    title: "Tarjeta cifrada en tu navegador",
    detail: "El número y el CVC viajan directo a Wompi. Nunca pasan por nuestro servidor.",
  },
  {
    Icono: IconoSello,
    title: "Comprobante al aprobarse el pago",
    detail: "Referencia e ID de transacción quedan visibles apenas Wompi confirma.",
  },
  {
    Icono: IconoSobre,
    title: "Coordinación por correo",
    detail: `Te escribimos en menos de ${HORAS_DE_ENTREGA} horas para pedirte el UID y recargar.`,
  },
];

export default function TrustBar() {
  return (
    <section id="como-funciona" className="border-y border-ceniza/10 bg-carbon/40">
      <div className="mx-auto grid max-w-5xl gap-8 px-6 py-10 sm:grid-cols-3">
        {items.map(({ Icono, title, detail }) => (
          <div key={title} className="flex gap-3">
            <Icono className="h-8 w-8 shrink-0 text-turquesa" />
            <div>
              <p className="font-display text-sm text-hielo">{title}</p>
              <p className="mt-1 text-xs leading-relaxed text-ceniza">{detail}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
