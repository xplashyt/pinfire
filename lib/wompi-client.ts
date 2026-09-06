import { wompiBaseUrl } from "./wompi-env";
import { classifyGatewayFailure } from "./payment-errors";

/**
 * Tokenización de tarjetas — se ejecuta SOLO en el navegador.
 *
 * El número de tarjeta, el CVC y la fecha de vencimiento viajan del
 * navegador del cliente directo a Wompi, cifrados con la llave pública de
 * cifrado (no la llave del comercio). Nunca tocan nuestro servidor ni
 * nuestros logs: nosotros solo recibimos el token (`tok_...`), que por sí
 * solo no sirve para nada fuera de nuestra cuenta de Wompi.
 *
 * No muevas esta llamada al backend "para que sea más ordenado": hacerlo
 * metería datos de tarjeta en nuestra infraestructura y nos obligaría a
 * cumplir el nivel más exigente de PCI DSS.
 *
 * Flujo (documentación vigente de Wompi, verificada el 5 de septiembre de
 * 2026 contra `docs.wompi.co`):
 *   1. Pedimos la llave de cifrado a NUESTRA ruta `/api/wompi/tokenization-key`
 *      (que a su vez consulta `GET /tokens/keys/tokenization` en el
 *      servidor). Directo desde el navegador esa consulta de Wompi falla
 *      con "Failed to fetch": su respuesta real no trae CORS, aunque el
 *      preflight OPTIONS sí responda.
 *   2. Ciframos los datos de la tarjeta en un JWE compacto: RSA-OAEP-256
 *      para la llave de contenido (CEK) + A256GCM para el contenido.
 *   3. Mandamos `{ payload: "<JWE>" }` a `POST {base}/tokens/cards` — este
 *      endpoint sí permite CORS, así que sale directo del navegador.
 */

const PUBLIC_KEY = process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY;

/**
 * Next.js reemplaza `NEXT_PUBLIC_*` por su valor literal al COMPILAR, no al
 * ejecutar. Si la variable no existía durante el build (típico: se agregó en
 * Vercel después de desplegar y no se volvió a construir), aquí llega
 * undefined. Sin este guard el síntoma es un "Cannot read properties of
 * undefined (reading 'startsWith')" en la cara del cliente, imposible de
 * diagnosticar desde el navegador.
 */
function requirePublicKey(): string {
  if (!PUBLIC_KEY) {
    throw new Error(
      "Configuración incompleta: falta NEXT_PUBLIC_WOMPI_PUBLIC_KEY en el build. " +
        "Agrégala en las variables de entorno y vuelve a desplegar."
    );
  }
  return PUBLIC_KEY;
}

function base64UrlEncode(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (const byte of arr) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** PEM (`-----BEGIN PUBLIC KEY-----...`) al DER que pide `crypto.subtle.importKey("spki", ...)`. */
function pemToDer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN [^-]+-----/, "")
    .replace(/-----END [^-]+-----/, "")
    .replace(/\s+/g, "");
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

/**
 * Construye el JWE compacto que exige Wompi para tokenizar: cabecera
 * `{alg:"RSA-OAEP-256", enc:"A256GCM"}` + llave de contenido (CEK) cifrada
 * con la llave pública RSA + contenido cifrado con esa CEK en AES-256-GCM.
 * Todo con la Web Crypto API nativa del navegador: no hace falta una
 * librería de JOSE/JWE para un solo formato fijo.
 */
async function buildCardJWE(publicKeyPem: string, cardPayload: Record<string, string>): Promise<string> {
  const header = { alg: "RSA-OAEP-256", enc: "A256GCM" };
  const headerB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));

  const rsaKey = await crypto.subtle.importKey(
    "spki",
    pemToDer(publicKeyPem),
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["encrypt"]
  );

  const cek = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, [
    "encrypt",
  ]);
  const rawCek = await crypto.subtle.exportKey("raw", cek);
  const encryptedKey = await crypto.subtle.encrypt({ name: "RSA-OAEP" }, rsaKey, rawCek);

  const iv = crypto.getRandomValues(new Uint8Array(12));
  // AAD del JWE: los bytes ASCII del header ya codificado en base64url.
  const aad = new TextEncoder().encode(headerB64);
  const plaintext = new TextEncoder().encode(JSON.stringify(cardPayload));

  // Web Crypto entrega el tag de autenticación (16 bytes) pegado al final
  // del texto cifrado; el JWE compacto los lleva como segmentos separados.
  const cipherWithTag = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: aad, tagLength: 128 },
    cek,
    plaintext
  );
  const full = new Uint8Array(cipherWithTag);
  const tag = full.slice(full.length - 16);
  const ciphertext = full.slice(0, full.length - 16);

  return [
    headerB64,
    base64UrlEncode(encryptedKey),
    base64UrlEncode(iv),
    base64UrlEncode(ciphertext),
    base64UrlEncode(tag),
  ].join(".");
}

