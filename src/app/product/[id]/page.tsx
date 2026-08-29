import { notFound } from "next/navigation";
import { getProduct, getProducts } from "@/lib/api";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductDetail from "@/components/ProductDetail";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await getProduct(id);

  if (!product) notFound();

  const sameCategory = await getProducts(product.category);
  const related = sameCategory.filter((p) => p.id !== product.id).slice(0, 12);

  return (
    <div>
      <Header />
      <main>
        <ProductDetail product={product} related={related} />
      </main>
      <Footer />
    </div>
  );
}
