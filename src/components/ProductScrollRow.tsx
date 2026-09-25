"use client";

import { useRef } from "react";
import ProductCard from "@/components/ProductCard";
import type { Product } from "@/lib/products";

function ArrowIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path
        d={direction === "left" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function ProductScrollRow({ products }: { products: Product[] }) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  function scrollByAmount(amount: number) {
    scrollerRef.current?.scrollBy({ left: amount, behavior: "smooth" });
  }

  if (products.length === 0) return null;

  return (
    <section className="pt-8 pb-16 sm:pt-10 sm:pb-20">
      <div className="group relative">
        <div
          ref={scrollerRef}
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 pl-4 scroll-pl-4 scrollbar-hide sm:pl-6 sm:scroll-pl-6 lg:pl-8 lg:scroll-pl-8"
        >
          {products.map((product) => (
            <div key={product.id} className="w-[calc((100%-16px)/2)] flex-none snap-start sm:w-[380px] lg:w-[480px]">
              <ProductCard product={product} centered />
            </div>
          ))}
        </div>

        <button
          type="button"
          aria-label="Scroll left"
          onClick={() => scrollByAmount(-480)}
          className="absolute left-16 top-[40%] z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100 hover:opacity-80 sm:left-24 lg:left-32"
        >
          <ArrowIcon direction="left" />
        </button>
        <button
          type="button"
          aria-label="Scroll right"
          onClick={() => scrollByAmount(480)}
          className="absolute right-16 top-[40%] z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100 hover:opacity-80 sm:right-24 lg:right-32"
        >
          <ArrowIcon direction="right" />
        </button>
      </div>
    </section>
  );
}
