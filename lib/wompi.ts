import crypto from "crypto";

/**
 * Firma de integridad de Wompi.
 *
 * Fórmula documentada por Wompi: SHA-256 de la concatenación de
 * referencia + monto en centavos + moneda + secreto de integridad.
 *
 * Verifica esta fórmula contra la documentación vigente de Wompi
 * (https://docs.wompi.co) antes de pasar a producción. Las pasarelas de
 * pago a veces ajustan el formato exacto, y una firma mal construida hace
 * que la transacción se rechace silenciosamente.
 */
export function buildIntegritySignature(
  reference: string,
  amountInCents: number,
  currency: string,
  integritySecret: string
): string {
  const chain = `${reference}${amountInCents}${currency}${integritySecret}`;
  return crypto.createHash("sha256").update(chain).digest("hex");
}

/**
 * Verificación de la firma de un evento (webhook) de Wompi.
 *
 * Wompi indica en `signature.properties` qué campos de `data` se deben
 * concatenar (en ese orden) junto con el timestamp del evento y el
 * secreto de eventos, para comparar contra `signature.checksum`.
 *
 * La comparación va por `timingSafeEqual`, no por `===`: comparar strings
 * secretos con `===` sale más rápido cuando difieren pronto, y esa
 * diferencia de tiempo es en teoría explotable para adivinar el checksum
 * byte a byte. `timingSafeEqual` exige buffers del mismo largo, así que
 * primero se descarta la longitud (que no es secreta) y solo se hace la
 * comparación a tiempo constante cuando ya coinciden en tamaño.
 */
export function verifyEventSignature(
  data: Record<string, unknown>,
  properties: string[],
  timestamp: number | string,
  checksum: string,
  eventsSecret: string
): boolean {
  const values = properties.map((path) =>
    path
      .split(".")
      .reduce<unknown>(
        (obj, key) =>
          obj && typeof obj === "object" ? (obj as Record<string, unknown>)[key] : undefined,
        data
      )
  );

  const chain = `${values.join("")}${timestamp}${eventsSecret}`;
  const expected = crypto.createHash("sha256").update(chain).digest("hex");

  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(checksum, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
