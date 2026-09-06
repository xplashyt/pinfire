import { NextRequest, NextResponse } from "next/server";
import { parseReference } from "@/lib/orders";
import {
  createTransaction,
  getAcceptanceTokens,
  PaymentGatewayError,
} from "@/lib/wompi-api";
import type { PaymentErrorCode } from "@/lib/payment-errors";

export const runtime = "nodejs";

/**
 * Status HTTP por tipo de falla de la pasarela (ver lib/payment-errors.ts).
 * Lo que no está listado cae en 502 (falla del lado de Wompi, no de quien pide).
 */
const HTTP_STATUS_BY_CODE: Partial<Record<PaymentErrorCode, number>> = {
  ACCESS_BLOCKED: 403,
  TOO_MANY_ATTEMPTS: 429,
  INVALID_CONFIGURATION: 500,
  INVALID_REQUEST: 400,
  GATEWAY_UNAVAILABLE: 502,
  NO_CONNECTION: 502,
};

function httpStatusForCode(code: PaymentErrorCode): number {
  return HTTP_STATUS_BY_CODE[code] ?? 502;
}

/**
 * Inicia el cobro. Recibe del navegador solo lo que no puede falsificarse
 * en nuestra contra: el token de la tarjeta y la referencia. El monto lo
 * pone el servidor, derivado del plan que viaja dentro de la referencia.
 *
 * Responder 200 aquí NO significa que el pago se completó: casi siempre la
 * transacción nace en PENDING. El estado real se consulta con
 * /api/wompi/status, y el webhook es la única fuente de verdad sobre si se
 * aprobó (ver app/api/wompi/webhook/route.ts).
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  if (!body?.reference || !body?.email || !body?.cardToken) {
    return NextResponse.json({ error: "Faltan datos del pago" }, { status: 400 });
  }

  // Wompi exige aceptación explícita de sus dos contratos. Nosotros
  // adjuntamos los tokens más abajo, así que el servidor tiene que
  // confirmar que el usuario de verdad marcó la casilla: aceptar en su
  // nombre sin que lo haya hecho vaciaría de sentido el requisito.
  if (body.acceptedTerms !== true) {
    return NextResponse.json(
      { error: "Debes aceptar los términos de Wompi para pagar" },
      { status: 400 }
    );
  }

  // Igual que en la firma: el precio jamás se toma del navegador, se
  // deriva del plan que viaja dentro de la referencia.
  const order = parseReference(String(body.reference));

  if (!order?.plan) {
    return NextResponse.json(
      { error: "Referencia inválida o plan desconocido" },
      { status: 400 }
    );
  }

  const cardHolderName = String(body.cardHolderName || "").trim();
  if (cardHolderName.length < 3) {
    return NextResponse.json({ error: "Falta el nombre del titular de la tarjeta" }, { status: 400 });
  }

  try {
    // Los tokens de aceptación caducan, así que se piden en el momento en
    // vez de dejar que el navegador nos mande unos viejos.
    const tokens = await getAcceptanceTokens();

    const tx = await createTransaction({
      reference: String(body.reference),
      amountInCents: order.plan.priceCOP * 100,
      customerEmail: String(body.email),
      paymentMethod: { type: "CARD", token: String(body.cardToken), installments: 1 },
      acceptanceToken: tokens.acceptanceToken,
      personalDataToken: tokens.personalDataToken,
      customerFullName: cardHolderName,
    });

    return NextResponse.json({
      id: tx.id,
      status: tx.status,
      statusMessage: tx.status_message ?? null,
    });
  } catch (err) {
    if (err instanceof PaymentGatewayError) {
      // Clasificado: sabemos si fue la red, un bloqueo de la pasarela (WAF/IP),
      // rate limiting, configuración inválida, etc. Ver lib/payment-errors.ts.
      console.error("El pago no se pudo iniciar:", {
        code: err.code,
        message: err.message,
      });
      return NextResponse.json(
        { error: err.message, code: err.code, hint: err.hint ?? null },
        { status: httpStatusForCode(err.code) }
      );
    }

    // Errores de validación de Wompi (lib/wompi-api.ts los deja como Error
    // simple con el texto ya legible) u otra excepción no anticipada.
    console.error("Error creando transacción Wompi:", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "No pudimos iniciar el pago",
        code: "UNKNOWN" satisfies PaymentErrorCode,
      },
      { status: 502 }
    );
  }
}
