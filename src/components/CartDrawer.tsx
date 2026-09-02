"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import { useCart } from "@/lib/cart-context";
import { formatIDR } from "@/lib/products";

export default function CartDrawer() {
  const { items, isOpen, closeCart, updateQty, removeItem, subtotal } = useCart();

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeCart();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [isOpen, closeCart]);

  return (
    <div
      className={`fixed inset-0 z-[60] ${isOpen ? "" : "pointer-events-none"}`}
      aria-hidden={!isOpen}
    >
      <div
        onClick={closeCart}
        className={`absolute inset-0 bg-black/70 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0"
        }`}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Keranjang belanja"
        className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-border bg-surface transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-display text-xl uppercase tracking-tight">Keranjang</h2>
          <button
            aria-label="Tutup keranjang"
            onClick={closeCart}
            className="btn-tag flex h-9 w-9 items-center justify-center border border-border text-foreground transition-colors hover:border-accent hover:text-accent"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
            <p className="font-display text-lg uppercase tracking-tight text-foreground">
              Keranjang kosong
            </p>
            <p className="text-sm text-muted">Yuk pilih kaos atau aksesoris favorit lo.</p>
            <button
              onClick={closeCart}
              className="btn-tag mt-4 border border-border px-5 py-2.5 text-sm font-bold uppercase tracking-wide transition-colors hover:border-accent hover:text-accent"
            >
              Lanjut Belanja
            </button>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y-2 divide-border overflow-y-auto px-5">
              {items.map((line) => (
                <li key={`${line.productId}-${line.size ?? "x"}`} className="flex gap-3 py-4">
                  <div className="relative h-20 w-16 shrink-0 overflow-hidden border border-border">
                    <Image
                      src={line.image}
                      alt={line.name}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  </div>
                  <div className="flex flex-1 flex-col gap-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold leading-snug text-foreground">
                        {line.name}
                      </p>
                      <button
                        aria-label={`Hapus ${line.name}`}
                        onClick={() => removeItem(line.productId, line.size)}
                        className="shrink-0 text-muted transition-colors hover:text-red-400"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6" />
                        </svg>
                      </button>
                    </div>
                    {line.size && (
                      <p className="text-xs uppercase tracking-wide text-muted">
                        Size: {line.size}
                      </p>
                    )}
                    <div className="mt-auto flex items-center justify-between pt-1">
                      <div className="flex items-center border border-border">
                        <button
                          aria-label="Kurangi jumlah"
                          onClick={() => updateQty(line.productId, line.size, line.qty - 1)}
                          className="flex h-7 w-7 items-center justify-center text-foreground hover:text-accent"
                        >
                          −
                        </button>
                        <span className="w-6 text-center text-sm font-semibold">{line.qty}</span>
                        <button
                          aria-label="Tambah jumlah"
                          onClick={() => updateQty(line.productId, line.size, line.qty + 1)}
                          className="flex h-7 w-7 items-center justify-center text-foreground hover:text-accent"
                        >
                          +
                        </button>
                      </div>
                      <span className="font-display text-sm tracking-tight">
                        {formatIDR(line.price * line.qty)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="border-t border-border px-5 py-5">
              <div className="flex items-center justify-between text-sm text-muted">
                <span>Subtotal</span>
                <span className="font-display text-lg text-accent">{formatIDR(subtotal)}</span>
              </div>
              <p className="mt-1 text-xs text-muted">Ongkir dihitung saat checkout.</p>
              <Link
                href="/checkout"
                onClick={closeCart}
                className="btn-tag mt-4 flex w-full items-center justify-center bg-accent py-3 text-sm font-bold uppercase tracking-wide text-accent-foreground transition-transform hover:-translate-y-0.5"
              >
                Checkout
              </Link>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
