"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

function InstagramIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M16.5 2c.35 2.4 2.02 4.28 4.5 4.62v2.9c-1.62-.02-3.13-.55-4.5-1.5v6.4c0 3.1-2.5 5.58-5.6 5.58S5.3 17.52 5.3 14.42c0-3.05 2.4-5.5 5.4-5.58v2.9a2.66 2.66 0 0 0-1.7 2.68 2.7 2.7 0 0 0 2.7 2.7 2.7 2.7 0 0 0 2.7-2.7V2h2.1Z" />
    </svg>
  );
}

function ThreadsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9.5" />
      <path d="M9 9.3c0-1 .9-1.8 2.3-1.8 2 0 3.5 1.4 3.5 4v1.2c0 2.4-1.5 3.8-3.6 3.8-1.5 0-2.5-.75-2.5-1.9 0-1.2 1.1-1.9 2.7-1.9.6 0 1.2.08 1.7.24" />
    </svg>
  );
}

const SOCIAL_LINKS = [
  { label: "Instagram", icon: InstagramIcon },
  { label: "TikTok", icon: TikTokIcon },
  { label: "Threads", icon: ThreadsIcon },
];

export default function Footer() {
  const t = useTranslations("footer");

  return (
    <footer className="mt-auto border-t border-border bg-surface">
      <div className="grid grid-cols-1 items-center gap-3 px-4 py-4 text-xs uppercase tracking-wide text-muted sm:grid-cols-[1fr_auto_1fr] sm:px-6 lg:px-8">
        <p className="whitespace-nowrap text-center text-xs uppercase tracking-wide text-foreground sm:justify-self-start sm:text-left">
          © 2026 HEYFREAK<span className="font-normal text-muted">. {t("rights")}</span>
        </p>

        <div className="flex justify-center justify-self-center">
          <Link href="#" className="whitespace-nowrap transition-colors hover:text-foreground">
            {t("termsAndPolicies")}
          </Link>
        </div>

        <div className="flex items-center justify-center gap-4 justify-self-center sm:justify-end sm:justify-self-end">
          {SOCIAL_LINKS.map(({ label, icon: Icon }) => (
            <a
              key={label}
              href="#"
              aria-label={label}
              className="text-muted transition-colors hover:text-foreground"
            >
              <Icon />
            </a>
          ))}
          <a href="#" className="normal-case text-muted transition-colors hover:text-foreground">
            Shopee
          </a>
        </div>
      </div>
    </footer>
  );
}
