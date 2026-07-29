"use client";

import { useState } from "react";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import TrustBar from "@/components/TrustBar";
import ProductCard from "@/components/ProductCard";
import CheckoutPanel from "@/components/CheckoutPanel";
import Footer from "@/components/Footer";
import { packages, type PinPackage } from "@/lib/products";

export default function Home() {
  const [selected, setSelected] = useState<PinPackage | null>(null);

  return (
    <>
      <Header />
      <main>
        <Hero />
        <TrustBar />

        <section id="paquetes" className="mx-auto max-w-5xl px-6 py-16">
          <h2 className="font-display text-2xl font-bold">Elige tu paquete</h2>
          <p className="mt-2 text-sm text-mist">
            Pagas con tarjeta o Nequi aquí mismo. No te enviamos a ningún otro sitio.
          </p>

          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {packages.map((pkg) => (
              <ProductCard key={pkg.id} pkg={pkg} onSelect={setSelected} />
            ))}
          </div>
        </section>
      </main>
      <Footer />

      {selected && (
        <CheckoutPanel pkg={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}
