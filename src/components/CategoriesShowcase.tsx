"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import type { Category } from "@/lib/api";

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

function CategoryCard({ cat }: { cat: Category }) {
  return (
    <Link
      href={`/products?category=${encodeURIComponent(cat.name)}`}
      className="group flex aspect-[3/4] w-full flex-col overflow-hidden bg-white"
    >
      <div className="relative flex-1">
        <div className="absolute inset-1.5 sm:inset-4">
          <Image
            src={cat.image}
            alt={cat.name}
            fill
            sizes="(max-width: 640px) 30vw, (max-width: 1024px) 340px, 420px"
            className="object-contain transition-transform duration-300 group-hover:scale-105"
          />
        </div>
      </div>
      <p className="pb-3 text-center text-[11px] font-bold uppercase tracking-wide text-black sm:pb-10 sm:text-lg">
        {cat.name}
      </p>
    </Link>
  );
}

export default function CategoriesShowcase({ categories }: { categories: Category[] }) {
  const t = useTranslations("categoriesShowcase");
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
  }, [categories]);

  if (categories.length === 0) return null;

  return (
    <section className="pt-8 pb-16 sm:pt-10 sm:pb-20">
      <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8">
        <h2 className="text-lg font-bold uppercase tracking-wide text-foreground">{t("title")}</h2>
      </div>

      <div
        ref={scrollerRef}
        className="mt-6 flex snap-x snap-mandatory gap-2 overflow-x-auto pb-2 scrollbar-hide sm:gap-4"
      >
        {categories.map((cat) => (
          <div key={cat.name} className="w-[32%] flex-none snap-start sm:w-[340px] lg:w-[420px]">
            <CategoryCard cat={cat} />
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          aria-label={t("scrollLeft")}
          onClick={() => scrollByAmount(-480)}
          className="shrink-0 text-foreground/40 transition-colors hover:text-foreground"
        >
          <ArrowIcon direction="left" />
        </button>
        <div className="relative h-1 flex-1 overflow-hidden rounded-full bg-foreground/15">
          <div ref={thumbRef} className="absolute inset-y-0 rounded-full bg-foreground/60" />
        </div>
        <button
          type="button"
          aria-label={t("scrollRight")}
          onClick={() => scrollByAmount(480)}
          className="shrink-0 text-foreground/40 transition-colors hover:text-foreground"
        >
          <ArrowIcon direction="right" />
        </button>
      </div>
      <p className="mt-2 text-center text-[9px] uppercase tracking-wide text-[#AAAAAA]">{t("swipeHint")}</p>
    </section>
  );
}
