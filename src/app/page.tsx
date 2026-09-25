import Header from "@/components/Header";
import Hero from "@/components/Hero";
import CategoriesShowcase from "@/components/CategoriesShowcase";
import FeaturedDrops from "@/components/FeaturedDrops";
import ProductScrollRow from "@/components/ProductScrollRow";
import Footer from "@/components/Footer";
import { getCategories, getProducts } from "@/lib/api";
import type { Product } from "@/lib/products";
import type { Category } from "@/lib/api";

export default async function Home() {
  let products: Product[] = [];
  let categories: Category[] = [];

  try {
    [products, categories] = await Promise.all([getProducts(), getCategories()]);
  } catch (err) {
    console.error("Failed to load data from API:", err);
  }

  const shirtProducts = products.filter((p) => p.category === "S-shirt").slice(0, 12);
  const tshirtProducts = products.filter((p) => p.category === "T-shirt").slice(0, 12);
  const pantsProducts = products.filter((p) => p.category === "Pants").slice(0, 12);

  return (
    <div id="top">
      <Header />
      <main>
        <Hero />
        <FeaturedDrops products={products} />
        <CategoriesShowcase categories={categories} />
        <ProductScrollRow products={shirtProducts} />
        <ProductScrollRow products={tshirtProducts} />
        <ProductScrollRow products={pantsProducts} />
      </main>
      <Footer />
    </div>
  );
}
