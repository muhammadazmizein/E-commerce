"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { addToWishlist, getWishlist, removeFromWishlist } from "@/lib/api";
import type { Product } from "@/lib/products";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";

type WishlistContextValue = {
  items: Product[];
  isLoading: boolean;
  isWishlisted: (productId: string) => boolean;
  toggle: (product: Product) => void;
};

const WishlistContext = createContext<WishlistContextValue | null>(null);

// Wishlist is per-account (server-side), not per-browser like the cart —
// there's no guest wishlist, it just sits empty until the buyer logs in.
export function WishlistProvider({ children }: { children: ReactNode }) {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isAuthLoading) return;
    if (!user) {
      setItems([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    getWishlist()
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setIsLoading(false));
  }, [isAuthLoading, user]);

  const isWishlisted = useCallback(
    (productId: string) => items.some((p) => p.id === productId),
    [items]
  );

  const toggle = useCallback(
    (product: Product) => {
      if (!user) {
        toast("Login dulu buat nyimpen wishlist ya", "info");
        return;
      }
      const already = items.some((p) => p.id === product.id);
      if (already) {
        setItems((prev) => prev.filter((p) => p.id !== product.id));
        removeFromWishlist(product.id).catch(() => {
          setItems((prev) => [...prev, product]);
          toast("Gagal menghapus dari wishlist", "error");
        });
      } else {
        setItems((prev) => [product, ...prev]);
        addToWishlist(product.id).catch(() => {
          setItems((prev) => prev.filter((p) => p.id !== product.id));
          toast("Gagal menyimpan ke wishlist", "error");
        });
      }
    },
    [items, user, toast]
  );

  const value = useMemo(
    () => ({ items, isLoading, isWishlisted, toggle }),
    [items, isLoading, isWishlisted, toggle]
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within WishlistProvider");
  return ctx;
}
