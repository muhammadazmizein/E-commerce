"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { Category } from "@/lib/api";

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

function CategoryCard({ cat }: { cat: Category }) {
  return (
    <Link href={`/products?category=${encodeURIComponent(cat.name)}`} className="group block">
      <div className="relative aspect-square w-full overflow-hidden bg-surface-2">
        <Image
          src={cat.image}
          alt={cat.name}
          fill
          sizes="(max-width: 640px) 33vw, 20vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <p className="mt-3 text-center text-base font-bold text-foreground">{cat.name}</p>
    </Link>
  );
}

export default function CategoriesShowcase({ categories }: { categories: Category[] }) {
  const t = useTranslations("categoriesShowcase");
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);

  if (categories.length === 0) return null;

  function scrollByAmount(amount: number) {
    scrollerRef.current?.scrollBy({ left: amount, behavior: "smooth" });
  }

  return (
    <section className="pt-8 pb-16 sm:pt-10 sm:pb-20">
      <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8">
        <h2 className="text-sm font-bold uppercase tracking-widest text-foreground">{t("title")}</h2>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="btn-tag border border-border px-4 py-2 text-xs font-bold uppercase tracking-wide text-foreground transition-colors hover:border-foreground"
          >
            {expanded ? t("showLess") : t("showAll")}
          </button>
          {!expanded && (
            <div className="flex gap-2">
              <button
                aria-label={t("scrollLeft")}
                onClick={() => scrollByAmount(-480)}
                className="btn-tag flex h-9 w-9 items-center justify-center border border-border bg-surface text-foreground transition-colors hover:border-foreground"
              >
                <ArrowIcon direction="left" />
              </button>
              <button
                aria-label={t("scrollRight")}
                onClick={() => scrollByAmount(480)}
                className="btn-tag flex h-9 w-9 items-center justify-center border border-border bg-surface text-foreground transition-colors hover:border-foreground"
              >
                <ArrowIcon direction="right" />
              </button>
            </div>
          )}
        </div>
      </div>

      {expanded ? (
        <div className="mt-6 grid grid-cols-2 gap-4 px-4 sm:grid-cols-3 sm:px-6 lg:grid-cols-5 lg:px-8">
          {categories.map((cat) => (
            <CategoryCard key={cat.name} cat={cat} />
          ))}
        </div>
      ) : (
        <div
          ref={scrollerRef}
          className="mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-4 pb-2 scroll-pl-4 sm:px-6 sm:scroll-pl-6 lg:px-8 lg:scroll-pl-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {categories.map((cat) => (
            <div key={cat.name} className="w-full flex-none snap-start sm:w-auto sm:min-w-[300px] sm:flex-1">
              <CategoryCard cat={cat} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
