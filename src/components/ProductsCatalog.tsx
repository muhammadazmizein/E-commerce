"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import ProductCard from "@/components/ProductCard";
import type { Product } from "@/lib/products";

const PAGE_SIZE = 12;

type SortValue =
  | "featured"
  | "relevant"
  | "bestSelling"
  | "azAsc"
  | "azDesc"
  | "priceAsc"
  | "priceDesc"
  | "dateAsc"
  | "dateDesc";

export default function ProductsCatalog({
  products,
  initialCategory,
  initialSearch,
  initialSale,
}: {
  products: Product[];
  initialCategory?: string;
  initialSearch?: string;
  initialSale?: boolean;
}) {
  const t = useTranslations("productsCatalog");

  const [viewMode, setViewMode] = useState<"comfortable" | "compact">("comfortable");
  const [sortBy, setSortBy] = useState<SortValue>("featured");
  const [sortOpen, setSortOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);

  const SORT_OPTIONS: { value: SortValue; label: string }[] = [
    { value: "featured", label: t("sortFeatured") },
    { value: "relevant", label: t("sortRelevant") },
    { value: "bestSelling", label: t("sortBestSelling") },
    { value: "azAsc", label: t("sortAzAsc") },
    { value: "azDesc", label: t("sortAzDesc") },
    { value: "priceAsc", label: t("sortPriceAsc") },
    { value: "priceDesc", label: t("sortPriceDesc") },
    { value: "dateAsc", label: t("sortDateAsc") },
    { value: "dateDesc", label: t("sortDateDesc") },
  ];

  useEffect(() => {
    if (!sortOpen) return;
    function handlePointerDown(e: MouseEvent) {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [sortOpen]);

  const filtered = useMemo(() => {
    let result = products;

    if (initialSearch?.trim()) {
      const q = initialSearch.trim().toLowerCase();
      result = result.filter((p) => p.name.toLowerCase().includes(q));
    }
    if (initialCategory) {
      result = result.filter((p) => p.category === initialCategory);
    }
    if (initialSale) {
      result = result.filter((p) => !!p.compareAt);
    }

    result = [...result];
    switch (sortBy) {
      case "azAsc":
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "azDesc":
        result.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case "priceAsc":
        result.sort((a, b) => a.price - b.price);
        break;
      case "priceDesc":
        result.sort((a, b) => b.price - a.price);
        break;
      case "bestSelling":
        // No real sales count in the catalog — review count is the closest
        // proxy we have for popularity.
        result.sort((a, b) => (b.reviewCount ?? 0) - (a.reviewCount ?? 0));
        break;
      case "dateDesc":
        // No createdAt on products — the catalog is returned oldest-first,
        // so reversing it approximates newest-first.
        result.reverse();
        break;
      // "featured", "relevant" and "dateAsc" all keep the catalog's
      // original order.
    }

    return result;
  }, [products, initialSearch, initialCategory, initialSale, sortBy]);

  // Reset how many are shown whenever the filtered set changes, without an
  // effect (React's recommended pattern for "adjusting state when inputs
  // change").
  const filterKey = `${initialCategory ?? ""}|${initialSearch ?? ""}|${initialSale ? "sale" : ""}|${sortBy}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (prevFilterKey !== filterKey) {
    setPrevFilterKey(filterKey);
    setVisibleCount(PAGE_SIZE);
  }

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  useEffect(() => {
    if (!hasMore) return;
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((c) => Math.min(c + PAGE_SIZE, filtered.length));
        }
      },
      { rootMargin: "600px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, filtered.length]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 pb-5">
        <div className="flex items-center gap-3">
        <p className="text-sm text-muted">{t("itemsCount", { count: filtered.length })}</p>

        <div className="relative" ref={sortRef}>
          <button
            type="button"
            onClick={() => setSortOpen((o) => !o)}
            className="flex items-center gap-1.5 text-sm text-foreground"
          >
            <span className="text-muted">{t("sortBy")}</span>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className={`transition-transform ${sortOpen ? "rotate-180" : ""}`}
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
          {sortOpen && (
            <div className="absolute right-0 top-full z-20 mt-2 w-64 rounded-lg border border-border bg-surface p-2 shadow-edge-lg">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setSortBy(opt.value);
                    setSortOpen(false);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-surface-2"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    className={`shrink-0 ${sortBy === opt.value ? "opacity-100" : "opacity-0"}`}
                  >
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label={t("viewComfortable")}
            aria-pressed={viewMode === "comfortable"}
            onClick={() => setViewMode("comfortable")}
            className={`flex h-8 w-8 items-center justify-center transition-colors ${
              viewMode === "comfortable" ? "text-foreground" : "text-muted hover:text-foreground"
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="8" height="8" rx="1" />
              <rect x="13" y="3" width="8" height="8" rx="1" />
              <rect x="3" y="13" width="8" height="8" rx="1" />
              <rect x="13" y="13" width="8" height="8" rx="1" />
            </svg>
          </button>
          <button
            type="button"
            aria-label={t("viewCompact")}
            aria-pressed={viewMode === "compact"}
            onClick={() => setViewMode("compact")}
            className={`flex h-8 w-8 items-center justify-center transition-colors ${
              viewMode === "compact" ? "text-foreground" : "text-muted hover:text-foreground"
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
              {[4, 11, 18].flatMap((y) =>
                [4, 11, 18].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.6" />)
              )}
            </svg>
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="mt-8 border border-border bg-surface px-4 py-16 text-center text-sm text-muted">
          {t("noResults")}
        </p>
      ) : (
        <>
          <div
            className={
              viewMode === "compact"
                ? "mt-6 grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 2xl:grid-cols-12"
                : "mt-6 grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4 xl:grid-cols-5"
            }
          >
            {visible.map((product) => (
              <ProductCard key={product.id} product={product} variant={viewMode === "compact" ? "thumbnail" : "grid"} />
            ))}
          </div>
          {hasMore && (
            <div ref={sentinelRef} className="mt-10 flex justify-center py-6">
              <span className="text-xs uppercase tracking-widest text-muted">{t("loadingMore")}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
