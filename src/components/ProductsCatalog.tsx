"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import ProductCard from "@/components/ProductCard";
import Pagination from "@/components/Pagination";
import Select from "@/components/Select";
import type { Product } from "@/lib/products";

const PAGE_SIZE = 12;

const PRICE_RANGE_DEFS = [
  { key: "priceUnder", min: 0, max: 150000 },
  { key: "priceMid1", min: 150000, max: 180000 },
  { key: "priceMid2", min: 180000, max: 210000 },
  { key: "priceOver", min: 210000, max: Infinity },
] as const;

type TipeProduk = "semua" | "unggulan" | "diskon";
type Ketersediaan = "semua" | "stok";
type SortBy = "unggulan" | "harga-rendah" | "harga-tinggi";
type PriceRange = { key: string; label: string; min: number; max: number };

export default function ProductsCatalog({
  products,
  initialCategory,
  initialTipe,
  initialSearch,
}: {
  products: Product[];
  initialCategory?: string;
  initialTipe?: TipeProduk;
  initialSearch?: string;
}) {
  const t = useTranslations("productsCatalog");
  const priceRanges: PriceRange[] = PRICE_RANGE_DEFS.map((r) => ({ ...r, label: t(r.key) }));

  const allCategories = useMemo(
    () => Array.from(new Set(products.map((p) => p.category))),
    [products]
  );

  const [search, setSearch] = useState(initialSearch ?? "");
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(
    () => new Set(initialCategory ? [initialCategory] : [])
  );
  const [tipeProduk, setTipeProduk] = useState<TipeProduk>(initialTipe ?? "semua");
  const [ketersediaan, setKetersediaan] = useState<Ketersediaan>("semua");
  const [priceRange, setPriceRange] = useState<PriceRange | null>(null);
  const [sortBy, setSortBy] = useState<SortBy>("unggulan");
  const [page, setPage] = useState(1);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mobileFiltersOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileFiltersOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [mobileFiltersOpen]);

  const activeFilterCount =
    selectedCategories.size +
    (tipeProduk !== "semua" ? 1 : 0) +
    (ketersediaan !== "semua" ? 1 : 0) +
    (priceRange ? 1 : 0);

  function toggleCategory(category: string) {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }

  const filtered = useMemo(() => {
    let result = products;

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((p) => p.name.toLowerCase().includes(q));
    }
    if (selectedCategories.size > 0) {
      result = result.filter((p) => selectedCategories.has(p.category));
    }
    if (tipeProduk === "unggulan") {
      result = result.filter((p) => p.badge === "NEW" || p.badge === "HOT");
    } else if (tipeProduk === "diskon") {
      result = result.filter((p) => !!p.compareAt);
    }
    if (ketersediaan === "stok") {
      result = result.filter((p) => p.badge !== "SOLD OUT");
    }
    if (priceRange) {
      result = result.filter((p) => p.price >= priceRange.min && p.price < priceRange.max);
    }

    result = [...result];
    if (sortBy === "harga-rendah") result.sort((a, b) => a.price - b.price);
    else if (sortBy === "harga-tinggi") result.sort((a, b) => b.price - a.price);

    return result;
  }, [products, search, selectedCategories, tipeProduk, ketersediaan, priceRange, sortBy]);

  // Reset to page 1 whenever a filter changes, without an effect (React's
  // recommended pattern for "adjusting state when inputs change").
  const filterKey = [
    search,
    Array.from(selectedCategories).sort().join(","),
    tipeProduk,
    ketersediaan,
    priceRange?.key ?? "",
    sortBy,
  ].join("|");
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (prevFilterKey !== filterKey) {
    setPrevFilterKey(filterKey);
    setPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handlePageChange(next: number) {
    setPage(next);
    listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const filterFields = (
    <>
      <label className="flex items-center gap-2 border border-border bg-surface px-4 py-2.5">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted">
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted"
        />
      </label>

      <div className="mt-6 border-t border-border pt-5">
        <h3 className="text-xs font-bold uppercase tracking-widest text-accent">{t("category")}</h3>
        <div className="mt-3 flex flex-col gap-2.5">
          {allCategories.map((cat) => (
            <label key={cat} className="flex cursor-pointer items-center gap-2.5 text-sm">
              <input
                type="checkbox"
                checked={selectedCategories.has(cat)}
                onChange={() => toggleCategory(cat)}
                className="h-4 w-4 accent-[var(--accent)]"
              />
              {cat}
            </label>
          ))}
        </div>
      </div>

      <div className="mt-6 border-t border-border pt-5">
        <h3 className="text-xs font-bold uppercase tracking-widest text-accent">{t("productType")}</h3>
        <div className="mt-3 flex flex-col gap-2.5">
          {(
            [
              ["semua", t("allProducts")],
              ["unggulan", t("featuredProducts")],
              ["diskon", t("discount")],
            ] as const
          ).map(([value, label]) => (
            <label key={value} className="flex cursor-pointer items-center gap-2.5 text-sm">
              <input
                type="radio"
                name="tipeProduk"
                checked={tipeProduk === value}
                onChange={() => setTipeProduk(value)}
                className="h-4 w-4 accent-[var(--accent)]"
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      <div className="mt-6 border-t border-border pt-5">
        <h3 className="text-xs font-bold uppercase tracking-widest text-accent">{t("availability")}</h3>
        <div className="mt-3 flex flex-col gap-2.5">
          {(
            [
              ["semua", t("all")],
              ["stok", t("inStock")],
            ] as const
          ).map(([value, label]) => (
            <label key={value} className="flex cursor-pointer items-center gap-2.5 text-sm">
              <input
                type="radio"
                name="ketersediaan"
                checked={ketersediaan === value}
                onChange={() => setKetersediaan(value)}
                className="h-4 w-4 accent-[var(--accent)]"
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      <div className="mt-6 border-t border-border pt-5">
        <h3 className="text-xs font-bold uppercase tracking-widest text-accent">{t("price")}</h3>
        <div className="mt-3 flex flex-col gap-2.5">
          <label className="flex cursor-pointer items-center gap-2.5 text-sm">
            <input
              type="radio"
              name="harga"
              checked={priceRange === null}
              onChange={() => setPriceRange(null)}
              className="h-4 w-4 accent-[var(--accent)]"
            />
            {t("allPrices")}
          </label>
          {priceRanges.map((range) => (
            <label key={range.key} className="flex cursor-pointer items-center gap-2.5 text-sm">
              <input
                type="radio"
                name="harga"
                checked={priceRange?.key === range.key}
                onChange={() => setPriceRange(range)}
                className="h-4 w-4 accent-[var(--accent)]"
              />
              {range.label}
            </label>
          ))}
        </div>
      </div>
    </>
  );

  return (
    <div className="grid gap-8 lg:grid-cols-12">
      <aside className="hidden lg:block lg:col-span-3">{filterFields}</aside>

      {/* Mobile filter drawer — the full filter panel used to render inline
          above the results, pushing products off-screen. */}
      <div className={`fixed inset-0 z-[60] lg:hidden ${mobileFiltersOpen ? "" : "pointer-events-none"}`} aria-hidden={!mobileFiltersOpen}>
        <div
          onClick={() => setMobileFiltersOpen(false)}
          className={`absolute inset-0 bg-black/70 transition-opacity duration-300 ${
            mobileFiltersOpen ? "opacity-100" : "opacity-0"
          }`}
        />
        <aside
          role="dialog"
          aria-modal="true"
          aria-label={t("filter")}
          className={`absolute left-0 top-0 flex h-full w-full max-w-xs flex-col border-r border-border bg-surface transition-transform duration-300 ${
            mobileFiltersOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="font-display text-xl uppercase tracking-wide">{t("filter")}</h2>
            <button
              aria-label={t("closeFilter")}
              onClick={() => setMobileFiltersOpen(false)}
              className="btn-tag flex h-9 w-9 items-center justify-center border border-border text-foreground transition-colors hover:border-accent hover:text-accent"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-5">{filterFields}</div>
          <div className="border-t border-border px-5 py-4">
            <button
              onClick={() => setMobileFiltersOpen(false)}
              className="btn-tag flex w-full items-center justify-center bg-accent py-3 text-sm font-bold uppercase tracking-wide text-accent-foreground"
            >
              {t("showResults", { count: filtered.length })}
            </button>
          </div>
        </aside>
      </div>

      <div ref={listRef} className="lg:col-span-9">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-5">
          <h1 className="font-display text-2xl uppercase tracking-wide">
            {t("allProductsTitle")} <span className="text-base font-sans font-normal normal-case text-accent">({filtered.length})</span>
          </h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileFiltersOpen(true)}
              className="btn-tag relative flex items-center gap-2 border border-border px-3.5 py-2.5 text-xs font-bold uppercase tracking-wide text-foreground transition-colors hover:border-accent hover:text-accent lg:hidden"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 6h16M7 12h10M10 18h4" strokeLinecap="round" />
              </svg>
              {t("filter")}
              {activeFilterCount > 0 && (
                <span className="btn-tag flex h-4 min-w-4 items-center justify-center bg-pop px-1 text-[10px] font-bold text-pop-foreground">
                  {activeFilterCount}
                </span>
              )}
            </button>
            <label className="flex items-center gap-2 text-sm">
              <span className="hidden text-muted sm:inline">{t("sortBy")}</span>
              <Select
                value={sortBy}
                onChange={(v) => setSortBy(v as SortBy)}
                className="min-w-[9rem]"
                options={[
                  { value: "unggulan", label: t("sortFeatured") },
                  { value: "harga-rendah", label: t("sortPriceLow") },
                  { value: "harga-tinggi", label: t("sortPriceHigh") },
                ]}
              />
            </label>
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="mt-8 border border-border bg-surface px-4 py-16 text-center text-sm text-muted">
            {t("noResults")}
          </p>
        ) : (
          <>
            <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4 xl:grid-cols-5">
              {paged.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
            <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
          </>
        )}
      </div>
    </div>
  );
}
