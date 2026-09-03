/**
 * Clasificación de errores de pago, compartida entre cliente y servidor.
 *
 * Sin imports: igual que lib/wompi-env.ts, este archivo lo necesitan tanto
 * el navegador (lib/wompi-client.ts) como el servidor (lib/wompi-api.ts), así
 * que no puede arrastrar nada de Node ni nada específico de un lado.
 *
 * Hay dos fuentes de error muy distintas y este archivo las separa a propósito:
 *
 * 1. RECHAZO DEL EMISOR (`classifyDeclineReason`): la transacción SÍ se creó
 *    y Wompi la dejó en DECLINED/ERROR. El motivo llega como texto libre del
 *    adquirente en `status_message` ("Fondos insuficientes", "Tarjeta
 *    vencida"...). No existe una lista cerrada de códigos para esto —es
 *    texto que viene del banco emisor—, así que esto es reconocimiento de
 *    patrones con un mensaje de respaldo que NUNCA oculta el motivo real
 *    que dio el banco cuando no reconocemos el patrón.
 *
 * 2. FALLA DE LA PASARELA (`classifyGatewayFailure`): la transacción ni
 *    siquiera se pudo crear —Wompi respondió 403/429/5xx, no respondió JSON
 *    (típico de un bloqueo de firewall/WAF delante de su API), o la red
 *    falló antes de llegar—. Esto sí se puede clasificar con certeza porque
 *    se observa directamente en la respuesta del `fetch`. Un 403 (o una
 *    respuesta que no es JSON) es la señal disponible de que la IP o la red
 *    de origen quedó bloqueada por seguridad —Wompi no manda un mensaje
 *    literal de "IP baneada", pero esa suele ser la causa real detrás de
 *    ese código—.
 */

export type PaymentErrorCode =
  | "INSUFFICIENT_FUNDS"
  | "CARD_EXPIRED"
  | "INVALID_CVC"
  | "INVALID_CARD"
  | "RESTRICTED_CARD"
  | "STOLEN_OR_LOST_CARD"
  | "SUSPECTED_FRAUD"
  | "LIMIT_EXCEEDED"
  | "ISSUER_UNAVAILABLE"
  | "NEQUI_REJECTED"
  | "NEQUI_EXPIRED"
  | "DECLINED_BY_ISSUER"
  | "ACCESS_BLOCKED"
  | "TOO_MANY_ATTEMPTS"
  | "INVALID_CONFIGURATION"
  | "GATEWAY_UNAVAILABLE"
  | "NO_CONNECTION"
  | "INVALID_REQUEST"
  | "UNKNOWN";

export interface PaymentError {
  code: PaymentErrorCode;
  message: string;
  hint?: string;
}

/** Minúsculas y sin tildes, para que el patrón no dependa de cómo acentuó el banco el texto. */
function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/** Ordenados de más a menos específico: se evalúan en orden y gana el primero que calce. */
const DECLINE_PATTERNS: ReadonlyArray<{
  test: RegExp;
  code: PaymentErrorCode;
  message: string;
  hint: string;
}> = [
  {
    test: /fondos insuficientes|saldo insuficiente|insufficient funds/,
    code: "INSUFFICIENT_FUNDS",
    message: "Tu banco rechazó el pago por fondos insuficientes.",
    hint: "Verifica el saldo o el cupo disponible, o intenta con otra tarjeta.",
  },
  {
    test: /tarjeta (vencida|expirada)|expired card/,
    code: "CARD_EXPIRED",
    message: "La tarjeta está vencida.",
    hint: "Revisa la fecha de vencimiento o usa otra tarjeta.",
  },
  {
    test: /codigo de seguridad|cvv|cvc invalido|security code/,
    code: "INVALID_CVC",
    message: "El código de seguridad (CVC) no es correcto.",
    hint: "Verifica los dígitos del reverso de la tarjeta (o el frente, en Amex).",
  },
  {
    test: /robada|perdida|stolen|lost card/,
    code: "STOLEN_OR_LOST_CARD",
    message: "El banco bloqueó esta tarjeta por reporte de robo o pérdida.",
    hint: "Contacta a tu banco o utiliza otra tarjeta.",
  },
  {
    test: /restringida|bloqueada|no habilitada|restricted card/,
    code: "RESTRICTED_CARD",
    message: "La tarjeta está restringida para este tipo de compra.",
    hint: "Habilita las compras por internet con tu banco o usa otra tarjeta.",
  },
  {
    test: /fraude|sospech|actividad inusual|suspected fraud/,
    code: "SUSPECTED_FRAUD",
    message: "El banco bloqueó el pago por seguridad (posible fraude).",
    hint: "Contacta a tu banco para autorizar la compra, o intenta con otro medio de pago.",
  },
  {
    test: /excede|limite|monto maximo|exceeds/,
    code: "LIMIT_EXCEEDED",
    message: "El monto supera el límite habilitado para esta tarjeta.",
    hint: "Prueba con otra tarjeta o consulta tu límite de compras en línea con tu banco.",
  },
  {
    test: /emisor no disponible|issuer unavailable|no se pudo contactar/,
    code: "ISSUER_UNAVAILABLE",
    message: "No pudimos comunicarnos con tu banco.",
    hint: "Intenta de nuevo en unos minutos o usa otra tarjeta.",
  },
  {
    test: /tarjeta invalida|numero de tarjeta invalido|invalid card/,
    code: "INVALID_CARD",
    message: "El número de la tarjeta no es válido para tu banco.",
    hint: "Revisa los dígitos o intenta con otra tarjeta.",
  },
  {
    test: /rechazad[oa] por el cliente|cancelad[oa] por el usuario/,
    code: "NEQUI_REJECTED",
    message: "Rechazaste el pago desde la app de Nequi.",
    hint: "Si fue sin querer, intenta de nuevo y aprueba la notificación.",
  },
  {
    test: /expir|tiempo de espera|timeout/,
    code: "NEQUI_EXPIRED",
    message: "La notificación de pago expiró antes de que la aprobaras.",
    hint: "Intenta de nuevo y aprueba la notificación en Nequi apenas te llegue.",
  },
];

