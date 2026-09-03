import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Breadcrumb from "@/components/Breadcrumb";
import StoresGrid from "@/components/StoresGrid";
import { STORES } from "@/lib/stores";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("stores");
  return {
    title: `${t("title")} — HEYFREAK`,
    description: "Kunjungi toko fisik HEYFREAK terdekat.",
  };
}

export default async function StoresPage() {
  const t = await getTranslations("stores");
  const tBreadcrumb = await getTranslations("breadcrumb");

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <Breadcrumb items={[{ label: tBreadcrumb("home"), href: "/" }, { label: t("breadcrumb") }]} />
        <div className="mt-6 text-center">
          <h1 className="font-display text-3xl uppercase tracking-wide">{t("title")}</h1>
        </div>
        <div className="mt-8">
          <StoresGrid stores={STORES} />
        </div>
      </main>
      <Footer />
    </div>
  );
}
