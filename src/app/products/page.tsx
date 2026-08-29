import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Breadcrumb from "@/components/Breadcrumb";
import ProductsCatalog from "@/components/ProductsCatalog";
import { getProducts } from "@/lib/api";
import type { Product } from "@/lib/products";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;

  let products: Product[] = [];
  try {
    products = await getProducts();
  } catch (err) {
    console.error("Failed to load products from API:", err);
  }

  return (
    <div>
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Breadcrumb items={[{ label: "Beranda", href: "/" }, { label: "Semua Produk" }]} />
        <div className="mt-4">
          <ProductsCatalog products={products} initialCategory={category} />
        </div>
      </main>
      <Footer />
    </div>
  );
}
