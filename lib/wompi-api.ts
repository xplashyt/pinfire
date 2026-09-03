import { buildIntegritySignature } from "./wompi";
import { wompiBaseUrl } from "./wompi-env";
import { classifyGatewayFailure, type PaymentErrorCode } from "./payment-errors";

export { wompiBaseUrl };

/**
 * Error de pago clasificado. A diferencia de un `Error` genérico, trae el
 * `code` (para que la ruta de API elija el status HTTP correcto) y el
 * `hint` accionable (para que el navegador se lo muestre a quien paga,
 * además del mensaje). Ver lib/payment-errors.ts para el criterio de
 * clasificación.
 */
export class PaymentGatewayError extends Error {
  readonly code: PaymentErrorCode;
  readonly hint?: string;

  constructor(code: PaymentErrorCode, message: string, hint?: string) {
    super(message);
    this.name = "PaymentGatewayError";
    this.code = code;
    this.hint = hint;
  }
}

/**
 * Cliente de la API de Wompi.
 *
 * Este proyecto NO usa el widget ni el Web Checkout: el formulario vive en
 * nuestra propia página y hablamos con la API directamente. El reparto de
 * responsabilidades importa:
 *
 *   - Los datos de la tarjeta se tokenizan desde el NAVEGADOR contra Wompi
 *     usando la llave pública (ver lib/wompi-client.ts). El número de
 *     tarjeta nunca pasa por nuestro servidor, que es lo que nos mantiene
 *     fuera del alcance más pesado de PCI DSS.
 *   - La transacción se crea desde el SERVIDOR con la llave privada, que
 *     nunca sale de aquí.
 */

function serverConfig() {
  const publicKey = process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY;
  const privateKey = process.env.WOMPI_PRIVATE_KEY;
  const integritySecret = process.env.WOMPI_INTEGRITY_SECRET;

  if (!publicKey) throw new Error("Falta NEXT_PUBLIC_WOMPI_PUBLIC_KEY");
  if (!privateKey) throw new Error("Falta WOMPI_PRIVATE_KEY");
  if (!integritySecret) throw new Error("Falta WOMPI_INTEGRITY_SECRET");

  return { publicKey, privateKey, integritySecret, base: wompiBaseUrl(publicKey) };
}

export interface AcceptanceTokens {
  acceptanceToken: string;
  acceptanceUrl: string;
  personalDataToken: string;
  personalDataUrl: string;
}

/**
 * Wompi exige que el usuario acepte dos contratos (reglamento y
 * tratamiento de datos) antes de cobrar. Los tokens vienen firmados y
 * caducan a la hora, así que se piden justo antes de pagar, no se cachean.
 */
export async function getAcceptanceTokens(): Promise<AcceptanceTokens> {
  const { publicKey, base } = serverConfig();

  let res: Response;
  try {
    res = await fetch(`${base}/merchants/${publicKey}`, {
      cache: "no-store",
    });
  } catch (error) {
    console.error("No se pudo conectar para pedir los tokens de aceptación:", error);
    const classified = classifyGatewayFailure({ networkError: true });
    throw new PaymentGatewayError(classified.code, classified.message, classified.hint);
  }

  // Texto primero, JSON después: si lo que volvió no es JSON (por ejemplo una
  // página de bloqueo de un WAF delante de la API de Wompi), `res.json()`
  // lanzaría antes de poder distinguir esa causa de un simple 5xx.
  const rawText = await res.text().catch(() => "");
  let body: {
    data?: {
      presigned_acceptance?: { acceptance_token?: string; permalink?: string };
      presigned_personal_data_auth?: { acceptance_token?: string; permalink?: string };
    };
  } | null = null;
  try {
    body = rawText ? JSON.parse(rawText) : null;
  } catch {
    body = null;
  }

  if (!res.ok) {
    console.error("Wompi /merchants respondió con error:", {
      httpStatus: res.status,
      rawBody: body ? undefined : rawText.slice(0, 300),
    });
    const classified = classifyGatewayFailure({
      httpStatus: res.status,
      nonJsonResponse: body === null && rawText.length > 0,
    });
    throw new PaymentGatewayError(classified.code, classified.message, classified.hint);
  }

  const acceptance = body?.data?.presigned_acceptance;
  const personal = body?.data?.presigned_personal_data_auth;

  if (!acceptance?.acceptance_token || !personal?.acceptance_token) {
    console.error("Respuesta de /merchants sin tokens de aceptación:", body);
    throw new PaymentGatewayError(
      "UNKNOWN",
      "La pasarela de pagos no está configurada correctamente. Escríbenos para completar tu compra."
    );
  }

  return {
    acceptanceToken: acceptance.acceptance_token,
    acceptanceUrl: acceptance.permalink ?? "",
    personalDataToken: personal.acceptance_token,
    personalDataUrl: personal.permalink ?? "",
  };
}

export type PaymentMethodInput =
  | { type: "CARD"; token: string; installments: number }
  | { type: "NEQUI"; phone_number: string };

