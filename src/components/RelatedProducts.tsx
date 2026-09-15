"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import type { Product } from "@/lib/products";
import ProductCard from "@/components/ProductCard";

function ArrowIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path
        d={direction === "left" ? "M12 4l-6 6 6 6" : "M8 4l6 6-6 6"}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function RelatedProducts({ products }: { products: Product[] }) {
  const t = useTranslations("relatedProducts");
  const scrollerRef = useRef<HTMLDivElement>(null);

  if (products.length === 0) return null;

  function scrollByAmount(amount: number) {
    scrollerRef.current?.scrollBy({ left: amount, behavior: "smooth" });
  }

  return (
    <section className="mt-16 border-t border-border pt-10">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="font-display text-xl uppercase tracking-wide sm:text-2xl">
          <span className="text-accent">/</span> {t("title")}
        </h2>
        <div className="hidden gap-2 sm:flex">
          <button
            aria-label={t("scrollLeft")}
            onClick={() => scrollByAmount(-480)}
            className="btn-tag flex h-9 w-9 shrink-0 items-center justify-center border border-border bg-surface text-foreground transition-colors hover:border-accent hover:text-accent sm:h-10 sm:w-10"
          >
            <ArrowIcon direction="left" />
          </button>
          <button
            aria-label={t("scrollRight")}
            onClick={() => scrollByAmount(480)}
            className="btn-tag flex h-9 w-9 shrink-0 items-center justify-center border border-border bg-surface text-foreground transition-colors hover:border-accent hover:text-accent sm:h-10 sm:w-10"
          >
            <ArrowIcon direction="right" />
          </button>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="grid grid-cols-2 gap-4 sm:-mx-4 sm:flex sm:snap-x sm:snap-mandatory sm:gap-4 sm:overflow-x-auto sm:scroll-smooth sm:px-4 sm:pb-2 sm:scroll-pl-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {products.map((p) => (
          <div key={p.id} className="sm:w-[240px] sm:flex-none sm:snap-start">
            <ProductCard product={p} variant="compact" />
          </div>
        ))}
      </div>
    </section>
  );
}
