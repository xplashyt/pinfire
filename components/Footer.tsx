import { IconoDiamante } from "./Iconos";
import { CORREO_CONTACTO } from "@/lib/contacto";

export default function Footer() {
  return (
    <footer id="soporte" className="border-t border-ceniza/10 px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center gap-2">
          <IconoDiamante className="h-5 w-5 text-turquesa" />
          <span className="font-display text-sm text-hielo">PinFire</span>
        </div>

        <p className="mt-4 max-w-xl text-sm text-ceniza">
          ¿Ya pagaste y no te hemos escrito? Contáctanos a{" "}
          <a href={`mailto:${CORREO_CONTACTO}`} className="text-turquesa underline underline-offset-2">
            {CORREO_CONTACTO}
          </a>{" "}
          con tu referencia o el comprobante de pago.
        </p>

        <p className="mt-6 max-w-2xl text-xs leading-relaxed text-ceniza/70">
          PinFire vende diamantes virtuales para usar dentro de Free Fire; no
          vende cuentas, equipos ni licencias, y no garantiza resultados
          dentro del juego. Free Fire y Garena pertenecen a sus respectivos
          dueños, que no patrocinan ni respaldan esta tienda. Los pagos con
          tarjeta los procesa Wompi. Cada compra es un pago único; la
          recarga se coordina de forma manual por correo tras la aprobación
          del pago, nunca de forma automática.
        </p>
      </div>
    </footer>
  );
}
