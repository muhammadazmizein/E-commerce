"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ProductCard from "@/components/ProductCard";
import Pagination from "@/components/Pagination";
import Select from "@/components/Select";
import type { Product } from "@/lib/products";

const PAGE_SIZE = 12;

const PRICE_RANGES = [
  { label: "Di bawah Rp150.000", min: 0, max: 150000 },
  { label: "Rp150.000 – Rp180.000", min: 150000, max: 180000 },
  { label: "Rp180.000 – Rp210.000", min: 180000, max: 210000 },
  { label: "Di atas Rp210.000", min: 210000, max: Infinity },
] as const;

type TipeProduk = "semua" | "unggulan" | "diskon";
type Ketersediaan = "semua" | "stok";
type SortBy = "unggulan" | "harga-rendah" | "harga-tinggi";

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
  const [priceRange, setPriceRange] = useState<(typeof PRICE_RANGES)[number] | null>(null);
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
    priceRange?.label ?? "",
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
      <label className="flex items-center gap-2 border-2 border-border bg-surface px-4 py-2.5">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted">
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari produk..."
          className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted"
        />
      </label>

      <div className="mt-6 border-t-2 border-border pt-5">
        <h3 className="text-xs font-bold uppercase tracking-widest text-accent">Kategori</h3>
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

      <div className="mt-6 border-t-2 border-border pt-5">
        <h3 className="text-xs font-bold uppercase tracking-widest text-accent">Tipe Produk</h3>
        <div className="mt-3 flex flex-col gap-2.5">
          {(
            [
              ["semua", "Semua Produk"],
              ["unggulan", "Produk Unggulan"],
              ["diskon", "Diskon"],
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

      <div className="mt-6 border-t-2 border-border pt-5">
        <h3 className="text-xs font-bold uppercase tracking-widest text-accent">Ketersediaan</h3>
        <div className="mt-3 flex flex-col gap-2.5">
          {(
            [
              ["semua", "Semua"],
              ["stok", "Ada Stok"],
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

      <div className="mt-6 border-t-2 border-border pt-5">
        <h3 className="text-xs font-bold uppercase tracking-widest text-accent">Harga</h3>
        <div className="mt-3 flex flex-col gap-2.5">
          <label className="flex cursor-pointer items-center gap-2.5 text-sm">
            <input
              type="radio"
              name="harga"
              checked={priceRange === null}
              onChange={() => setPriceRange(null)}
              className="h-4 w-4 accent-[var(--accent)]"
            />
            Semua Harga
          </label>
          {PRICE_RANGES.map((range) => (
            <label key={range.label} className="flex cursor-pointer items-center gap-2.5 text-sm">
              <input
                type="radio"
                name="harga"
                checked={priceRange?.label === range.label}
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
          aria-label="Filter produk"
          className={`absolute left-0 top-0 flex h-full w-full max-w-xs flex-col border-r-2 border-border bg-surface transition-transform duration-300 ${
            mobileFiltersOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between border-b-2 border-border px-5 py-4">
            <h2 className="font-display text-xl uppercase tracking-tight">Filter</h2>
            <button
              aria-label="Tutup filter"
              onClick={() => setMobileFiltersOpen(false)}
              className="btn-tag flex h-9 w-9 items-center justify-center border-2 border-border text-foreground transition-colors hover:border-accent hover:text-accent"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-5">{filterFields}</div>
          <div className="border-t-2 border-border px-5 py-4">
            <button
              onClick={() => setMobileFiltersOpen(false)}
              className="btn-tag flex w-full items-center justify-center bg-accent py-3 text-sm font-bold uppercase tracking-wide text-accent-foreground"
            >
              Tampilkan {filtered.length} Produk
            </button>
          </div>
        </aside>
      </div>

      <div ref={listRef} className="lg:col-span-9">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-border pb-5">
          <h1 className="font-display text-2xl uppercase tracking-tight">
            Semua Produk <span className="text-base font-sans font-normal normal-case text-accent">({filtered.length})</span>
          </h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileFiltersOpen(true)}
              className="btn-tag relative flex items-center gap-2 border-2 border-border px-3.5 py-2.5 text-xs font-bold uppercase tracking-wide text-foreground transition-colors hover:border-accent hover:text-accent lg:hidden"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 6h16M7 12h10M10 18h4" strokeLinecap="round" />
              </svg>
              Filter
              {activeFilterCount > 0 && (
                <span className="btn-tag flex h-4 min-w-4 items-center justify-center bg-pop px-1 text-[10px] font-bold text-pop-foreground">
                  {activeFilterCount}
                </span>
              )}
            </button>
            <label className="flex items-center gap-2 text-sm">
              <span className="hidden text-muted sm:inline">Urutan:</span>
              <Select
                value={sortBy}
                onChange={(v) => setSortBy(v as SortBy)}
                className="min-w-[9rem]"
                options={[
                  { value: "unggulan", label: "Unggulan" },
                  { value: "harga-rendah", label: "Harga Terendah" },
                  { value: "harga-tinggi", label: "Harga Tertinggi" },
                ]}
              />
            </label>
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="mt-8 border-2 border-border bg-surface px-4 py-16 text-center text-sm text-muted">
            Nggak ada produk yang cocok sama filter ini.
          </p>
        ) : (
          <>
            <div className="mt-6 grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3">
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
