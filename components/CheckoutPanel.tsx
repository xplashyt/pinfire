"use client";

import { useEffect, useRef, useState } from "react";
import { formatCOP, type PinPackage } from "@/lib/products";
import { buildReference, sanitizePlayerId } from "@/lib/orders";
import {
  detectBrand,
  formatCardNumber,
  formatExpiry,
  tokenizeCard,
} from "@/lib/wompi-client";

type Metodo = "CARD" | "NEQUI";
type Fase = "form" | "procesando" | "aprobado" | "rechazado" | "expirado";

const CUOTAS = [1, 2, 3, 6, 12, 18, 24, 36];

// Cada cuánto le preguntamos a Wompi por el estado, y hasta cuándo.
// El push de Nequi le da al cliente varios minutos para aceptarlo en su
// celular, así que la espera tiene que ser generosa.
const INTERVALO_MS = 2500;
const ESPERA_MAX_MS = 5 * 60 * 1000;

export default function CheckoutPanel({
  pkg,
  onClose,
}: {
  pkg: PinPackage;
  onClose: () => void;
}) {
  const [metodo, setMetodo] = useState<Metodo>("CARD");
  const [fase, setFase] = useState<Fase>("form");
  const [error, setError] = useState<string | null>(null);
  const [mensajeEspera, setMensajeEspera] = useState("");

  const [playerId, setPlayerId] = useState("");
  const [email, setEmail] = useState("");
  const [acepta, setAcepta] = useState(false);

  const [numero, setNumero] = useState("");
  const [vence, setVence] = useState("");
  const [cvc, setCvc] = useState("");
  const [titular, setTitular] = useState("");
  const [cuotas, setCuotas] = useState(1);

  const [celular, setCelular] = useState("");

  const [terminos, setTerminos] = useState<{
    acceptanceUrl: string;
    personalDataUrl: string;
  } | null>(null);

  // El polling tiene que morir si el usuario cierra el panel a mitad del
  // pago; si no, seguiría corriendo contra un componente desmontado.
  const cancelado = useRef(false);
  useEffect(() => () => {
    cancelado.current = true;
  }, []);

  useEffect(() => {
    fetch("/api/wompi/acceptance")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && !d.error && setTerminos(d))
      .catch(() => {
        /* Sin los enlaces el pago igual funciona; no vale bloquear la compra. */
      });
  }, []);

  const marca = detectBrand(numero);

  const datosComunesOk = playerId.length >= 5 && /\S+@\S+\.\S+/.test(email) && acepta;

  const tarjetaOk =
    numero.replace(/\D/g, "").length >= 13 &&
    /^\d{2}\/\d{2}$/.test(vence) &&
    cvc.length >= 3 &&
    titular.trim().length >= 5;

  const nequiOk = /^3\d{9}$/.test(celular.replace(/\D/g, ""));

  const puedePagar =
    datosComunesOk && (metodo === "CARD" ? tarjetaOk : nequiOk);

  async function esperarResultado(id: string) {
    const limite = Date.now() + ESPERA_MAX_MS;

    while (Date.now() < limite) {
      if (cancelado.current) return;

      await new Promise((r) => setTimeout(r, INTERVALO_MS));
      if (cancelado.current) return;

      const res = await fetch(`/api/wompi/status/${id}`);
      if (!res.ok) continue; // Un fallo puntual de red no debe abortar la espera.

      const tx = await res.json();

      if (tx.status === "APPROVED") return setFase("aprobado");

      if (tx.status === "DECLINED" || tx.status === "ERROR" || tx.status === "VOIDED") {
        setError(tx.statusMessage || null);
        return setFase("rechazado");
      }
    }

    // Se agotó la espera pero la transacción puede seguir viva en Wompi.
    // No decimos "falló": decimos que ya no estamos mirando.
    setFase("expirado");
  }

  async function pagar() {
    setError(null);
    setFase("procesando");

    try {
      const reference = buildReference(pkg.id, playerId);

      const payload: Record<string, unknown> = {
        reference,
        email,
        method: metodo,
        acceptedTerms: acepta,
      };

      if (metodo === "CARD") {
        setMensajeEspera("Validando tu tarjeta…");
        // El número de tarjeta va del navegador directo a Wompi. Nuestro
        // servidor solo verá el token que devuelve.
        const [mes, anio] = vence.split("/");
        const token = await tokenizeCard({
          number: numero,
          expMonth: mes,
          expYear: anio,
          cvc,
          cardHolder: titular.trim(),
        });
        payload.cardToken = token.id;
        payload.installments = cuotas;
      } else {
        payload.phoneNumber = celular.replace(/\D/g, "");
      }

      setMensajeEspera(
        metodo === "NEQUI"
          ? "Te enviamos una notificación a Nequi. Ábrela y aprueba el pago."
          : "Procesando el pago con tu banco…"
      );

      const res = await fetch("/api/wompi/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "No pudimos iniciar el pago");

      if (data.status === "APPROVED") return setFase("aprobado");
      if (data.status === "DECLINED" || data.status === "ERROR") {
        setError(data.statusMessage || null);
        return setFase("rechazado");
      }

      await esperarResultado(data.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Algo salió mal");
      setFase("rechazado");
    }
  }

  function reintentar() {
    setError(null);
    setFase("form");
  }

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end bg-black/50"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex h-full w-full max-w-md flex-col overflow-y-auto bg-surface p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Completa tu compra</h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-full p-2 text-mist transition hover:bg-white/10 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="mt-6 rounded-xl border border-white/10 bg-surface2 p-4">
          <p className="font-display font-semibold">
            {pkg.diamonds.toLocaleString("es-CO")} diamantes
            {pkg.bonus > 0 && <span className="text-teal"> +{pkg.bonus} bono</span>}
          </p>
          <p className="mt-1 font-display text-gold">{formatCOP(pkg.priceCOP)}</p>
        </div>

        {fase === "aprobado" && (
          <Resultado
            tono="teal"
            titulo="¡Pago aprobado!"
            texto="Ya recibimos tu pago. Estamos recargando los diamantes en tu cuenta de Free Fire; te llegan en pocos minutos."
            accion={{ texto: "Cerrar", onClick: onClose }}
          />
        )}

        {fase === "expirado" && (
          <Resultado
            tono="gold"
            titulo="Seguimos esperando la confirmación"
            texto="El pago sigue en proceso en Wompi. Si se aprueba, recibirás tus diamantes igual, aunque cierres esta ventana. Revisa tu correo."
            accion={{ texto: "Cerrar", onClick: onClose }}
          />
        )}

        {fase === "rechazado" && (
          <Resultado
            tono="coral"
            titulo="No pudimos completar el pago"
            texto={
              error ||
              "El pago fue rechazado. Puedes intentar con otra tarjeta u otro medio de pago."
            }
            accion={{ texto: "Intentar de nuevo", onClick: reintentar }}
          />
        )}

        {fase === "procesando" && (
          <div className="mt-8 flex flex-col items-center gap-4 text-center">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-gold" />
            <p className="text-sm text-mist">{mensajeEspera}</p>
            {metodo === "NEQUI" && (
              <p className="text-xs text-mist/70">
                No cierres esta ventana. La notificación puede tardar hasta un minuto.
              </p>
            )}
          </div>
        )}

        {fase === "form" && (
          <>
            <div className="mt-6 space-y-4">
              <Campo etiqueta="ID de jugador (UID) de Free Fire">
                <input
                  value={playerId}
                  onChange={(e) => setPlayerId(sanitizePlayerId(e.target.value))}
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="Ej: 123456789"
                  className={inputCls}
                />
              </Campo>
              <Campo etiqueta="Correo para tu recibo">
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  autoComplete="email"
                  placeholder="tucorreo@ejemplo.com"
                  className={inputCls}
                />
              </Campo>
            </div>

            <div className="mt-6">
              <p className="text-sm text-mist">Medio de pago</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {(
                  [
                    ["CARD", "Tarjeta"],
                    ["NEQUI", "Nequi"],
                  ] as [Metodo, string][]
                ).map(([valor, texto]) => (
                  <button
                    key={valor}
                    type="button"
                    onClick={() => setMetodo(valor)}
                    aria-pressed={metodo === valor}
                    className={`rounded-lg border py-2 text-sm font-medium transition ${
                      metodo === valor
                        ? "border-gold bg-gold/10 text-gold"
                        : "border-white/10 bg-ink text-mist hover:border-white/25"
                    }`}
                  >
                    {texto}
                  </button>
                ))}
              </div>
            </div>

            {metodo === "CARD" ? (
              <div className="mt-4 space-y-4">
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
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-mist">
                        {marca}
                      </span>
                    )}
                  </div>
                </Campo>

                <div className="grid grid-cols-2 gap-3">
                  <Campo etiqueta="Vence (MM/AA)">
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

                <Campo etiqueta="Nombre como aparece en la tarjeta">
                  <input
                    value={titular}
                    onChange={(e) => setTitular(e.target.value)}
                    autoComplete="cc-name"
                    placeholder="PEDRO PÉREZ"
                    className={inputCls}
                  />
                </Campo>

                <Campo etiqueta="Cuotas">
                  <select
                    value={cuotas}
                    onChange={(e) => setCuotas(Number(e.target.value))}
                    className={inputCls}
                  >
                    {CUOTAS.map((n) => (
                      <option key={n} value={n} className="bg-ink">
                        {n === 1 ? "1 cuota" : `${n} cuotas`}
                      </option>
                    ))}
                  </select>
                </Campo>
              </div>
            ) : (
              <div className="mt-4">
                <Campo etiqueta="Celular registrado en Nequi">
                  <input
                    value={celular}
                    onChange={(e) => setCelular(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    inputMode="tel"
                    autoComplete="tel-national"
                    placeholder="3001234567"
                    className={inputCls}
                  />
                </Campo>
                <p className="mt-2 text-xs text-mist/70">
                  Te llegará una notificación a la app de Nequi para aprobar el pago.
                </p>
              </div>
            )}

            <label className="mt-5 flex cursor-pointer items-start gap-2 text-xs text-mist">
              <input
                type="checkbox"
                checked={acepta}
                onChange={(e) => setAcepta(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-gold"
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

            {error && <p className="mt-4 text-sm text-coral">{error}</p>}

            <button
              onClick={pagar}
              disabled={!puedePagar}
              className="mt-5 w-full rounded-full bg-gold py-3 font-display font-semibold text-ink transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Pagar {formatCOP(pkg.priceCOP)}
            </button>

            <p className="mt-3 text-center text-xs text-mist/60">
              Pago procesado por Wompi (Grupo Bancolombia). Tus datos de tarjeta
              viajan cifrados directamente a Wompi.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

const inputCls =
  "mt-1 w-full rounded-lg border border-white/10 bg-ink px-3 py-2 text-sm outline-none transition placeholder:text-mist/40 focus:border-gold";

function Campo({
  etiqueta,
  children,
}: {
  etiqueta: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm text-mist">{etiqueta}</span>
      {children}
    </label>
  );
}

function Enlace({ href, children }: { href?: string; children: React.ReactNode }) {
  if (!href) return <span className="text-mist">{children}</span>;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-gold underline underline-offset-2"
    >
      {children}
    </a>
  );
}

function Resultado({
  tono,
  titulo,
  texto,
  accion,
}: {
  tono: "teal" | "coral" | "gold";
  titulo: string;
  texto: string;
  accion: { texto: string; onClick: () => void };
}) {
  const tonos = {
    teal: "border-teal/40 bg-teal/10 text-teal",
    coral: "border-coral/40 bg-coral/10 text-coral",
    gold: "border-gold/40 bg-gold/10 text-gold",
  } as const;

  return (
    <div className="mt-6">
      <div className={`rounded-xl border p-4 ${tonos[tono]}`}>
        <p className="font-display font-semibold">{titulo}</p>
        <p className="mt-1 text-sm opacity-90">{texto}</p>
      </div>
      <button
        onClick={accion.onClick}
        className="mt-4 w-full rounded-full border border-white/15 py-3 font-display font-semibold text-white transition hover:bg-white/5"
      >
        {accion.texto}
      </button>
    </div>
  );
}
