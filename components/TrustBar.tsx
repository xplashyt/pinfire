const items = [
  { title: "Entrega inmediata", detail: "Tus diamantes llegan apenas se confirma el pago" },
  { title: "Pago seguro con Wompi", detail: "Tarjeta y Nequi, sin salir de la página" },
  { title: "Soporte por WhatsApp", detail: "Te ayudamos si algo no llega como esperabas" },
];

export default function TrustBar() {
  return (
    <section id="como-funciona" className="border-y border-white/5 bg-surface/40">
      <div className="mx-auto grid max-w-5xl gap-6 px-6 py-10 sm:grid-cols-3">
        {items.map((item) => (
          <div key={item.title}>
            <p className="font-display text-sm font-semibold text-gold">{item.title}</p>
            <p className="mt-1 text-sm text-mist">{item.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
