import { NextRequest, NextResponse } from "next/server";
import { getTransaction } from "@/lib/wompi-api";

export const runtime = "nodejs";

/**
 * Consulta el estado mientras el cliente espera en la página. Esto es solo
 * cosmético: la confirmación de la venta NO depende de esta ruta. El
 * comprador puede cerrar la pestaña a mitad del pago y el cobro se
 * completa igual — quien manda es /api/wompi/webhook.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tx = await getTransaction(params.id);
    return NextResponse.json({
      id: tx.id,
      status: tx.status,
      statusMessage: tx.status_message ?? null,
    });
  } catch (err) {
    console.error("Error consultando transacción:", err);
    return NextResponse.json(
      { error: "No pudimos consultar el estado del pago" },
      { status: 502 }
    );
  }
}
