"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import type { Product } from "@/lib/products";
import { formatIDR } from "@/lib/products";

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

export default function FeaturedDropsScroller({
  drops,
  kicker,
  title,
  releaseLabel,
  scrollLeftLabel,
  scrollRightLabel,
}: {
  drops: Product[];
  kicker: string;
  title: string;
  releaseLabel: string;
  scrollLeftLabel: string;
  scrollRightLabel: string;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  function scrollByAmount(amount: number) {
    scrollerRef.current?.scrollBy({ left: amount, behavior: "smooth" });
  }

  return (
    <>
      <div className="mx-auto flex max-w-7xl items-end justify-between px-4 sm:px-6 lg:px-8">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
            <span className="h-px w-6 bg-red-600" />
            {kicker}
          </p>
          <h2 className="mt-2 font-[family-name:var(--font-editorial)] text-2xl uppercase tracking-wide text-white sm:text-3xl">
            {title}
          </h2>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            aria-label={scrollLeftLabel}
            onClick={() => scrollByAmount(-480)}
            className="btn-tag flex h-9 w-9 items-center justify-center border border-white/30 bg-transparent text-white transition-colors hover:border-white"
          >
            <ArrowIcon direction="left" />
          </button>
          <button
            aria-label={scrollRightLabel}
            onClick={() => scrollByAmount(480)}
            className="btn-tag flex h-9 w-9 items-center justify-center border border-white/30 bg-transparent text-white transition-colors hover:border-white"
          >
            <ArrowIcon direction="right" />
          </button>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 scroll-pl-4 scrollbar-hide sm:px-6 sm:scroll-pl-6 lg:mx-auto lg:max-w-7xl lg:px-8 lg:scroll-pl-8"
      >
        {drops.map((product) => (
          <Link
            key={product.id}
            href={`/product/${product.id}`}
            className="group w-full flex-none snap-start sm:w-[280px]"
          >
            <div className="relative aspect-square overflow-hidden bg-surface-2">
              <span className="absolute left-3 top-3 z-10 bg-red-800 px-3.5 py-2 text-[11px] font-bold uppercase tracking-wide text-white">
                {releaseLabel}
              </span>
              <Image
                src={product.image}
                alt={product.name}
                fill
                sizes="(max-width: 640px) 240px, 280px"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </div>
            <p className="mt-3 text-sm font-semibold uppercase leading-snug text-white">{product.name}</p>
            <p className="mt-1 font-mono text-sm text-white/60">{formatIDR(product.price)}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
