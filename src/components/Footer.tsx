import Link from "next/link";

const shopLinks = [
  { label: "Semua Produk", href: "/products" },
  { label: "T-shirt", href: "/products?category=T-shirt" },
  { label: "S-shirt", href: "/products?category=S-shirt" },
  { label: "Pants", href: "/products?category=Pants" },
  { label: "Headwear", href: "/products?category=Headwear" },
];

const columns = [
  {
    title: "Bantuan",
    links: ["Cara Order", "Lacak Pesanan", "Pengiriman", "Retur & Tukar", "FAQ"],
  },
  {
    title: "Tentang",
    links: ["Cerita Kami", "Kolaborasi", "Karier", "Hubungi Kami"],
  },
];

export default function Footer() {
  return (
    <footer className="mt-auto border-t-2 border-border bg-surface">
      <div className="mx-auto max-w-7xl px-4 pt-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 border-b-2 border-border pb-10 lg:grid-cols-12">
          <div className="lg:col-span-4 lg:border-r-2 lg:border-border lg:pr-8">
            <p className="font-display text-3xl tracking-tight">
              HEY<span className="text-pop-foreground bg-pop px-0.5">FREAK</span>
            </p>
            <p className="mt-3 max-w-xs text-sm text-muted">
              Original streetwear label. Kaos oversize, aksesoris statement,
              produksi terbatas.
            </p>
            <div className="mt-5 flex gap-2.5">
              {["IG", "TT", "SH"].map((s) => (
                <a
                  key={s}
                  href="#"
                  className="btn-tag flex h-9 w-9 items-center justify-center border-2 border-border text-xs font-bold transition-colors hover:border-accent hover:text-accent"
                >
                  {s}
                </a>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-8">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-accent">Belanja</h3>
              <ul className="mt-4 space-y-2.5">
                {shopLinks.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-foreground/80 transition-colors hover:text-accent"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            {columns.map((col) => (
              <div key={col.title}>
                <h3 className="text-xs font-bold uppercase tracking-widest text-accent">
                  {col.title}
                </h3>
                <ul className="mt-4 space-y-2.5">
                  {col.links.map((link) => (
                    <li key={link}>
                      <a
                        href="#"
                        className="text-sm text-foreground/80 transition-colors hover:text-accent"
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3 py-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 HEYFREAK. Semua hak dilindungi.</p>
          <p>Dibuat dengan sepenuh hati buat para freak.</p>
        </div>
      </div>
    </footer>
  );
}
