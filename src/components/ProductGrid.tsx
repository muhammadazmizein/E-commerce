"use client";

import { useMemo, useState } from "react";
import ProductCard from "./ProductCard";
import type { Product } from "@/lib/products";

export default function ProductGrid({ products }: { products: Product[] }) {
  const filters = useMemo(
    () => ["Semua", ...Array.from(new Set(products.map((p) => p.category)))],
    [products]
  );
  const [active, setActive] = useState<string>("Semua");

  const filtered =
    active === "Semua" ? products : products.filter((p) => p.category === active);

  return (
    <section id="products" className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-accent">
            New Drop
          </span>
          <h2 className="mt-1 font-display text-3xl uppercase tracking-tight sm:text-4xl">
            Semua Produk
          </h2>
        </div>

        <div className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setActive(f)}
              className={`rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-wide transition-colors ${
                active === f
                  ? "border-accent bg-accent text-accent-foreground"
                  : "border-border text-muted hover:border-accent hover:text-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-2xl border border-border bg-surface px-4 py-10 text-center text-sm text-muted">
          Produk belum bisa dimuat. Coba refresh beberapa saat lagi.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </section>
  );
}
