"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";

export type ToastKind = "info" | "success" | "error";
type ToastItem = { id: number; message: string; kind: ToastKind };

type ToastContextValue = {
  toast: (message: string, kind?: ToastKind) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const t = useTranslations("common");
  const [items, setItems] = useState<ToastItem[]>([]);
  // Native HTML5 validation fires an "invalid" event on every invalid field
  // at once (not just the first), so a form with 3 empty required fields
  // would otherwise stack 3 identical toasts from one submit attempt.
  const lastRef = useRef<{ message: string; at: number } | null>(null);

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, kind: ToastKind = "info") => {
      const now = Date.now();
      if (lastRef.current && lastRef.current.message === message && now - lastRef.current.at < 400) {
        return;
      }
      lastRef.current = { message, at: now };
      const id = nextId++;
      setItems((prev) => [...prev, { id, message, kind }]);
      setTimeout(() => dismiss(id), 3500);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:items-end sm:px-6">
        {items.map((item) => (
          <div
            key={item.id}
            role="status"
            className={`btn-tag pointer-events-auto flex w-full max-w-sm items-start gap-3 border-2 bg-surface px-4 py-3 shadow-edge-lg ${
              item.kind === "error"
                ? "border-red-500"
                : item.kind === "success"
                  ? "border-pop"
                  : "border-foreground"
            }`}
          >
            {item.kind === "success" && (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="mt-0.5 shrink-0 text-pop">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            )}
            {item.kind === "error" && (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="mt-0.5 shrink-0 text-red-500">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8v5M12 16h.01" strokeLinecap="round" />
              </svg>
            )}
            {item.kind === "info" && (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="mt-0.5 shrink-0 text-foreground">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 16v-5M12 8h.01" strokeLinecap="round" />
              </svg>
            )}
            <p className="flex-1 text-sm font-semibold text-foreground">{item.message}</p>
            <button
              aria-label={t("close")}
              onClick={() => dismiss(item.id)}
              className="shrink-0 text-muted hover:text-foreground"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
