/**
 * Datos de la hoja de referencia: en qué suele gastar sus diamantes un
 * jugador de Free Fire.
 *
 * A propósito NO llevan un costo exacto en diamantes: Garena ajusta esos
 * precios con cada actualización y evento, y publicar una cifra fija que
 * queda vieja en dos semanas es peor que no publicarla. `costo` es una
 * referencia relativa (baja/media/alta), no un precio — el precio vigente
 * se confirma siempre dentro de la tienda del juego.
 */
export interface UsoDeDiamantes {
  item: string;
  costo: "Bajo" | "Medio" | "Alto" | "Muy alto";
  nota: string;
}

export const usosDeDiamantes: UsoDeDiamantes[] = [
  {
    item: "Pase Elite de la temporada",
    costo: "Medio",
    nota: "Se paga una vez por temporada; el rango de misiones lo puedes subir gratis jugando.",
  },
  {
    item: "Reactivar un Pase Elite vencido",
    costo: "Bajo",
    nota: "Más barato que comprarlo desde cero si ya lo tenías activo antes.",
  },
  {
    item: "Personaje nuevo",
    costo: "Alto",
    nota: "El precio baja fuerte cuando el personaje deja de ser el más reciente.",
  },
  {
    item: "Skin de arma (Loot Royale o tienda)",
    costo: "Medio",
    nota: "Las de tienda directa suelen costar más que las de sorteo por unidad.",
  },
  {
    item: "Mascota o su evolución",
    costo: "Medio",
    nota: "Evolucionar una mascota que ya tienes cuesta menos que comprar una nueva.",
  },
  {
    item: "Cambio de nombre de usuario",
    costo: "Bajo",
    nota: "Se puede pagar con diamantes o, la primera vez, gratis.",
  },
  {
    item: "Sorteo temporal (Loot Royale, Faded Wheel)",
    costo: "Muy alto",
    nota: "El costo total depende de cuántos giros hagas, no de un precio fijo.",
  },
];

export const NOTA_EQUIVALENCIAS =
  "Referencia general, no precios exactos: Garena los cambia con cada actualización. Confirma el costo vigente dentro de la tienda de Free Fire antes de calcular para qué te alcanza.";
