import Header from "@/components/Header";
import Hero from "@/components/Hero";
import CategoriesShowcase from "@/components/CategoriesShowcase";
import FeaturedDrops from "@/components/FeaturedDrops";
import Footer from "@/components/Footer";
import { getCategories, getProducts, getSiteImages } from "@/lib/api";
import type { Product } from "@/lib/products";
import type { Category, SiteImage } from "@/lib/api";

export default async function Home() {
  let products: Product[] = [];
  let siteImages: Record<string, SiteImage> = {};
  let categories: Category[] = [];

  try {
    [products, siteImages, categories] = await Promise.all([
      getProducts(),
      getSiteImages(),
      getCategories(),
    ]);
  } catch (err) {
    console.error("Failed to load data from API:", err);
  }

  return (
    <div id="top">
      <Header />
      <main>
        <Hero siteImages={siteImages} />
        <FeaturedDrops products={products} />
        <CategoriesShowcase categories={categories} />
      </main>
      <Footer />
    </div>
  );
}
