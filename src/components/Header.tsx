"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";

const navLinks = [
  { label: "New Drop", href: "/#drop" },
  { label: "Our Collections", href: "/products" },
  { label: "Cerita Kami", href: "/#story" },
];

export default function Header() {
  const { count, openCart } = useCart();
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileQuery, setMobileQuery] = useState("");

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/products?search=${encodeURIComponent(q)}` : "/products");
    setSearchOpen(false);
    setQuery("");
  }

  function submitMobileSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = mobileQuery.trim();
    setMobileMenuOpen(false);
    setMobileQuery("");
    router.push(q ? `/products?search=${encodeURIComponent(q)}` : "/products");
  }

  return (
    <>
    <header className="sticky top-0 z-50 border-b-2 border-border bg-background/90 backdrop-blur">
      <div className="relative mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center">
          <button
            type="button"
            aria-label="Buka menu"
            onClick={() => setMobileMenuOpen(true)}
            className="mr-1 flex h-11 w-11 items-center justify-center text-foreground md:hidden"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
            </svg>
          </button>
          <Link
            href="/"
            className="hidden font-display text-3xl uppercase tracking-tight sm:block sm:border-r-2 sm:border-border sm:py-4 sm:pr-6 sm:text-4xl"
          >
            HEY<span className="text-pop-foreground bg-pop px-0.5">FREAK</span>
          </Link>
        </div>

        {/* Mobile-only logo, centered in the bar regardless of how wide the
            hamburger/cart clusters on either side end up being. */}
        <Link
          href="/"
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-display text-2xl uppercase tracking-tight sm:hidden"
        >
          HEY<span className="text-pop-foreground bg-pop px-0.5">FREAK</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="group relative overflow-hidden px-3 py-2 text-xs font-bold uppercase tracking-widest text-muted transition-colors hover:text-foreground"
            >
              {link.label}
              <span className="absolute inset-x-3 bottom-1 h-0.5 origin-left scale-x-0 bg-pop transition-transform duration-300 group-hover:scale-x-100" />
            </Link>
          ))}
        </nav>

        <div className="flex items-center">
          {searchOpen ? (
            <form
              onSubmit={submitSearch}
              className="hidden items-center border-l-2 border-border sm:flex"
            >
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onBlur={() => !query && setSearchOpen(false)}
                placeholder="Cari produk..."
                className="h-11 w-40 bg-transparent px-3 text-sm text-foreground outline-none placeholder:text-muted"
              />
              <button
                type="submit"
                aria-label="Cari"
                className="flex h-11 w-11 items-center justify-center text-foreground transition-colors hover:bg-surface-2"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
              </button>
            </form>
          ) : (
            <button
              type="button"
              aria-label="Cari"
              onClick={() => setSearchOpen(true)}
              className="hidden h-11 w-11 items-center justify-center border-l-2 border-border text-foreground transition-colors hover:bg-surface-2 sm:flex"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </button>
          )}
          {!isLoading && (
            <Link
              href={user ? "/account" : "/login"}
              className="hidden h-11 items-center gap-2 border-l-2 border-border px-4 text-xs font-bold uppercase tracking-widest text-muted transition-colors hover:bg-surface-2 hover:text-foreground sm:flex"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8" />
              </svg>
              {user ? user.name.split(" ")[0] : "Masuk"}
            </Link>
          )}
          <button
            onClick={openCart}
            className="flex h-11 items-center gap-2 border-l-2 border-border pl-4 pr-3 text-xs font-bold uppercase tracking-widest text-foreground transition-colors hover:bg-surface-2"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6h15l-1.5 9h-12z" />
              <path d="M6 6 4.5 3H2" />
              <circle cx="9" cy="20" r="1" />
              <circle cx="18" cy="20" r="1" />
            </svg>
            <span className="hidden sm:inline">Keranjang</span>
            {count > 0 && (
              <span className="btn-tag flex h-5 min-w-5 items-center justify-center bg-pop px-1 text-xs font-bold text-pop-foreground">
                {count}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>

      {/* Mobile nav drawer — the top bar only ever shows the logo + cart
          below md; everything else (links, search, account) lives here.
          Rendered outside <header> because its backdrop-blur creates a
          containing block that would otherwise trap this fixed overlay
          inside the header's own (short) box instead of the viewport. */}
      <div
        className={`fixed inset-0 z-[70] md:hidden ${mobileMenuOpen ? "" : "pointer-events-none"}`}
        aria-hidden={!mobileMenuOpen}
      >
        <div
          onClick={() => setMobileMenuOpen(false)}
          className={`absolute inset-0 bg-black/70 transition-opacity duration-300 ${
            mobileMenuOpen ? "opacity-100" : "opacity-0"
          }`}
        />
        <aside
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          className={`absolute left-0 top-0 flex h-full w-full max-w-xs flex-col border-r-2 border-border bg-surface transition-transform duration-300 ${
            mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between border-b-2 border-border px-5 py-4">
            <span className="font-display text-2xl uppercase tracking-tight">
              HEY<span className="text-pop-foreground bg-pop px-0.5">FREAK</span>
            </span>
            <button
              aria-label="Tutup menu"
              onClick={() => setMobileMenuOpen(false)}
              className="btn-tag flex h-9 w-9 items-center justify-center border-2 border-border text-foreground transition-colors hover:border-accent hover:text-accent"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={submitMobileSearch} className="flex items-center gap-2 border-b-2 border-border px-5 py-4">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-muted">
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              value={mobileQuery}
              onChange={(e) => setMobileQuery(e.target.value)}
              placeholder="Cari produk..."
              className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted"
            />
          </form>

          <nav className="flex flex-1 flex-col overflow-y-auto px-2 py-3">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="px-3.5 py-3 text-sm font-bold uppercase tracking-widest text-foreground transition-colors hover:text-pop-foreground hover:bg-pop"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {!isLoading && (
            <Link
              href={user ? "/account" : "/login"}
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2.5 border-t-2 border-border px-5 py-4 text-sm font-bold uppercase tracking-widest text-foreground transition-colors hover:bg-surface-2"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8" />
              </svg>
              {user ? user.name : "Masuk / Daftar"}
            </Link>
          )}
        </aside>
      </div>
    </>
  );
}
