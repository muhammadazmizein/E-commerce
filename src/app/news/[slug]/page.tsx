import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Breadcrumb from "@/components/Breadcrumb";
import { getNewsPost } from "@/lib/news";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getNewsPost(slug);
  if (!post) return {};

  return {
    title: `${post.title} — HEYFREAK`,
    description: post.excerpt,
  };
}

export default async function NewsPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getNewsPost(slug);
  if (!post) notFound();

  const tBreadcrumb = await getTranslations("breadcrumb");
  const tNews = await getTranslations("news");
  const dateFormat = new Intl.DateTimeFormat("en-US", { dateStyle: "long" });

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <Breadcrumb
          items={[
            { label: tBreadcrumb("home"), href: "/" },
            { label: tNews("breadcrumb"), href: "/news" },
            { label: post.title },
          ]}
        />

        <div className="mt-6">
          <span className="text-xs uppercase tracking-widest text-muted">{dateFormat.format(new Date(post.date))}</span>
          <h1 className="mt-2 font-display text-2xl uppercase tracking-wide sm:text-3xl">{post.title}</h1>
        </div>

        <div className="relative mt-6 aspect-[16/9] overflow-hidden bg-surface-2">
          <Image src={post.image} alt={post.title} fill sizes="100vw" className="object-cover" />
        </div>

        <div className="mt-6 flex flex-col gap-4 text-sm leading-relaxed text-foreground">
          {post.body.map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
