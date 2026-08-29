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
      <div className="mb-8 flex items-end justify-between">
        <h2 className="font-display text-3xl uppercase tracking-tight sm:text-4xl">
          Shop by Category
        </h2>
        <div className="flex items-center gap-3">
          <Link
            href="/products"
            className="hidden text-sm font-semibold uppercase tracking-wide text-accent sm:block"
          >
            Lihat semua →
          </Link>
          <div className="hidden gap-2 sm:flex">
            <button
              type="button"
              aria-label="Sebelumnya"
              onClick={() => scrollByDir(-1)}
              disabled={!canScrollLeft}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-25"
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="Berikutnya"
              onClick={() => scrollByDir(1)}
              disabled={!canScrollRight}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-25"
            >
              ›
            </button>
          </div>
        </div>
      </div>

      <div className="relative">
        <div
          ref={scrollerRef}
          onScroll={updateScrollState}
          className="scrollbar-hide flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2"
        >
          {categories.map((cat, i) => (
            <Link
              key={cat.name}
              href={`/products?category=${encodeURIComponent(cat.name)}`}
              className="group relative flex aspect-[3/4] w-[64%] shrink-0 snap-start overflow-hidden rounded-2xl border border-border shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-accent hover:shadow-xl sm:w-[31%] lg:w-[23%]"
            >
              <Image
                src={cat.image}
                alt={cat.name}
                fill
                sizes="(max-width: 640px) 60vw, (max-width: 1024px) 30vw, 23vw"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
              <span className="absolute right-4 top-4 font-display text-xs text-white/60">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="relative mt-auto p-4">
                <h3 className="font-display text-lg uppercase leading-tight text-white sm:text-xl">
                  {cat.name}
                </h3>
                <p className="mt-1 hidden text-xs text-white/70 sm:block">{cat.blurb}</p>
              </div>
            </Link>
          ))}
        </div>
        <div className="pointer-events-none absolute inset-y-0 right-0 w-14 bg-gradient-to-l from-background to-transparent" />
      </div>
    </section>
  );
}
