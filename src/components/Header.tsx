"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";

const navLinks = [
  { label: "New Drop", href: "#drop" },
  { label: "Kaos", href: "#products" },
  { label: "Aksesoris", href: "#products" },
  { label: "Sale", href: "#products" },
  { label: "Cerita Kami", href: "#story" },
];

export default function Header() {
  const { count, openCart } = useCart();
  const { user, isLoading } = useAuth();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <a href="#top" className="font-display text-2xl tracking-wide sm:text-3xl">
          HEY<span className="text-accent">FREAK</span>
        </a>

        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm font-semibold uppercase tracking-wide text-muted transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <button
            aria-label="Cari"
            className="hidden h-10 w-10 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:border-accent hover:text-accent sm:flex"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </button>
          {!isLoading && (
            <Link
              href={user ? "/account" : "/login"}
              className="hidden items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted transition-colors hover:text-foreground sm:flex"
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
            className="flex h-10 items-center gap-2 rounded-full border border-border px-4 text-sm font-semibold uppercase tracking-wide transition-colors hover:border-accent hover:text-accent"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6h15l-1.5 9h-12z" />
              <path d="M6 6 4.5 3H2" />
              <circle cx="9" cy="20" r="1" />
              <circle cx="18" cy="20" r="1" />
            </svg>
            <span className="hidden sm:inline">Keranjang</span>
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-xs font-bold text-accent-foreground">
              {count}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
