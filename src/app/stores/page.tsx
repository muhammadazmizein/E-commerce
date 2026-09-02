import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Breadcrumb from "@/components/Breadcrumb";
import StoresGrid from "@/components/StoresGrid";
import { STORES } from "@/lib/stores";

export const metadata: Metadata = {
  title: "Toko Kami — HEYFREAK",
  description: "Kunjungi toko fisik HEYFREAK terdekat.",
};

export default function StoresPage() {
  return (
    <div>
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Breadcrumb items={[{ label: "Beranda", href: "/" }, { label: "Toko Kami" }]} />
        <div className="mt-6 text-center">
          <h1 className="font-display text-3xl uppercase tracking-tight">Toko Kami</h1>
        </div>
        <div className="mt-8">
          <StoresGrid stores={STORES} />
        </div>
      </main>
      <Footer />
    </div>
  );
}
