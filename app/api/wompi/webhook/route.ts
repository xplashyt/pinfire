import { NextRequest, NextResponse } from "next/server";
import { verifyEventSignature } from "@/lib/wompi";
import { parseReference } from "@/lib/orders";
import { sendOrderEmail } from "@/lib/email";

export const runtime = "nodejs";

// Wompi puede reenviar el mismo evento (reintentos, doble entrega). Esto
// evita correos duplicados dentro de una misma instancia del servidor,
// pero NO es garantía: si el proceso se reinicia o hay varias instancias,
// un reintento tardío puede volver a pasar. Con pocos pedidos al día es
// suficiente; si el volumen crece, esto pide una base de datos.
const procesados = new Set<string>();

// Esta ruta es la única fuente de verdad sobre si un pago se completó.
// El callback que recibe el navegador al cerrar el widget es solo para
// mejorar la experiencia (mostrar un mensaje); nunca entregues los
// diamantes basándote únicamente en lo que pasa en el frontend, porque
// el usuario puede cerrar la pestaña antes de que el pago se confirme,
// o alguien podría intentar falsificar esa respuesta del navegador.
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

  const transaction = (event.data as any)?.transaction;

  if (transaction?.status !== "APPROVED") {
    // Rechazado, con error o pendiente: no hay nada que recargar. El
    // cliente puede reintentar con otro medio de pago.
    console.log("Pago no aprobado:", transaction?.reference, transaction?.status);
    return NextResponse.json({ received: true });
  }

  if (procesados.has(transaction.id)) {
    return NextResponse.json({ received: true, duplicado: true });
  }

  const order = parseReference(String(transaction.reference || ""));

  if (!order) {
    // Pago cobrado pero no podemos saber a quién recargarle. Se registra
    // en el log para revisarlo a mano en el panel de Wompi.
    console.error(
      "Pago aprobado con referencia ilegible:",
      transaction.reference,
      transaction.id
    );
    return NextResponse.json({ received: true, aviso: "referencia ilegible" });
  }

  await sendOrderEmail({
    playerId: order.playerId,
    packageId: order.packageId,
    diamonds: order.pkg?.diamonds ?? null,
    bonus: order.pkg?.bonus ?? null,
    amountInCents: Number(transaction.amount_in_cents) || 0,
    reference: String(transaction.reference),
    transactionId: String(transaction.id),
    customerEmail: transaction.customer_email ?? null,
    paymentMethod: transaction.payment_method_type ?? null,
  });

  // Solo se marca como procesado si el correo salió bien. Si falló, la
  // excepción de arriba hace que Wompi reintente el evento.
  procesados.add(transaction.id);
  console.log("Pedido notificado:", order.playerId, transaction.reference);

  return NextResponse.json({ received: true });
}
