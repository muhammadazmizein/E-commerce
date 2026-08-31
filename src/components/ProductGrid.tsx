"use client";

import { useMemo, useRef, useState } from "react";
import ProductCard from "./ProductCard";
import Pagination from "@/components/Pagination";
import type { Product } from "@/lib/products";

const PAGE_SIZE = 12;

export default function ProductGrid({ products }: { products: Product[] }) {
  const filters = useMemo(
    () => ["Semua", ...Array.from(new Set(products.map((p) => p.category)))],
    [products]
  );
  const [active, setActive] = useState<string>("Semua");
  const [page, setPage] = useState(1);
  const sectionRef = useRef<HTMLElement>(null);

  const filtered =
    active === "Semua" ? products : products.filter((p) => p.category === active);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleFilterChange(f: string) {
    setActive(f);
    setPage(1);
  }

  function handlePageChange(next: number) {
    setPage(next);
    sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <section ref={sectionRef} id="products" className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-6 border-b-2 border-border pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="btn-tag inline-block border-2 border-accent px-2 py-0.5 text-xs font-bold uppercase tracking-widest text-accent">
            New Drop
          </span>
          <h2 className="mt-3 font-display text-3xl uppercase tracking-tight sm:text-4xl">
            Semua Produk
          </h2>
        </div>

        <div className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => handleFilterChange(f)}
              className={`btn-tag border-2 px-4 py-2 text-xs font-bold uppercase tracking-wide transition-colors ${
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
        <p className="border-2 border-border bg-surface px-4 py-10 text-center text-sm text-muted">
          Produk belum bisa dimuat. Coba refresh beberapa saat lagi.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
            {paged.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
        </>
      )}
    </section>
  );
}
