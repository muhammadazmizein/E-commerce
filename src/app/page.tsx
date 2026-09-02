import Header from "@/components/Header";
import Marquee from "@/components/Marquee";
import Hero from "@/components/Hero";
import FeaturedDrops from "@/components/FeaturedDrops";
import Footer from "@/components/Footer";
import { getProducts, getSiteImages } from "@/lib/api";
import type { Product } from "@/lib/products";
import type { SiteImage } from "@/lib/api";

export default async function Home() {
  let products: Product[] = [];
  let siteImages: Record<string, SiteImage> = {};

  try {
    [products, siteImages] = await Promise.all([getProducts(), getSiteImages()]);
  } catch (err) {
    console.error("Failed to load data from API:", err);
  }

  return (
    <div id="top">
      <Header />
      <Marquee />
      <main>
        <Hero siteImages={siteImages} />
        <FeaturedDrops products={products} />
      </main>
      <Footer />
    </div>
  );
}
