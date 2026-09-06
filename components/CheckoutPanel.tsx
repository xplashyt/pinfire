"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { formatCOP, type Plan } from "@/lib/plans";
import { buildReference } from "@/lib/orders";
import {
  detectBrand,
  formatCardNumber,
  formatExpiry,
  tokenizeCard,
} from "@/lib/wompi-client";
import {
  classifyDeclineReason,
  classifyGatewayFailure,
  TECHNICAL_CODES,
  type PaymentErrorCode,
} from "@/lib/payment-errors";
import { CORREO_CONTACTO, HORAS_DE_ENTREGA } from "@/lib/contacto";
import Perforacion from "./Perforacion";
import { IconoSello } from "./Iconos";

type Fase = "form" | "procesando" | "aprobado" | "rechazado" | "expirado" | "sin-confirmar";

// Cada cuánto le preguntamos a Wompi por el estado, y hasta cuándo.
const INTERVALO_MS = 2500;
const ESPERA_MAX_MS = 5 * 60 * 1000;

interface ResultadoPago {
  mensaje: string;
  hint?: string;
  codigo: PaymentErrorCode | null;
}

export default function CheckoutPanel({
  plan,
  onClose,
}: {
  plan: Plan;
  onClose: () => void;
}) {
  const [fase, setFase] = useState<Fase>("form");
  const [resultado, setResultado] = useState<ResultadoPago | null>(null);
  const [segundos, setSegundos] = useState(0);
  const [referenciaActual, setReferenciaActual] = useState<string | null>(null);
  const [txId, setTxId] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  const [email, setEmail] = useState("");
  const [acepta, setAcepta] = useState(false);
  const [numero, setNumero] = useState("");
  const [vence, setVence] = useState("");
  const [cvc, setCvc] = useState("");
  const [titular, setTitular] = useState("");

  const [terminos, setTerminos] = useState<{
    acceptanceUrl: string;
    personalDataUrl: string;
  } | null>(null);

  const emailRef = useRef<HTMLInputElement>(null);
  const cancelado = useRef(false);

  // Cierre con Escape, foco inicial en el correo y bloqueo del scroll del
  // fondo mientras el checkout está abierto — todo se libera al desmontar.
  useEffect(() => {
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    emailRef.current?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);

    return () => {
      cancelado.current = true;
      document.body.style.overflow = overflowPrevio;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  useEffect(() => {
    fetch("/api/wompi/acceptance")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && !d.error && setTerminos(d))
      .catch(() => {
        /* Sin los enlaces el pago igual funciona; no vale bloquear la compra. */
      });
  }, []);

  // Contador de tiempo transcurrido mientras procesa — nunca una barra de
  // progreso falsa: no sabemos cuánto falta, pero sí cuánto ha pasado.
  useEffect(() => {
    if (fase !== "procesando") return;
    setSegundos(0);
    const id = setInterval(() => setSegundos((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [fase]);

  const marca = detectBrand(numero);

  const emailValido = /\S+@\S+\.\S+/.test(email);
  const titularValido = titular.trim().length >= 3;
  const tarjetaValida =
    numero.replace(/\D/g, "").length >= 13 &&
    /^\d{2}\/\d{2}$/.test(vence) &&
    cvc.length >= 3;

  const puedePagar = emailValido && titularValido && tarjetaValida && acepta;

  function esTecnico(codigo: PaymentErrorCode | null): boolean {
    return codigo ? TECHNICAL_CODES.has(codigo) : false;
  }

  async function esperarResultado(id: string) {
    const limite = Date.now() + ESPERA_MAX_MS;

    while (Date.now() < limite) {
      if (cancelado.current) return;
      await new Promise((r) => setTimeout(r, INTERVALO_MS));
      if (cancelado.current) return;

      const res = await fetch(`/api/wompi/status/${id}`).catch(() => null);
      if (!res || !res.ok) continue; // Un fallo puntual de red no debe abortar la espera.

      const tx = await res.json();

      if (tx.status === "APPROVED") {
        setTxId(id);
        setFase("aprobado");
        return;
      }
      if (tx.status === "DECLINED" || tx.status === "ERROR" || tx.status === "VOIDED") {
        const c = classifyDeclineReason(tx.statusMessage);
        setResultado({ mensaje: c.message, hint: c.hint, codigo: c.code });
        setFase("rechazado");
        return;
      }
    }

    // Se agotó la espera pero la transacción puede seguir viva en Wompi.
    // No decimos "falló": decimos que ya no estamos mirando.
    setFase("expirado");
  }

  async function pagar() {
    setResultado(null);
    setFase("procesando");

    // La referencia se genera ANTES de tokenizar. Si la conexión falla más
    // adelante, esta referencia es lo único que permite verificar el
    // estado real en vez de adivinar si hubo cobro.
    const reference = buildReference(plan.id);
    setReferenciaActual(reference);

    try {
      const [mes, anio] = vence.split("/");
      const token = await tokenizeCard({
        number: numero,
        expMonth: mes,
        expYear: anio,
        cvc,
        cardHolder: titular.trim(),
      });

      let res: Response;
      try {
        res = await fetch("/api/wompi/pay", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reference,
            email,
            cardToken: token.id,
            cardHolderName: titular.trim(),
            acceptedTerms: acepta,
          }),
        });
      } catch {
        // La conexión falló entre EL NAVEGADOR y NUESTRO servidor — no
        // sabemos si Wompi llegó a intentar el cobro. No es un rechazo
        // bancario y no se debe reintentar a ciegas (ver README).
        setFase("sin-confirmar");
        return;
      }

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const codigo = (data.code as PaymentErrorCode) ?? "UNKNOWN";
        setResultado({
          mensaje: [data.error, data.hint].filter(Boolean).join(" ") || "No pudimos iniciar el pago",
          codigo,
        });
        setFase("rechazado");
        return;
      }

      if (data.status === "APPROVED") {
        setTxId(data.id);
        setFase("aprobado");
        return;
      }
      if (data.status === "DECLINED" || data.status === "ERROR") {
        const c = classifyDeclineReason(data.statusMessage);
        setResultado({ mensaje: c.message, hint: c.hint, codigo: c.code });
        setFase("rechazado");
        return;
      }

      await esperarResultado(data.id);
    } catch (err) {
      // Fallas de tokenización: ya vienen como texto legible (validación de
      // Wompi o clasificación de falla de red) desde lib/wompi-client.ts.
      const classified = err instanceof TypeError ? classifyGatewayFailure({ networkError: true }) : null;
      setResultado({
        mensaje: classified ? `${classified.message} ${classified.hint ?? ""}`.trim() : err instanceof Error ? err.message : "Algo salió mal",
        codigo: classified?.code ?? "UNKNOWN",
      });
      setFase("rechazado");
    }
  }

  function copiarReferencia(ref: string) {
    navigator.clipboard
      .writeText(ref)
      .then(() => {
        setCopiado(true);
        setTimeout(() => setCopiado(false), 2000);
      })
      .catch(() => {
        /* Sin permiso del portapapeles no pasa nada grave: la referencia sigue visible para copiarla a mano. */
      });
  }

  return (
    <div
      className="fixed inset-0 z-40 flex justify-center overflow-y-auto bg-grafito/95 px-4 pb-10 pt-8"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkout-titulo"
        className="relative h-fit w-full max-w-sm bg-carbon"
        style={{ clipPath: "polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 0 100%)" }}
      >
        <div className="flex items-start justify-between p-6 pb-0">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-ceniza">
              Comprobante de recarga
            </p>
            <h2 id="checkout-titulo" className="mt-1 font-display text-lg text-hielo">
              {plan.name} · {formatCOP(plan.priceCOP)}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="shrink-0 p-1 font-mono text-lg text-ceniza transition hover:text-hielo"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          {fase === "aprobado" && txId && referenciaActual && (
            <ResultadoAprobado
              email={email}
              referencia={referenciaActual}
              transactionId={txId}
              copiado={copiado}
              onCopiar={() => copiarReferencia(referenciaActual)}
              onCerrar={onClose}
            />
          )}

          {fase === "expirado" && referenciaActual && (
            <ResultadoTecnico
              titulo="Seguimos esperando la confirmación"
              detalle="El pago sigue en proceso en Wompi. Si se aprueba, la venta queda registrada igual aunque cierres esta ventana; te escribiremos al correo."
              referencia={referenciaActual}
              copiado={copiado}
              onCopiar={() => copiarReferencia(referenciaActual)}
              onCerrar={onClose}
            />
          )}

          {fase === "sin-confirmar" && referenciaActual && (
            <ResultadoTecnico
              titulo="No pudimos confirmar el intento"
              detalle="Falló la conexión con nuestro servidor, no tu tarjeta: no sabemos si Wompi llegó a procesar el cobro. No hagas otro pago todavía."
              referencia={referenciaActual}
              copiado={copiado}
              onCopiar={() => copiarReferencia(referenciaActual)}
              onCerrar={onClose}
              accionSecundaria={{ texto: "Intentar de nuevo de todas formas", onClick: () => setFase("form") }}
            />
          )}

          {fase === "rechazado" && resultado && (
            <ResultadoRechazo
              tecnico={esTecnico(resultado.codigo)}
              mensaje={resultado.mensaje}
              hint={resultado.hint}
              referencia={referenciaActual}
              onReintentar={() => setFase("form")}
            />
          )}

          {fase === "procesando" && (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <div className="sello-animado h-10 w-10 text-turquesa">
                <IconoSello className="h-10 w-10" />
              </div>
              <p className="text-sm text-ceniza">Confirmando el pago con tu banco…</p>
              <p className="font-mono text-xs text-ceniza/70">{segundos}s transcurridos</p>
            </div>
          )}

          {fase === "form" && (
            <>
              <div className="mt-2 space-y-4">
                <Campo etiqueta="Correo">
                  <input
                    ref={emailRef}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    autoComplete="email"
                    placeholder="tucorreo@ejemplo.com"
                    className={inputCls}
                  />
                </Campo>

                <Campo etiqueta="Nombre del titular de la tarjeta">
                  <input
                    value={titular}
                    onChange={(e) => setTitular(e.target.value)}
                    autoComplete="cc-name"
                    placeholder="PEDRO PÉREZ"
                    className={inputCls}
                  />
                </Campo>

                <Campo etiqueta="Número de la tarjeta">
                  <div className="relative">
                    <input
                      value={numero}
                      onChange={(e) => setNumero(formatCardNumber(e.target.value))}
                      inputMode="numeric"
                      autoComplete="cc-number"
                      placeholder="1234 5678 9012 3456"
                      className={inputCls}
                    />
                    {marca && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[10px] text-ceniza">
                        {marca}
                      </span>
                    )}
                  </div>
                </Campo>

                <div className="grid grid-cols-2 gap-3">
                  <Campo etiqueta="Vencimiento (MM/AA)">
                    <input
                      value={vence}
                      onChange={(e) => setVence(formatExpiry(e.target.value))}
                      inputMode="numeric"
                      autoComplete="cc-exp"
                      placeholder="12/29"
                      className={inputCls}
                    />
                  </Campo>
                  <Campo etiqueta="CVC">
                    <input
                      value={cvc}
                      onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      inputMode="numeric"
                      autoComplete="cc-csc"
                      placeholder="123"
                      className={inputCls}
                    />
                  </Campo>
                </div>
              </div>

              <label className="mt-5 flex cursor-pointer items-start gap-2 text-xs text-ceniza">
                <input
                  type="checkbox"
                  checked={acepta}
                  onChange={(e) => setAcepta(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-turquesa"
                />
                <span>
                  Acepto el{" "}
                  <Enlace href={terminos?.acceptanceUrl}>reglamento de Wompi</Enlace> y la{" "}
                  <Enlace href={terminos?.personalDataUrl}>
                    autorización de tratamiento de datos
                  </Enlace>
                  .
                </span>
              </label>

              <button
                onClick={pagar}
                disabled={!puedePagar}
                className="mt-5 w-full bg-turquesa py-3 font-display text-sm text-grafito transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-30"
                style={{ clipPath: "polygon(10px 0, 100% 0, 100% 100%, 0 100%, 0 10px)" }}
              >
                Pagar {formatCOP(plan.priceCOP)}
              </button>

              <Perforacion className="my-5 text-ceniza/40" />

              <p className="text-center text-[11px] leading-relaxed text-ceniza/70">
                Pago procesado por Wompi. Tu tarjeta se cifra en este
                navegador y nunca pasa por nuestro servidor. La recarga se
                coordina por correo en menos de {HORAS_DE_ENTREGA} horas
                tras la aprobación.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const inputCls =
  "mt-1 w-full border border-ceniza/20 bg-grafito px-3 py-2 text-sm text-hielo outline-none transition placeholder:text-ceniza/40 focus-visible:border-turquesa";

function Campo({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="font-mono text-[11px] uppercase tracking-wide text-ceniza">{etiqueta}</span>
      {children}
    </label>
  );
}

function Enlace({ href, children }: { href?: string; children: ReactNode }) {
  if (!href) return <span>{children}</span>;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-turquesa underline underline-offset-2">
      {children}
    </a>
  );
}

function ReferenciaConCopia({
  referencia,
  copiado,
  onCopiar,
}: {
  referencia: string;
  copiado: boolean;
  onCopiar: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 border border-ceniza/20 bg-grafito px-3 py-2">
      <span className="truncate font-mono text-xs text-hielo">{referencia}</span>
      <button
        onClick={onCopiar}
        className="shrink-0 font-mono text-[10px] uppercase tracking-wide text-turquesa hover:brightness-110"
      >
        {copiado ? "Copiado" : "Copiar"}
      </button>
    </div>
  );
}

function ResultadoAprobado({
  email,
  referencia,
  transactionId,
  copiado,
  onCopiar,
  onCerrar,
}: {
  email: string;
  referencia: string;
  transactionId: string;
  copiado: boolean;
  onCopiar: () => void;
  onCerrar: () => void;
}) {
  const asunto = encodeURIComponent(`Recarga PinFire — ${referencia}`);
  return (
    <div>
      <div className="flex items-center gap-2 text-turquesa">
        <IconoSello className="h-6 w-6" />
        <p className="font-display text-base">Pago aprobado</p>
      </div>
      <p className="mt-2 text-sm text-ceniza">
        Recibimos tu pago. Nos comunicaremos contigo a este correo para
        coordinar la entrega en menos de {HORAS_DE_ENTREGA} horas, y te
        pediremos el UID de tu cuenta de Free Fire.
      </p>

      <dl className="mt-4 space-y-3 font-mono text-xs">
        <div>
          <dt className="text-ceniza">Correo registrado</dt>
          <dd className="mt-1 text-hielo">{email}</dd>
        </div>
        <div>
          <dt className="text-ceniza">Referencia</dt>
          <dd className="mt-1">
            <ReferenciaConCopia referencia={referencia} copiado={copiado} onCopiar={onCopiar} />
          </dd>
        </div>
        <div>
          <dt className="text-ceniza">ID de transacción Wompi</dt>
          <dd className="mt-1 truncate text-hielo">{transactionId}</dd>
        </div>
      </dl>

      <a
        href={`mailto:${CORREO_CONTACTO}?subject=${asunto}`}
        className="mt-5 block w-full border border-ceniza/25 py-2.5 text-center font-display text-sm text-hielo transition hover:border-ceniza/50"
      >
        Escribir a {CORREO_CONTACTO}
      </a>
      <p className="mt-2 text-center text-[11px] text-ceniza/70">
        Úsalo si no te hemos contactado dentro del plazo indicado.
      </p>

      <button onClick={onCerrar} className="mt-4 w-full bg-ceniza/10 py-2.5 font-display text-sm text-hielo hover:bg-ceniza/20">
        Cerrar
      </button>
    </div>
  );
}

/** Fases técnicas (expirado / sin-confirmar): rótulos neutros, siempre con la referencia visible. */
function ResultadoTecnico({
  titulo,
  detalle,
  referencia,
  copiado,
  onCopiar,
  onCerrar,
  accionSecundaria,
}: {
  titulo: string;
  detalle: string;
  referencia: string;
  copiado: boolean;
  onCopiar: () => void;
  onCerrar: () => void;
  accionSecundaria?: { texto: string; onClick: () => void };
}) {
  const asunto = encodeURIComponent(`Recarga PinFire — ${referencia}`);
  return (
    <div>
      <p className="font-display text-base text-hielo">{titulo}</p>
      <p className="mt-2 text-sm text-ceniza">{detalle}</p>

      <div className="mt-4">
        <p className="font-mono text-[11px] uppercase tracking-wide text-ceniza">Tu referencia</p>
        <div className="mt-1">
          <ReferenciaConCopia referencia={referencia} copiado={copiado} onCopiar={onCopiar} />
        </div>
      </div>

      <a
        href={`mailto:${CORREO_CONTACTO}?subject=${asunto}`}
        className="mt-5 block w-full border border-ceniza/25 py-2.5 text-center font-display text-sm text-hielo transition hover:border-ceniza/50"
      >
        Escribir a {CORREO_CONTACTO}
      </a>

      {accionSecundaria && (
        <button onClick={accionSecundaria.onClick} className="mt-3 w-full text-center font-mono text-xs text-ceniza underline underline-offset-2 hover:text-hielo">
          {accionSecundaria.texto}
        </button>
      )}

      <button onClick={onCerrar} className="mt-4 w-full bg-ceniza/10 py-2.5 font-display text-sm text-hielo hover:bg-ceniza/20">
        Cerrar
      </button>
    </div>
  );
}

/** Rechazo bancario normal vs. fallo técnico (rótulo "Resultado del intento" / "Detalle del resultado"). */
function ResultadoRechazo({
  tecnico,
  mensaje,
  hint,
  referencia,
  onReintentar,
}: {
  tecnico: boolean;
  mensaje: string;
  hint?: string;
  referencia: string | null;
  onReintentar: () => void;
}) {
  return (
    <div>
      <p className="font-display text-base text-magenta">
        {tecnico ? "Resultado del intento" : "Pago no aprobado"}
      </p>
      <div className="mt-3 border border-magenta/30 bg-magenta/5 p-3">
        {tecnico && (
          <p className="font-mono text-[10px] uppercase tracking-wide text-ceniza">Detalle del resultado</p>
        )}
        <p className="mt-1 text-sm text-hielo">{mensaje}</p>
        {hint && <p className="mt-2 text-xs text-ceniza">{hint}</p>}
      </div>
      {referencia && (
        <p className="mt-3 font-mono text-[11px] text-ceniza/70">Referencia: {referencia}</p>
      )}
      <button
        onClick={onReintentar}
        className="mt-4 w-full bg-turquesa py-2.5 font-display text-sm text-grafito hover:brightness-110"
      >
        Intentar de nuevo
      </button>
    </div>
  );
}