/**
 * Traduce el `status_message` de una transacción DECLINED/ERROR a un mensaje
 * claro y accionable. Si no reconoce el patrón, conserva el motivo original
 * del banco en vez de esconderlo: es información real que el emisor envió.
 */
export function classifyDeclineReason(
  statusMessage: string | null | undefined
): PaymentError {
  const reason = statusMessage?.trim();

  if (reason) {
    const normalized = normalize(reason);
    for (const pattern of DECLINE_PATTERNS) {
      if (pattern.test.test(normalized)) {
        return { code: pattern.code, message: pattern.message, hint: pattern.hint };
      }
    }
    return {
      code: "DECLINED_BY_ISSUER",
      message: `Tu banco rechazó la transacción: ${reason}.`,
      hint: "Contacta a tu banco, prueba con otra tarjeta o paga con Nequi.",
    };
  }

  return {
    code: "DECLINED_BY_ISSUER",
    message: "El banco rechazó la transacción.",
    hint: "Prueba con otra tarjeta, revisa tu cupo o paga con Nequi.",
  };
}

/** Lo que la capa de red SÍ puede observar con certeza sobre una falla de la pasarela. */
export interface GatewayFailureInput {
  /** true si el `fetch` nunca obtuvo respuesta (DNS, timeout, sin internet…). */
  networkError?: boolean;
  /** true si la respuesta no fue JSON válido (típico de una página de bloqueo de un WAF). */
  nonJsonResponse?: boolean;
  httpStatus?: number;
  wompiErrorType?: string | null;
}

/**
 * Clasifica una falla al CREAR el pago (tokenización, `/merchants` o
 * `/transactions`), es decir, antes de que exista una transacción con
 * estado. A diferencia del rechazo del emisor, esto sí se puede determinar
 * con certeza porque lo observamos directamente en la respuesta HTTP.
 */
export function classifyGatewayFailure(input: GatewayFailureInput): PaymentError {
  if (input.networkError) {
    return {
      code: "NO_CONNECTION",
      message: "No pudimos conectar con la pasarela de pagos.",
      hint: "Revisa tu conexión a internet e intenta de nuevo.",
    };
  }

  const status = input.httpStatus ?? 0;

  if (status === 429) {
    return {
      code: "TOO_MANY_ATTEMPTS",
      message: "Hiciste demasiados intentos de pago seguidos.",
      hint: "Espera un par de minutos antes de volver a intentarlo.",
    };
  }

  if (status === 401) {
    return {
      code: "INVALID_CONFIGURATION",
      message: "La pasarela de pagos rechazó la conexión de la tienda.",
      hint: "No es un problema de tu tarjeta; escríbenos para resolverlo.",
    };
  }

  // Un 403 —o una respuesta que no es JSON, típico de una página HTML de
  // bloqueo de Cloudflare/WAF— es la señal disponible de que la IP o la red
  // de origen quedó bloqueada por el filtro de seguridad de la pasarela: VPN,
  // proxy, rango de datacenter, o demasiados intentos fallidos previos.
  if (status === 403 || input.nonJsonResponse) {
    return {
      code: "ACCESS_BLOCKED",
      message: "La pasarela de pagos bloqueó esta conexión por seguridad.",
      hint:
        "Si usas VPN o proxy, desactívalo. Si no, intenta desde otra red o dispositivo, o escríbenos.",
    };
  }

  if (status >= 500) {
    return {
      code: "GATEWAY_UNAVAILABLE",
      message: "La pasarela de pagos no está respondiendo en este momento.",
      hint: "No se realizó ningún cobro. Intenta de nuevo en unos minutos.",
    };
  }

  if (status === 400 || status === 422 || input.wompiErrorType === "INPUT_VALIDATION_ERROR") {
    return {
      code: "INVALID_REQUEST",
      message: "Los datos del pago no fueron aceptados por la pasarela.",
      hint: "Recarga la página e inténtalo de nuevo.",
    };
  }

  return {
    code: "UNKNOWN",
    message: "No pudimos procesar el pago en este momento.",
    hint: "No se realizó ningún cobro; intenta de nuevo.",
  };
}
