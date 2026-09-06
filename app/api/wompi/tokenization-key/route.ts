import { NextResponse } from "next/server";
import { getTokenizationPublicKey } from "@/lib/wompi-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Proxy de solo lectura hacia `GET {base}/tokens/keys/tokenization`.
 *
 * Existe porque, a la fecha de esta prueba (5 de septiembre de 2026), la
 * respuesta real de Wompi para esa consulta no trae CORS: llamarla directo
 * desde el navegador produce "Failed to fetch" aunque su OPTIONS de
 * preflight responda bien. Pedirla desde nuestro propio servidor evita el
 * problema por completo.
 *
 * Devuelve ÚNICAMENTE `data.publicKey` (la llave pública de cifrado, hecha
 * para viajar al navegador) y nunca se cachea: es la llave con la que el
 * cliente arma el JWE antes de tokenizar (ver lib/wompi-client.ts).
 */
export async function GET() {
  try {
    const publicKey = await getTokenizationPublicKey();
    return NextResponse.json(
      { publicKey },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("Error obteniendo la llave de cifrado de Wompi:", err);
    return NextResponse.json(
      { error: "No pudimos preparar el cifrado de tu tarjeta. Intenta de nuevo." },
      { status: 502, headers: { "Cache-Control": "no-store" } }
    );
  }
}
