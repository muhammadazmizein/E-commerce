import Link from "next/link";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

export default function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted">
      {items.map((item, i) => (
        <span
          key={i}
          className={`flex items-center gap-2 ${item.href ? "shrink-0" : "min-w-0 flex-1"}`}
        >
          {i > 0 && <span className="shrink-0">/</span>}
          {item.href ? (
            <Link href={item.href} className="whitespace-nowrap hover:text-accent">
              {item.label}
            </Link>
          ) : (
            <span title={item.label} className="min-w-0 truncate text-foreground">
              {item.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
