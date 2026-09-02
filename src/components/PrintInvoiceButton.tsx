"use client";

import { useTranslations } from "next-intl";

export default function PrintInvoiceButton() {
  const t = useTranslations("print");
  return (
    <button
      onClick={() => window.print()}
      className="print:hidden rounded-full border border-border px-6 py-2.5 text-sm font-bold uppercase tracking-wide transition-colors hover:border-accent hover:text-accent"
    >
      {t("printInvoice")}
    </button>
  );
}
