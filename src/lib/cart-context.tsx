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
import { useAuth } from "@/lib/auth-context";

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

const STORAGE_PREFIX = "heyfreak-cart-v2";
// Cart for a signed-out visitor. Kept separate per logged-in user so two
// accounts sharing a browser never see each other's items.
const GUEST_NAMESPACE = "guest";
const EMPTY_ITEMS: CartItem[] = [];

function sameLine(a: CartItem, productId: string, size: string | undefined) {
  return a.productId === productId && a.size === size;
}

function storageKeyFor(namespace: string) {
  return `${STORAGE_PREFIX}:${namespace}`;
}

function readStorage(namespace: string): CartItem[] {
  try {
    const raw = window.localStorage.getItem(storageKeyFor(namespace));
    return raw ? JSON.parse(raw) : EMPTY_ITEMS;
  } catch {
    return EMPTY_ITEMS;
  }
}

function writeStorage(namespace: string, items: CartItem[]) {
  try {
    window.localStorage.setItem(storageKeyFor(namespace), JSON.stringify(items));
  } catch {
    // ignore write failures (e.g. private browsing)
  }
}

function mergeLines(base: CartItem[], extra: CartItem[]): CartItem[] {
  const merged = [...base];
  for (const line of extra) {
    const idx = merged.findIndex((l) => sameLine(l, line.productId, line.size));
    if (idx >= 0) merged[idx] = { ...merged[idx], qty: merged[idx].qty + line.qty };
    else merged.push(line);
  }
  return merged;
}

let cartItems: CartItem[] = EMPTY_ITEMS;
let namespace = GUEST_NAMESPACE;
let hydrated = false;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

function setCartItems(next: CartItem[]) {
  cartItems = next;
  writeStorage(namespace, cartItems);
  notify();
}

function hydrateFromStorage() {
  if (hydrated) return;
  hydrated = true;
  cartItems = readStorage(namespace);
  notify();
}

// Called once auth state resolves and whenever the logged-in user changes.
// Items added while signed out are merged into the account's cart on login
// (then the guest bucket is cleared) so nothing gets lost.
function switchNamespace(next: string) {
  if (next === namespace) return;
  const wasGuest = namespace === GUEST_NAMESPACE;
  namespace = next;

  if (wasGuest && next !== GUEST_NAMESPACE) {
    const guestItems = readStorage(GUEST_NAMESPACE);
    cartItems = mergeLines(readStorage(next), guestItems);
    writeStorage(next, cartItems);
    if (guestItems.length > 0) writeStorage(GUEST_NAMESPACE, EMPTY_ITEMS);
  } else {
    cartItems = readStorage(next);
  }
  notify();
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
  const { user, isLoading } = useAuth();

  useEffect(() => {
    hydrateFromStorage();
  }, []);

  useEffect(() => {
    if (isLoading) return;
    switchNamespace(user ? user.id : GUEST_NAMESPACE);
  }, [isLoading, user]);

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
