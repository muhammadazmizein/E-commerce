"use client";

import { useRef } from "react";
import type { Product } from "@/lib/products";
import ProductCard from "@/components/ProductCard";

export default function RelatedProducts({ products }: { products: Product[] }) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  if (products.length === 0) return null;

  function scrollByAmount(amount: number) {
    scrollerRef.current?.scrollBy({ left: amount, behavior: "smooth" });
  }

  return (
    <section className="mt-16 border-t border-border pt-10">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="font-display text-xl uppercase tracking-tight sm:text-2xl">
          Rekomendasi Produk Lainnya
        </h2>
        <div className="hidden gap-2 sm:flex">
          <button
            aria-label="Geser ke kiri"
            onClick={() => scrollByAmount(-320)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:border-accent hover:text-accent"
          >
            ‹
          </button>
          <button
            aria-label="Geser ke kanan"
            onClick={() => scrollByAmount(320)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:border-accent hover:text-accent"
          >
            ›
          </button>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {products.map((p) => (
          <div key={p.id} className="w-[min(70vw,220px)] flex-none snap-start sm:w-[240px]">
            <ProductCard product={p} />
          </div>
        ))}
      </div>
    </section>
  );
}
