import { notFound } from "next/navigation";
import Link from "next/link";
import { getOrder, type Order } from "@/lib/api";
import { formatIDR } from "@/lib/products";
import PrintInvoiceButton from "@/components/PrintInvoiceButton";
import Breadcrumb from "@/components/Breadcrumb";

const STATUS_COPY: Record<string, { label: string; desc: string; tone: "ok" | "warn" | "bad" }> = {
  paid: {
    label: "Lunas",
    desc: "Terima kasih! Pembayaran udah kami terima dan pesanan segera diproses.",
    tone: "ok",
  },
  pending: {
    label: "Menunggu Pembayaran",
    desc: "Kami belum menerima konfirmasi pembayaran. Selesaikan pembayaran atau hubungi kami kalau sudah bayar.",
    tone: "warn",
  },
  failed: {
    label: "Pembayaran Gagal",
    desc: "Sesi pembayaran kadaluarsa atau gagal. Kamu bisa buat pesanan baru buat coba lagi.",
    tone: "bad",
  },
};

const toneStyles = {
  ok: "bg-accent text-accent-foreground",
  warn: "bg-yellow-400 text-black",
  bad: "bg-red-500 text-white",
};

function paymentLabel(order: Order) {
  const bank = order.paymentChannel?.startsWith("va_") ? order.paymentChannel.slice(3) : null;
  switch (order.paymentMethod) {
    case "qris":
      return "QRIS";
    case "va":
      return bank ? `Transfer Bank — Virtual Account ${bank}` : "Transfer Bank (Virtual Account)";
    case "card":
      return "Kartu Kredit / Debit";
    case "ewallet":
      return "E-Wallet";
    case "cod":
      return "COD (Bayar di Tempat)";
    default:
      return order.paymentMethod;
  }
}

export default async function OrderStatusPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getOrder(id);

  if (!order) notFound();

  const copy =
    STATUS_COPY[order.status] ??
    ({ label: order.status, desc: "", tone: "warn" } as const);

  const orderDate = new Date(order.createdAt).toLocaleString("id-ID", {
    dateStyle: "long",
    timeStyle: "short",
  });

  return (
    <main className="min-h-screen bg-background py-10 print:py-0">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="flex items-center justify-between print:hidden">
          <Link href="/" className="font-display text-2xl tracking-wide">
            HEY<span className="text-accent">FREAK</span>
          </Link>
          <Link href="/" className="text-sm font-semibold uppercase tracking-wide text-muted hover:text-foreground">
            ← Balik ke Toko
          </Link>
        </div>

        <div className="mt-4 print:hidden">
          <Breadcrumb
            items={[
              { label: "Beranda", href: "/" },
              { label: "Pesanan", href: "/account" },
              { label: `#${order.id}` },
            ]}
          />
        </div>

        <div className="mt-6 rounded-2xl border border-border bg-surface p-6 shadow-sm print:mt-0 print:rounded-none print:border-0 print:p-0 print:shadow-none sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
            <div>
              <p className="font-display text-3xl tracking-wide">
                HEY<span className="text-accent">FREAK</span>
              </p>
              <p className="mt-1 text-sm text-muted">Original Streetwear</p>
            </div>
            <div className="text-right">
              <h1 className="font-display text-2xl uppercase tracking-tight">Invoice</h1>
              <p className="mt-1 text-sm text-muted">#{order.id}</p>
              <p className="text-sm text-muted">{orderDate}</p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
            <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${toneStyles[copy.tone]}`}>
              {copy.label}
            </span>
            {copy.desc && <p className="text-sm text-muted">{copy.desc}</p>}
          </div>

          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted">Ditagihkan Ke</h2>
              <p className="mt-2 text-sm font-semibold text-foreground">{order.name}</p>
              <p className="text-sm text-muted">{order.phone}</p>
              <p className="text-sm text-muted">{order.email}</p>
              <p className="mt-1 text-sm text-muted">
                {order.address}, {order.city} {order.postalCode}
              </p>
            </div>
            <div>
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted">Detail Pesanan</h2>
              <dl className="mt-2 flex flex-col gap-1 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">No. Invoice</dt>
                  <dd className="font-semibold text-foreground">{order.id}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Metode Bayar</dt>
                  <dd className="font-semibold text-foreground">{paymentLabel(order)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Status</dt>
                  <dd className="font-semibold text-foreground">{copy.label}</dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="mt-8 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-widest text-muted">
                  <th className="pb-2">Produk</th>
                  <th className="pb-2 text-center">Ukuran</th>
                  <th className="pb-2 text-center">Qty</th>
                  <th className="pb-2 text-right">Harga</th>
                  <th className="pb-2 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => (
                  <tr key={`${item.productId}-${item.size ?? "x"}`} className="border-b border-border">
                    <td className="py-3 font-semibold text-foreground">{item.productName}</td>
                    <td className="py-3 text-center text-muted">{item.size ?? "—"}</td>
                    <td className="py-3 text-center text-muted">{item.qty}</td>
                    <td className="py-3 text-right text-muted">{formatIDR(item.price)}</td>
                    <td className="py-3 text-right font-semibold text-foreground">
                      {formatIDR(item.price * item.qty)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex justify-end">
            <div className="flex w-full max-w-xs flex-col gap-2 text-sm sm:max-w-sm">
              <div className="flex justify-between text-muted">
                <span>Subtotal</span>
                <span className="text-foreground">{formatIDR(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-muted">
                <span>Ongkir</span>
                <span className="text-foreground">{formatIDR(order.shipping)}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-2 text-base font-bold">
                <span>Total</span>
                <span className="font-display text-lg">{formatIDR(order.total)}</span>
              </div>
            </div>
          </div>

          {order.notes && (
            <div className="mt-6 border-t border-border pt-4">
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted">Catatan</h2>
              <p className="mt-1 text-sm text-muted">{order.notes}</p>
            </div>
          )}

          <div className="mt-8 flex justify-center gap-3 border-t border-border pt-6 print:hidden">
            <PrintInvoiceButton />
            <Link
              href="/"
              className="rounded-full bg-accent px-6 py-2.5 text-sm font-bold uppercase tracking-wide text-accent-foreground transition-transform hover:-translate-y-0.5"
            >
              Balik ke Toko
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