export interface CardInput {
  number: string;
  expMonth: string;
  expYear: string;
  cvc: string;
  cardHolder: string;
}

export interface CardToken {
  id: string;
  brand: string;
  lastFour: string;
}

export async function tokenizeCard(card: CardInput): Promise<CardToken> {
  const publicKey = requirePublicKey();

  let publicKeyPem: string;
  try {
    const keyRes = await fetch("/api/wompi/tokenization-key", { cache: "no-store" });
    const keyBody = await keyRes.json().catch(() => null);
    if (!keyRes.ok || !keyBody?.publicKey) {
      throw new Error(keyBody?.error || "No pudimos preparar el cifrado de tu tarjeta.");
    }
    publicKeyPem = keyBody.publicKey;
  } catch (error) {
    if (error instanceof TypeError) {
      const classified = classifyGatewayFailure({ networkError: true });
      throw new Error(`${classified.message} ${classified.hint ?? ""}`.trim());
    }
    throw error instanceof Error ? error : new Error("No pudimos preparar el cifrado de tu tarjeta.");
  }

  const jwe = await buildCardJWE(publicKeyPem, {
    number: card.number.replace(/\s/g, ""),
    exp_month: card.expMonth,
    exp_year: card.expYear,
    cvc: card.cvc,
    card_holder: card.cardHolder,
  });

  let res: Response;
  try {
    res = await fetch(`${wompiBaseUrl(publicKey)}/tokens/cards`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${publicKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ payload: jwe }),
    });
  } catch {
    // El navegador nunca llegó a Wompi: sin internet, DNS, o un bloqueador de
    // contenido cortó la petición. Esto NO es un problema de la tarjeta.
    const classified = classifyGatewayFailure({ networkError: true });
    throw new Error(`${classified.message} ${classified.hint ?? ""}`.trim());
  }

  const rawText = await res.text().catch(() => "");
  let body: {
    status?: string;
    data?: { id?: string; brand?: string; last_four?: string };
    error?: { type?: string; messages?: unknown };
  } | null = null;
  try {
    body = rawText ? JSON.parse(rawText) : null;
  } catch {
    body = null;
  }

  if (!res.ok || body?.status !== "CREATED" || !body?.data?.id) {
    // Si Wompi respondió con su formato habitual de error de validación, el
    // problema SÍ son los datos de la tarjeta. Si no —403/429/5xx, o una
    // respuesta que ni siquiera es JSON (página de bloqueo de un WAF)—, el
    // problema es la conexión, no la tarjeta, y así se lo decimos a quien
    // está pagando en vez de culpar al número que escribió.
    const messages = body?.error?.messages;
    if (messages) {
      throw new Error(Object.values(messages).flat().join(" "));
    }
    const classified = classifyGatewayFailure({
      httpStatus: res.status,
      wompiErrorType: body?.error?.type ?? null,
      nonJsonResponse: body === null && rawText.length > 0,
    });
    throw new Error(`${classified.message} ${classified.hint ?? ""}`.trim());
  }

  return {
    id: body.data.id,
    brand: body.data.brand ?? "",
    lastFour: body.data.last_four ?? "",
  };
}

/** Agrupa el número en bloques de 4 mientras el usuario escribe. */
export function formatCardNumber(raw: string): string {
  return raw
    .replace(/\D/g, "")
    .slice(0, 19)
    .replace(/(.{4})/g, "$1 ")
    .trim();
}

/** Convierte lo que el usuario teclea en "MM/AA". */
export function formatExpiry(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

/**
 * Detección de marca solo para mostrar una etiqueta. La validación real
 * la hace Wompi al tokenizar; esto es cosmético.
 */
export function detectBrand(raw: string): string | null {
  const n = raw.replace(/\D/g, "");
  if (!n) return null;
  if (/^4/.test(n)) return "VISA";
  if (/^(5[1-5]|2[2-7])/.test(n)) return "MASTERCARD";
  if (/^3[47]/.test(n)) return "AMEX";
  if (/^(36|38|30[0-5])/.test(n)) return "DINERS";
  return null;
}
