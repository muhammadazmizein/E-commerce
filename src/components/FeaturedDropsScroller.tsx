"use client";

import Image from "next/image";
import Link from "next/link";
import { Cinzel, Inter, Space_Mono } from "next/font/google";
import { useEffect, useRef } from "react";
import type { Product } from "@/lib/products";
import { formatIDR } from "@/lib/products";

const spaceMono = Space_Mono({ subsets: ["latin"], weight: ["400"] });
const cinzel = Cinzel({ subsets: ["latin"], weight: ["700"] });
const inter = Inter({ subsets: ["latin"], weight: ["400"] });

function ArrowIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
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
  const thumbRef = useRef<HTMLDivElement>(null);

  function scrollByAmount(amount: number) {
    scrollerRef.current?.scrollBy({ left: amount, behavior: "smooth" });
  }

  useEffect(() => {
    const el = scrollerRef.current;
    const thumb = thumbRef.current;
    if (!el || !thumb) return;

    function update() {
      if (!el || !thumb) return;
      const { scrollLeft, scrollWidth, clientWidth } = el;
      const widthPercent = Math.min(100, (clientWidth / scrollWidth) * 100);
      const maxScroll = scrollWidth - clientWidth;
      const progress = maxScroll > 0 ? scrollLeft / maxScroll : 0;
      thumb.style.width = `${widthPercent}%`;
      thumb.style.left = `${progress * (100 - widthPercent)}%`;
    }

    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [drops]);

  return (
    <>
      <div className="mx-auto max-w-[1400px] px-6">
        <p className="mb-[6px] flex items-center gap-2 uppercase tracking-[0.2em]">
          <span className="h-px w-6 bg-red-600" />
          <span className={`${spaceMono.className} text-[10px] text-[#888888]`}>{kicker}</span>
        </p>
        <h2 className={`${cinzel.className} text-[28px] uppercase tracking-wide text-white`}>
          {title}
        </h2>
      </div>

      <div
        ref={scrollerRef}
        className="mx-auto mt-6 flex max-w-[1400px] snap-x snap-mandatory gap-2 overflow-x-auto pb-2 pl-6 scroll-pl-6 scrollbar-hide"
      >
        {drops.map((product) => (
          <Link
            key={product.id}
            href={`/product/${product.id}`}
            className="group w-[88%] flex-none snap-start sm:w-[calc((100%-16px)/3)] lg:w-[calc((100%-24px)/4)]"
          >
            <div className="relative aspect-square overflow-hidden bg-white">
              <span
                className={`${spaceMono.className} absolute left-3 top-3 z-10 bg-[#C8102E] px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-white`}
              >
                {releaseLabel}
              </span>
              <div className="absolute inset-4">
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  sizes="(max-width: 640px) 88vw, (max-width: 1024px) 33vw, 25vw"
                  className="object-contain transition-transform duration-500 group-hover:scale-105"
                />
              </div>
            </div>
            <p className={`${inter.className} mt-3 text-[13px] uppercase leading-snug text-white`}>{product.name}</p>
            <p className={`${spaceMono.className} mt-1.5 text-[13px] text-white`}>{formatIDR(product.price)}</p>
          </Link>
        ))}
      </div>

      <div className="mx-auto mt-4 flex max-w-[1400px] items-center gap-3 px-6">
        <button
          type="button"
          aria-label={scrollLeftLabel}
          onClick={() => scrollByAmount(-480)}
          className="shrink-0 text-white/40 transition-colors hover:text-white"
        >
          <ArrowIcon direction="left" />
        </button>
        <div className="relative h-1 flex-1 overflow-hidden rounded-full bg-white/15">
          <div ref={thumbRef} className="absolute inset-y-0 rounded-full bg-white/60" />
        </div>
        <button
          type="button"
          aria-label={scrollRightLabel}
          onClick={() => scrollByAmount(480)}
          className="shrink-0 text-white/40 transition-colors hover:text-white"
        >
          <ArrowIcon direction="right" />
        </button>
      </div>
    </>
  );
}
