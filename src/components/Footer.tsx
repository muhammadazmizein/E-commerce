import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function Footer() {
  const t = await getTranslations("footer");
  const links = [
    { label: t("allProducts"), href: "/products" },
    { label: t("trackOrder"), href: "/account" },
    { label: t("help"), href: "#" },
  ];

  return (
    <footer className="mt-auto border-t border-border bg-surface">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p className="text-xs tracking-tight text-foreground">
          © 2026 HEYFREAK<span className="font-normal text-muted">. {t("rights")}</span>
        </p>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {links.map((link) => (
            <Link key={link.label} href={link.href} className="transition-colors hover:text-foreground">
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex gap-2">
          {["IG", "TT", "SH"].map((s) => (
            <a
              key={s}
              href="#"
              className="btn-tag flex h-6 w-6 items-center justify-center border border-border text-[10px] font-bold text-foreground transition-colors hover:border-accent hover:text-accent"
            >
              {s}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
