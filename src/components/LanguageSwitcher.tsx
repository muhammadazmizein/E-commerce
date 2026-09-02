"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { locales, localeCookieName, type Locale } from "@/i18n/config";

const LABELS: Record<Locale, string> = { id: "ID", en: "EN" };

function setLocaleCookie(next: Locale) {
  document.cookie = `${localeCookieName}=${next}; path=/; max-age=31536000; SameSite=Lax`;
}

export default function LanguageSwitcher({ className = "" }: { className?: string }) {
  const locale = useLocale() as Locale;
  const t = useTranslations("nav");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function switchTo(next: Locale) {
    if (next === locale) return;
    setLocaleCookie(next);
    startTransition(() => router.refresh());
  }

  return (
    <div
      role="group"
      aria-label={t("language")}
      className={`flex items-center border border-border text-xs font-bold uppercase tracking-widest ${className}`}
    >
      {locales.map((l) => (
        <button
          key={l}
          type="button"
          disabled={isPending}
          onClick={() => switchTo(l)}
          aria-pressed={l === locale}
          className={`px-2.5 py-1.5 transition-colors disabled:cursor-wait ${
            l === locale ? "bg-foreground text-background" : "text-muted hover:text-foreground"
          }`}
        >
          {LABELS[l]}
        </button>
      ))}
    </div>
  );
}
