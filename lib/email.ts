import { Resend } from "resend";
import { formatCOP } from "./products";

/**
 * Aviso de pedido pagado. Es el único canal por el que sabes que tienes
 * que recargar, así que si el envío falla lo dejamos explotar para que
 * el webhook responda 500 y Wompi reintente el evento.
 */
export interface OrderEmailData {
  playerId: string;
  packageId: string;
  diamonds: number | null;
  bonus: number | null;
  amountInCents: number;
  reference: string;
  transactionId: string;
  customerEmail: string | null;
  paymentMethod: string | null;
}

export async function sendOrderEmail(order: OrderEmailData): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.ORDER_NOTIFY_EMAIL;
  const from = process.env.ORDER_FROM_EMAIL || "PinFire <onboarding@resend.dev>";

  if (!apiKey) throw new Error("Falta RESEND_API_KEY");
  if (!to) throw new Error("Falta ORDER_NOTIFY_EMAIL");

  const resend = new Resend(apiKey);

  const diamantes =
    order.diamonds !== null
      ? `${order.diamonds.toLocaleString("es-CO")}${
          order.bonus ? ` + ${order.bonus} de bono` : ""
        }`
      : `desconocido (paquete "${order.packageId}" no está en lib/products.ts)`;

  const rows: [string, string][] = [
    ["ID de jugador (UID)", order.playerId],
    ["Diamantes a recargar", diamantes],
    ["Paquete", order.packageId],
    ["Monto pagado", formatCOP(order.amountInCents / 100)],
    ["Correo del cliente", order.customerEmail || "no informado"],
    ["Medio de pago", order.paymentMethod || "no informado"],
    ["Referencia", order.reference],
    ["Transacción Wompi", order.transactionId],
  ];

  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:520px">
      <h2 style="margin:0 0 4px">Pedido pagado</h2>
      <p style="margin:0 0 20px;color:#666">Recarga este UID en Free Fire.</p>
      <p style="font-size:28px;font-weight:700;letter-spacing:1px;margin:0 0 24px">
        ${order.playerId}
      </p>
      <table style="border-collapse:collapse;width:100%;font-size:14px">
        ${rows
          .map(
            ([label, value]) => `
          <tr>
            <td style="padding:8px 12px 8px 0;color:#666;border-bottom:1px solid #eee;white-space:nowrap">${label}</td>
            <td style="padding:8px 0;border-bottom:1px solid #eee"><strong>${value}</strong></td>
          </tr>`
          )
          .join("")}
      </table>
    </div>
  `;

  const text = rows.map(([label, value]) => `${label}: ${value}`).join("\n");

  const { error } = await resend.emails.send({
    from,
    to,
    subject: `Pedido pagado — UID ${order.playerId} — ${diamantes} diamantes`,
    html,
    text,
    ...(order.customerEmail ? { replyTo: order.customerEmail } : {}),
  });

  if (error) {
    throw new Error(`Resend rechazó el envío: ${error.message}`);
  }
}
