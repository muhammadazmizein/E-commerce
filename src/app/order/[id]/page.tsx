import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { getOrder, type Order } from "@/lib/api";
import { formatIDR } from "@/lib/products";
import PrintInvoiceButton from "@/components/PrintInvoiceButton";
import Breadcrumb from "@/components/Breadcrumb";
import Logo from "@/components/Logo";

const toneStyles = {
  ok: "bg-accent text-accent-foreground",
  warn: "bg-yellow-400 text-black",
  bad: "bg-red-500 text-white",
};

function paymentLabel(
  order: Order,
  t: Awaited<ReturnType<typeof getTranslations<"order">>>
) {
  const bank = order.paymentChannel?.startsWith("va_") ? order.paymentChannel.slice(3) : null;
  switch (order.paymentMethod) {
    case "qris":
      return t("paymentQris");
    case "va":
      return bank ? t("paymentVaBank", { bank }) : t("paymentVa");
    case "card":
      return t("paymentCard");
    case "ewallet":
      return t("paymentEwallet");
    case "cod":
      return t("paymentCod");
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

  const t = await getTranslations("order");
  const tCommon = await getTranslations("common");
  const locale = await getLocale();

  const STATUS_COPY: Record<string, { label: string; desc: string; tone: "ok" | "warn" | "bad" }> = {
    paid: { label: t("statusPaidLabel"), desc: t("statusPaidDesc"), tone: "ok" },
    pending: { label: t("statusPendingLabel"), desc: t("statusPendingDesc"), tone: "warn" },
    failed: { label: t("statusFailedLabel"), desc: t("statusFailedDesc"), tone: "bad" },
  };

  const copy =
    STATUS_COPY[order.status] ??
    ({ label: order.status, desc: "", tone: "warn" } as const);

  const orderDate = new Date(order.createdAt).toLocaleString(locale === "en" ? "en-US" : "id-ID", {
    dateStyle: "long",
    timeStyle: "short",
  });

  return (
    <main className="min-h-screen bg-background py-10 print:py-0">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="flex items-center justify-between print:hidden">
          <Link href="/">
            <Logo className="h-6 w-auto" />
          </Link>
          <Link href="/" className="text-sm font-semibold uppercase tracking-wide text-muted hover:text-foreground">
            {t("backToShop")}
          </Link>
        </div>

        <div className="mt-4 print:hidden">
          <Breadcrumb
            items={[
              { label: t("home"), href: "/" },
              { label: t("orderBreadcrumb"), href: "/account" },
              { label: `#${order.id}` },
            ]}
          />
        </div>

        <div className="mt-6 border border-border bg-surface p-6 shadow-edge print:mt-0 print:border-0 print:p-0 print:shadow-none sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
            <div>
              <Logo className="h-8 w-auto" />
              <p className="mt-1 text-sm text-muted">{t("originalStreetwear")}</p>
            </div>
            <div className="text-right">
              <h1 className="font-display text-2xl uppercase tracking-wide">{t("invoice")}</h1>
              <p className="mt-1 text-sm text-muted">#{order.id}</p>
              <p className="text-sm text-muted">{orderDate}</p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
            <span className={`clip-tag-sm px-3 py-1 text-xs font-bold uppercase tracking-wide ${toneStyles[copy.tone]}`}>
              {copy.label}
            </span>
            {copy.desc && <p className="text-sm text-muted">{copy.desc}</p>}
          </div>

          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted">{t("billedTo")}</h2>
              <p className="mt-2 text-sm font-semibold text-foreground">{order.name}</p>
              <p className="text-sm text-muted">{order.phone}</p>
              <p className="text-sm text-muted">{order.email}</p>
              <p className="mt-1 text-sm text-muted">
                {order.address}, {order.city} {order.postalCode}
              </p>
            </div>
            <div>
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted">{t("orderDetail")}</h2>
              <dl className="mt-2 flex flex-col gap-1 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">{t("invoiceNumber")}</dt>
                  <dd className="font-semibold text-foreground">{order.id}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">{t("paymentMethod")}</dt>
                  <dd className="font-semibold text-foreground">{paymentLabel(order, t)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">{t("status")}</dt>
                  <dd className="font-semibold text-foreground">{copy.label}</dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="mt-8 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-widest text-muted">
                  <th className="pb-2">{t("product")}</th>
                  <th className="pb-2 text-center">{t("size")}</th>
                  <th className="pb-2 text-center">{t("qty")}</th>
                  <th className="pb-2 text-right">{t("price")}</th>
                  <th className="pb-2 text-right">{t("subtotal")}</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => (
                  <tr key={`${item.productId}-${item.size ?? "x"}`} className="border-b border-border">
                    <td className="py-3 font-semibold text-foreground">{item.productName}</td>
                    <td className="py-3 text-center text-muted">{item.size ?? "—"}</td>
                    <td className="py-3 text-center text-muted">{item.qty}</td>
                    <td className="py-3 text-right font-mono text-muted">{formatIDR(item.price)}</td>
                    <td className="py-3 text-right font-mono font-semibold text-foreground">
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
                <span>{t("subtotal")}</span>
                <span className="font-mono text-foreground">{formatIDR(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-muted">
                <span>{t("shipping")}</span>
                <span className="font-mono text-foreground">{formatIDR(order.shipping)}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-2 text-base font-bold">
                <span>{t("total")}</span>
                <span className="font-mono text-lg font-bold">{formatIDR(order.total)}</span>
              </div>
            </div>
          </div>

          {order.notes && (
            <div className="mt-6 border-t border-border pt-4">
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted">{t("notes")}</h2>
              <p className="mt-1 text-sm text-muted">{order.notes}</p>
            </div>
          )}

          <div className="mt-8 flex justify-center gap-3 border-t border-border pt-6 print:hidden">
            <PrintInvoiceButton />
            <Link
              href="/"
              className="btn-tag bg-accent px-6 py-2.5 text-sm font-bold uppercase tracking-wide text-accent-foreground transition-transform hover:-translate-y-0.5"
            >
              {tCommon("backToShop")}
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
