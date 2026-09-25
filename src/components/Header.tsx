"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { getCategories, type Category } from "@/lib/api";
import Logo from "@/components/Logo";

export default function Header() {
  const t = useTranslations("nav");
  const navLinks = [
    { label: t("shop"), href: "/products" },
    { label: t("news"), href: "/news" },
    { label: t("gallery"), href: "/gallery" },
    { label: t("store"), href: "/stores" },
  ];
  const moreLinks = [
    { label: t("news"), href: "/news" },
    { label: t("gallery"), href: "/gallery" },
    { label: t("store"), href: "/stores" },
  ];
  const { count, openCart } = useCart();
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileQuery, setMobileQuery] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

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
    <header className="sticky top-0 z-50 border-b border-border bg-background">
      <div className="relative flex items-center justify-between gap-2 px-4 py-3 sm:gap-4 sm:px-10 sm:py-[15px]">
        {/* Left: hamburger (always visible) + desktop nav links */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label={t("openMenu")}
            onClick={() => setMobileMenuOpen(true)}
            className="flex h-7 w-7 items-center justify-center text-foreground transition-colors hover:bg-surface-2 sm:h-9 sm:w-9"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-[18px] w-[18px] sm:h-6 sm:w-6">
              <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
            </svg>
          </button>
          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="group relative overflow-hidden px-3 py-2 text-xs font-bold uppercase tracking-widest text-foreground transition-colors hover:text-muted"
              >
                {link.label}
                <span className="absolute inset-x-3 bottom-1 h-0.5 origin-left scale-x-0 bg-pop transition-transform duration-300 group-hover:scale-x-100" />
              </Link>
            ))}
          </nav>
        </div>

        {/* Logo, centered in the bar regardless of how wide the left/right
            clusters end up being. */}
        <Link
          href="/"
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        >
          <Logo className="h-7 w-auto sm:h-10" />
        </Link>

        {/* Right: icon-only search / account / cart */}
        <div className="flex items-center gap-1">
          {searchOpen ? (
            <form onSubmit={submitSearch} className="flex items-center">
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onBlur={() => !query && setSearchOpen(false)}
                placeholder={t("searchPlaceholder")}
                className="h-8 w-40 bg-transparent px-2 text-sm text-foreground outline-none placeholder:text-muted"
              />
              <button
                type="submit"
                aria-label={t("search")}
                className="flex h-7 w-7 items-center justify-center text-foreground transition-colors hover:bg-surface-2 sm:h-9 sm:w-9"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-[18px] w-[18px] sm:h-6 sm:w-6">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
              </button>
            </form>
          ) : (
            <button
              type="button"
              aria-label={t("search")}
              onClick={() => setSearchOpen(true)}
              className="flex h-7 w-7 items-center justify-center text-foreground transition-colors hover:bg-surface-2 sm:h-9 sm:w-9"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-[18px] w-[18px] sm:h-6 sm:w-6">
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </button>
          )}
          {!isLoading && (
            <Link
              href={user ? "/account" : "/login"}
              aria-label={user ? user.name : t("login")}
              className="flex h-7 w-7 items-center justify-center text-foreground transition-colors hover:bg-surface-2 sm:h-9 sm:w-9"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-[18px] w-[18px] sm:h-6 sm:w-6">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8" />
              </svg>
            </Link>
          )}
          <button
            onClick={openCart}
            aria-label={t("cart")}
            className="relative flex h-7 w-7 items-center justify-center text-foreground transition-colors hover:bg-surface-2 sm:h-9 sm:w-9"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-[18px] w-[18px] sm:h-6 sm:w-6">
              <path d="M7 8V6a5 5 0 0 1 10 0v2" />
              <path d="M5.5 8h13l1 12.5a1.5 1.5 0 0 1-1.5 1.5H6a1.5 1.5 0 0 1-1.5-1.5z" />
            </svg>
            <span className="btn-tag absolute right-0.5 top-0.5 flex h-3.5 min-w-3.5 items-center justify-center bg-pop px-1 text-[8px] font-bold text-pop-foreground sm:right-1 sm:top-1 sm:h-4 sm:min-w-4 sm:text-[10px]">
              {count}
            </span>
          </button>
        </div>
      </div>
    </header>

      {/* Hamburger drawer — opened from the always-visible hamburger button,
          at any viewport width. Rendered outside <header> because its
          backdrop-blur creates a containing block that would otherwise trap
          this fixed overlay inside the header's own (short) box instead of
          the viewport. */}
      <div
        className={`fixed inset-0 z-[70] ${mobileMenuOpen ? "" : "pointer-events-none"}`}
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
          className={`absolute left-0 top-0 flex h-full w-full max-w-xs flex-col border-r border-border bg-surface transition-transform duration-300 ${
            mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-end px-5 py-4">
            <button
              aria-label={t("closeMenu")}
              onClick={() => setMobileMenuOpen(false)}
              className="text-xs font-bold uppercase tracking-widest text-foreground transition-colors hover:text-muted"
            >
              {t("close")}
            </button>
          </div>

          <form onSubmit={submitMobileSearch} className="flex items-center gap-2 border-b border-border px-5 py-4">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-muted">
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              value={mobileQuery}
              onChange={(e) => setMobileQuery(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted"
            />
          </form>

          <nav className="flex flex-1 flex-col overflow-y-auto px-5 py-3">
            {categories.length > 0 && (
              <Link
                href="/products?sale=1"
                onClick={() => setMobileMenuOpen(false)}
                className="py-3 text-sm font-bold uppercase tracking-widest text-foreground transition-colors hover:text-muted"
              >
                {t("sale")}
              </Link>
            )}
            {(categories.length > 0
              ? categories.map((cat) => ({
                  label: cat.name,
                  href: `/products?category=${encodeURIComponent(cat.name)}`,
                }))
              : navLinks
            ).map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="py-3 text-sm font-bold uppercase tracking-widest text-foreground transition-colors hover:text-muted"
              >
                {link.label}
              </Link>
            ))}

            {categories.length > 0 && (
              <>
                <div className="my-3 border-t border-border" />
                <span className="pb-2 text-xs font-bold uppercase tracking-widest text-muted">
                  {t("more")}
                </span>
                {moreLinks.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="py-3 text-sm font-bold uppercase tracking-widest text-foreground transition-colors hover:text-muted"
                  >
                    {link.label}
                  </Link>
                ))}
              </>
            )}
          </nav>

          {!isLoading && (
            <Link
              href={user ? "/account" : "/login"}
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2.5 border-t border-border px-5 py-4 text-sm font-bold uppercase tracking-widest text-foreground transition-colors hover:bg-surface-2"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8" />
              </svg>
              {user ? user.name : t("login")}
            </Link>
          )}
        </aside>
      </div>
    </>
  );
}
