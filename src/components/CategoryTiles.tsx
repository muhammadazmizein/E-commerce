"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Category } from "@/lib/api";

export default function CategoryTiles({ categories }: { categories: Category[] }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  function updateScrollState() {
    const el = scrollerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }

  useEffect(() => {
    updateScrollState();
  }, [categories]);

  function scrollByDir(dir: 1 | -1) {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: el.clientWidth * 0.8 * dir, behavior: "smooth" });
  }

  if (categories.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-3 border-b-2 border-border pb-5 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
        <h2 className="font-display text-2xl uppercase tracking-tight sm:text-3xl lg:text-4xl">
          Shop by Category
        </h2>
        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <Link
            href="/products"
            className="text-xs font-bold uppercase tracking-widest text-accent"
          >
            Lihat semua →
          </Link>
          <div className="flex gap-2">
            <button
              type="button"
              aria-label="Sebelumnya"
              onClick={() => scrollByDir(-1)}
              disabled={!canScrollLeft}
              className="btn-tag flex h-9 w-9 items-center justify-center border-2 border-border text-foreground transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-25"
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="Berikutnya"
              onClick={() => scrollByDir(1)}
              disabled={!canScrollRight}
              className="btn-tag flex h-9 w-9 items-center justify-center border-2 border-border text-foreground transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-25"
            >
              ›
            </button>
          </div>
        </div>
      </div>

      <div
        ref={scrollerRef}
        onScroll={updateScrollState}
        className="scrollbar-hide flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2"
      >
        {categories.map((cat, i) => (
            <Link
              key={cat.name}
              href={`/products?category=${encodeURIComponent(cat.name)}`}
              className="clip-tag group relative flex aspect-square w-[42%] shrink-0 snap-start overflow-hidden border-2 border-border shadow-edge transition-all duration-300 hover:-translate-y-1 hover:border-accent hover:shadow-edge-lg sm:aspect-[3/4] sm:w-[31%] lg:w-[23%]"
            >
              <Image
                src={cat.image}
                alt={cat.name}
                fill
                sizes="(max-width: 640px) 42vw, (max-width: 1024px) 30vw, 23vw"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
              <span className="absolute right-3 top-3 font-display text-xs text-white/60 sm:right-4 sm:top-4">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="relative mt-auto p-3 sm:p-4">
                <h3 className="font-display text-sm uppercase leading-tight text-white sm:text-xl">
                  {cat.name}
                </h3>
                <p className="mt-1 hidden text-xs text-white/70 sm:block">{cat.blurb}</p>
              </div>
            </Link>
        ))}
      </div>
    </section>
  );
}
