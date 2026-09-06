import { NextRequest, NextResponse } from "next/server";
import { verifyEventSignature } from "@/lib/wompi";
import { parseReference } from "@/lib/orders";
import { formatCOP } from "@/lib/plans";

export const runtime = "nodejs";

// Wompi puede reenviar el mismo evento (reintentos, doble entrega). Este
// `Set` evita una segunda línea de log dentro de una misma instancia del
// servidor, pero NO es garantía: si el proceso se reinicia o hay varias
// instancias corriendo, un reintento tardío puede volver a registrarse. Con
// pocas ventas al día alcanza; si el volumen crece, esto pide una base de
// datos real.
const procesados = new Set<string>();

/**
 * Única fuente de verdad sobre si una venta se completó. El estado que ve
 * el navegador (app/api/wompi/status/[id]) es solo para mostrar un mensaje
 * mientras espera: nunca decide si hubo venta, porque el comprador puede
 * cerrar la pestaña antes de que Wompi confirme, o alguien podría intentar
 * falsificar esa respuesta del lado del cliente.
 *
 * No hay entrega automática: aquí solo se registra la venta en el log. El
 * vendedor la ve, entra al panel de Wompi para confirmar el pago y escribe
 * al comprador (correo que viaja en el evento) para pedirle el UID y
 * coordinar la recarga — ver lib/contacto.ts.
 */
export async function POST(req: NextRequest) {
  const event = await req.json().catch(() => null);

  if (!event?.signature?.checksum || !event?.signature?.properties || !event?.data) {
    return NextResponse.json({ error: "Evento inválido" }, { status: 400 });
  }

  const eventsSecret = process.env.WOMPI_EVENTS_SECRET;
  if (!eventsSecret) {
    return NextResponse.json(
      { error: "Falta configurar WOMPI_EVENTS_SECRET en el servidor" },
      { status: 500 }
    );
  }

  const isValid = verifyEventSignature(
    event.data,
    event.signature.properties,
    event.timestamp,
    event.signature.checksum,
    eventsSecret
  );

  if (!isValid) {
    return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
  }

  const transaction = (event.data as Record<string, unknown>)?.transaction as
    | Record<string, unknown>
    | undefined;

  // A partir de aquí la firma ya cuadró: respondemos 200 siempre, incluso
  // si el pago no fue aprobado o la referencia no se puede leer. Ya no hay
  // nada que pueda fallar de nuestro lado y justifique que Wompi reintente
  // el evento; lo que sí amerita revisión manual queda en el log.
  if (transaction?.status !== "APPROVED") {
    console.log("Pago no aprobado:", transaction?.reference, transaction?.status);
    return NextResponse.json({ received: true });
  }

  const transactionId = String(transaction.id);
  if (procesados.has(transactionId)) {
    return NextResponse.json({ received: true, duplicado: true });
  }
  procesados.add(transactionId);

  const order = parseReference(String(transaction.reference || ""));

  if (!order?.plan) {
    // Pago cobrado pero no podemos saber qué se vendió. Se registra en el
    // log para revisarlo a mano en el panel de Wompi.
    console.error(
      "[VENTA PAGADA] referencia ilegible — revisar a mano:",
      transaction.reference,
      transactionId
    );
    return NextResponse.json({ received: true, aviso: "referencia ilegible" });
  }

  console.log(
    `[VENTA PAGADA] plan=${order.plan.name} (${order.plan.id}) ` +
      `referencia=${transaction.reference} transaccion=${transactionId} ` +
      `correo=${transaction.customer_email ?? "no informado"} ` +
      `monto=${formatCOP(Number(transaction.amount_in_cents ?? 0) / 100)} ` +
      `medio=${transaction.payment_method_type ?? "no informado"}`
  );

  return NextResponse.json({ received: true });
}