export interface CreateTransactionInput {
  reference: string;
  amountInCents: number;
  customerEmail: string;
  paymentMethod: PaymentMethodInput;
  acceptanceToken: string;
  personalDataToken: string;
  customerFullName: string;
  customerIp?: string;
}

export interface WompiTransaction {
  id: string;
  status: "PENDING" | "APPROVED" | "DECLINED" | "VOIDED" | "ERROR" | string;
  status_message?: string | null;
  reference: string;
  amount_in_cents: number;
  payment_method_type?: string;
  payment_method?: { extra?: Record<string, unknown> };
}

export async function createTransaction(
  input: CreateTransactionInput
): Promise<WompiTransaction> {
  const { privateKey, integritySecret, base } = serverConfig();

  const signature = buildIntegritySignature(
    input.reference,
    input.amountInCents,
    "COP",
    integritySecret
  );

  let res: Response;
  try {
    res = await fetch(`${base}/transactions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${privateKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        acceptance_token: input.acceptanceToken,
        accept_personal_auth: input.personalDataToken,
        amount_in_cents: input.amountInCents,
        currency: "COP",
        customer_email: input.customerEmail,
        reference: input.reference,
        signature,
        payment_method: input.paymentMethod,
        customer_data: { full_name: input.customerFullName },
        ...(input.customerIp ? { ip: input.customerIp } : {}),
      }),
    });
  } catch (error) {
    // El fetch nunca llegó a Wompi: DNS, timeout, sin salida a internet desde
    // el servidor... Nada de esto tiene un `res.status` que clasificar.
    console.error("No se pudo conectar para crear la transacción:", {
      reference: input.reference,
      message: error instanceof Error ? error.message : String(error),
    });
    const classified = classifyGatewayFailure({ networkError: true });
    throw new PaymentGatewayError(classified.code, classified.message, classified.hint);
  }

  // Igual que en getAcceptanceTokens: texto primero, JSON después. Un bloqueo
  // de WAF/firewall delante de la API de Wompi (IP marcada como sospechosa,
  // por ejemplo) típicamente responde con una página HTML, no con el JSON de
  // error que espera este código.
  const rawText = await res.text().catch(() => "");
  let body: {
    data?: WompiTransaction;
    error?: { type?: string; reason?: unknown; messages?: unknown };
  } | null = null;
  try {
    body = rawText ? JSON.parse(rawText) : null;
  } catch {
    body = null;
  }

  if (!res.ok || !body?.data?.id) {
    // El detalle crudo lleva nombres de campos internos de Wompi, útiles
    // para depurar pero no para mostrárselos al cliente.
    console.error("Wompi rechazó la transacción:", {
      httpStatus: res.status,
      body,
      rawBody: body ? undefined : rawText.slice(0, 300),
      reference: input.reference,
    });

    // Si Wompi devolvió su formato habitual de error de VALIDACIÓN, esos
    // mensajes sí describen algo que quien paga puede corregir (un campo mal
    // formado, por ejemplo). Si no —403/429/5xx, 200 sin cuerpo utilizable, o
    // ni siquiera vino JSON—, el problema es la pasarela o la conexión, no lo
    // que el cliente escribió, y así se lo decimos en vez de exponerle el
    // código HTTP crudo.
    const detalle = collectMessages(body?.error?.messages);
    if (detalle.length > 0) {
      throw new Error(detalle.join(" "));
    }

    const classified = classifyGatewayFailure({
      httpStatus: res.status,
      wompiErrorType: body?.error?.type ?? null,
      nonJsonResponse: body === null && rawText.length > 0,
    });
    throw new PaymentGatewayError(classified.code, classified.message, classified.hint);
  }

  return body.data;
}

/**
 * Los errores de validación de Wompi vienen anidados y con profundidad
 * variable, p. ej.:
 *   { payment_method: { messages: { token: ["Formato inválido"] } } }
 * Recogemos solo los textos de las hojas; los nombres de los campos no le
 * dicen nada a quien está comprando.
 */
function collectMessages(node: unknown, out: string[] = []): string[] {
  if (typeof node === "string") out.push(node);
  else if (Array.isArray(node)) node.forEach((n) => collectMessages(n, out));
  else if (node && typeof node === "object")
    Object.values(node).forEach((n) => collectMessages(n, out));
  return out;
}

/**
 * Consulta de estado. Se usa con la llave pública porque el navegador
 * consulta a través de nuestra ruta /api/wompi/status mientras espera a
 * que el pago se resuelva (la tarjeta tarda segundos; el push de Nequi,
 * lo que el usuario se demore en aceptarlo en su celular).
 */
export async function getTransaction(id: string): Promise<WompiTransaction> {
  const { publicKey, base } = serverConfig();

  const res = await fetch(`${base}/transactions/${id}`, {
    headers: { Authorization: `Bearer ${publicKey}` },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Wompi /transactions/${id} respondió ${res.status}`);
  }

  const { data } = await res.json();
  return data as WompiTransaction;
}
