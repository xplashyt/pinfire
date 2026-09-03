import { NextRequest, NextResponse } from "next/server";
import { parseReference } from "@/lib/orders";
import {
  createTransaction,
  getAcceptanceTokens,
  PaymentGatewayError,
  type PaymentMethodInput,
} from "@/lib/wompi-api";
import type { PaymentErrorCode } from "@/lib/payment-errors";

export const runtime = "nodejs";

const CUOTAS_VALIDAS = [1, 2, 3, 6, 12, 18, 24, 36];

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
 * en nuestra contra: el token de la tarjeta (o el celular de Nequi) y la
 * referencia. El monto lo pone el servidor.
 *
 * Responder 200 aquí NO significa que el pago se completó: casi siempre
 * la transacción nace en PENDING. El estado real se consulta con
 * /api/wompi/status, y la entrega se dispara desde el webhook.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  if (!body?.reference || !body?.email) {
    return NextResponse.json(
      { error: "Faltan datos del pedido" },
      { status: 400 }
    );
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
  // deriva del paquete que viaja dentro de la referencia.
  const order = parseReference(String(body.reference));

  if (!order?.pkg) {
    return NextResponse.json(
      { error: "Referencia inválida o paquete desconocido" },
      { status: 400 }
    );
  }

  let paymentMethod: PaymentMethodInput;

  if (body.method === "CARD") {
    if (!body.cardToken) {
      return NextResponse.json({ error: "Falta el token de la tarjeta" }, { status: 400 });
    }
    const installments = Number(body.installments) || 1;
    if (!CUOTAS_VALIDAS.includes(installments)) {
      return NextResponse.json({ error: "Número de cuotas no válido" }, { status: 400 });
    }
    paymentMethod = { type: "CARD", token: String(body.cardToken), installments };
  } else if (body.method === "NEQUI") {
    const phone = String(body.phoneNumber || "").replace(/\D/g, "");
    if (!/^3\d{9}$/.test(phone)) {
      return NextResponse.json(
        { error: "El número de Nequi debe ser un celular colombiano de 10 dígitos" },
        { status: 400 }
      );
    }
    paymentMethod = { type: "NEQUI", phone_number: phone };
  } else {
    return NextResponse.json({ error: "Medio de pago no soportado" }, { status: 400 });
  }

  try {
    // Los tokens de aceptación caducan, así que se piden en el momento en
    // vez de dejar que el navegador nos mande unos viejos.
    const tokens = await getAcceptanceTokens();

    const tx = await createTransaction({
      reference: String(body.reference),
      amountInCents: order.pkg.priceCOP * 100,
      customerEmail: String(body.email),
      paymentMethod,
      acceptanceToken: tokens.acceptanceToken,
      personalDataToken: tokens.personalDataToken,
      customerFullName: `ID Free Fire ${order.playerId}`,
      customerIp:
        req.headers.get("x-forwarded-for")?.split(",")[0].trim() || undefined,
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
