/**
 * Correo de soporte y ventana de entrega, en un solo sitio porque aparecen
 * en tres lugares distintos (footer, FAQ y pantalla de pago aprobado) y no
 * pueden quedar desincronizados.
 *
 * La entrega es manual a propósito (ver README): no hay recarga automática
 * por API de un proveedor mayorista. El vendedor revisa el panel de Wompi,
 * toma el correo del comprador y le escribe para pedirle el UID de su
 * cuenta de Free Fire y coordinar la recarga.
 */
export const CORREO_CONTACTO = "soporte@pinfire.co";
export const HORAS_DE_ENTREGA = 12;
