import Header from "@/components/Header";
import Marquee from "@/components/Marquee";
import Hero from "@/components/Hero";
import Banners from "@/components/Banners";
import CategoryTiles from "@/components/CategoryTiles";
import ProductGrid from "@/components/ProductGrid";
import BrandStory from "@/components/BrandStory";
import Footer from "@/components/Footer";
import { getProducts, getCategories, getBanners, getSiteImages } from "@/lib/api";
import type { Product } from "@/lib/products";
import type { Category, Banner, SiteImage } from "@/lib/api";

export default async function Home() {
  let products: Product[] = [];
  let categories: Category[] = [];
  let banners: Banner[] = [];
  let siteImages: Record<string, SiteImage> = {};

  try {
    [products, categories, banners, siteImages] = await Promise.all([
      getProducts(),
      getCategories(),
      getBanners(),
      getSiteImages(),
    ]);
  } catch (err) {
    console.error("Failed to load data from API:", err);
  }

  return (
    <div id="top">
      <Header />
      <Marquee />
      <main>
        <Hero siteImages={siteImages} />
        <Banners banners={banners} />
        <CategoryTiles categories={categories} />
        <ProductGrid products={products} />
        <BrandStory image={siteImages["brand-story"]} />
      </main>
      <Footer />
    </div>
  );
}
