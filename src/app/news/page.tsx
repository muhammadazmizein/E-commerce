import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Breadcrumb from "@/components/Breadcrumb";
import { NEWS_POSTS } from "@/lib/news";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("news");
  return {
    title: `${t("title")} — HEYFREAK`,
    description: "Latest news and announcements from HEYFREAK.",
  };
}

const dateFormat = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

export default async function NewsPage() {
  const t = await getTranslations("news");
  const tBreadcrumb = await getTranslations("breadcrumb");

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <Breadcrumb items={[{ label: tBreadcrumb("home"), href: "/" }, { label: t("breadcrumb") }]} />
        <div className="mt-6 text-center">
          <h1 className="font-display text-3xl uppercase tracking-wide">{t("title")}</h1>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {NEWS_POSTS.map((post) => (
            <Link key={post.slug} href={`/news/${post.slug}`} className="group flex flex-col">
              <div className="relative aspect-[4/3] overflow-hidden bg-surface-2">
                <Image
                  src={post.image}
                  alt={post.title}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                />
              </div>
              <div className="mt-3 flex flex-col gap-1.5">
                <span className="text-xs uppercase tracking-widest text-muted">
                  {dateFormat.format(new Date(post.date))}
                </span>
                <h2 className="font-display text-lg uppercase tracking-wide text-foreground group-hover:text-muted">
                  {post.title}
                </h2>
                <p className="line-clamp-2 text-sm text-muted">{post.excerpt}</p>
              </div>
            </Link>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
