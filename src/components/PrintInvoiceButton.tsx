"use client";

export default function PrintInvoiceButton() {
  return (
    <button
      onClick={() => window.print()}
      className="print:hidden rounded-full border border-border px-6 py-2.5 text-sm font-bold uppercase tracking-wide transition-colors hover:border-accent hover:text-accent"
    >
      Cetak / Simpan PDF
    </button>
  );
}
