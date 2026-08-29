"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { Product } from "@/lib/products";

export type CartItem = {
  productId: string;
  name: string;
  price: number;
  image: string;
  size?: string;
  qty: number;
};

type CartContextValue = {
  items: CartItem[];
  isOpen: boolean;
  count: number;
  subtotal: number;
  openCart: () => void;
  closeCart: () => void;
  addItem: (product: Product, size?: string, qty?: number) => void;
  updateQty: (productId: string, size: string | undefined, qty: number) => void;
  removeItem: (productId: string, size: string | undefined) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = "heyfreak-cart-v2";
const EMPTY_ITEMS: CartItem[] = [];

function sameLine(a: CartItem, productId: string, size: string | undefined) {
  return a.productId === productId && a.size === size;
}

let cartItems: CartItem[] = EMPTY_ITEMS;
let hydrated = false;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

function setCartItems(next: CartItem[]) {
  cartItems = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cartItems));
  } catch {
    // ignore write failures (e.g. private browsing)
  }
  notify();
}

function hydrateFromStorage() {
  if (hydrated) return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      cartItems = JSON.parse(raw);
      notify();
    }
  } catch {
    // ignore corrupt/inaccessible storage
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return cartItems;
}

function getServerSnapshot() {
  return EMPTY_ITEMS;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    hydrateFromStorage();
  }, []);

  const value = useMemo<CartContextValue>(() => {
    const count = items.reduce((sum, line) => sum + line.qty, 0);
    const subtotal = items.reduce((sum, line) => sum + line.qty * line.price, 0);

    const addItem = (product: Product, size?: string, qty = 1) => {
      const existing = cartItems.find((line) => sameLine(line, product.id, size));
      const next = existing
        ? cartItems.map((line) =>
            sameLine(line, product.id, size) ? { ...line, qty: line.qty + qty } : line
          )
        : [
            ...cartItems,
            {
              productId: product.id,
              name: product.name,
              price: product.price,
              image: product.image,
              size,
              qty,
            },
          ];
      setCartItems(next);
      setIsOpen(true);
    };

    const updateQty = (productId: string, size: string | undefined, qty: number) => {
      const next =
        qty <= 0
          ? cartItems.filter((line) => !sameLine(line, productId, size))
          : cartItems.map((line) =>
              sameLine(line, productId, size) ? { ...line, qty } : line
            );
      setCartItems(next);
    };

    const removeItem = (productId: string, size: string | undefined) => {
      setCartItems(cartItems.filter((line) => !sameLine(line, productId, size)));
    };

    const clearCart = () => setCartItems(EMPTY_ITEMS);

    return {
      items,
      isOpen,
      count,
      subtotal,
      openCart: () => setIsOpen(true),
      closeCart: () => setIsOpen(false),
      addItem,
      updateQty,
      removeItem,
      clearCart,
    };
  }, [items, isOpen]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
