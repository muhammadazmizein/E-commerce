"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { Banner } from "@/lib/api";

export default function Banners({ banners }: { banners: Banner[] }) {
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
  }, [banners]);

  function scrollByDir(dir: 1 | -1) {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: el.clientWidth * 0.85 * dir, behavior: "smooth" });
  }

  if (banners.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-4 flex items-center justify-end gap-2 sm:hidden">
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

      <div
        ref={scrollerRef}
        onScroll={updateScrollState}
        className="scrollbar-hide flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth sm:grid sm:grid-cols-3 sm:overflow-visible"
      >
        {banners.map((banner) => (
          <a
            key={banner.id}
            href={banner.ctaHref ?? "#products"}
            className="clip-tag group relative flex aspect-[4/3] w-[72%] shrink-0 snap-start overflow-hidden border-2 border-border shadow-edge transition-all duration-300 hover:-translate-y-1 hover:border-accent hover:shadow-edge-lg sm:aspect-[3/4] sm:w-auto sm:shrink"
          >
            <Image
              src={banner.image}
              alt={banner.title}
              fill
              sizes="(max-width: 640px) 70vw, 33vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
            <div className="relative mt-auto flex flex-col gap-2 p-4 sm:p-5">
              <h3 className="font-display text-lg uppercase leading-tight text-white sm:text-2xl">
                {banner.title}
              </h3>
              {banner.subtitle && (
                <p className="max-w-xs text-xs text-white/75 sm:text-sm">{banner.subtitle}</p>
              )}
              {banner.ctaLabel && (
                <span className="btn-tag mt-1 inline-flex w-fit items-center gap-1.5 bg-accent px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wide text-accent-foreground transition-transform group-hover:translate-x-1 sm:px-4 sm:py-2 sm:text-xs">
                  {banner.ctaLabel} →
                </span>
              )}
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
