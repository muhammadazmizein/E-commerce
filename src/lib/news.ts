export type NewsPost = {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  image: string;
  body: string[];
};

// Static for now — edit this list directly to publish a new post. No
// backend/CMS behind it yet.
export const NEWS_POSTS: NewsPost[] = [
  {
    slug: "new-drop-s-shirt-boxy-series",
    title: "New Drop: S-Shirt Boxy Series",
    date: "2026-09-01",
    excerpt:
      "A limited run of semi-wool boxy shirts built for daily wear. Once it's sold out, it's gone for good.",
    image: "/photos/heyfreak/category-t-shirt.png",
    body: [
      "The S-Shirt Boxy Series is finally here. Made from a lightweight, breathable semi-wool fabric with a relaxed boxy cut that still keeps things sharp for everyday fits.",
      "This release is limited — once a size sells out, we won't be restocking the same colorway or design. Check out the collection before it's gone.",
    ],
  },
  {
    slug: "restock-t-shirt-oversize-favorit",
    title: "Restock: Your Favorite Oversized Tees",
    date: "2026-08-20",
    excerpt:
      "Some of the most requested Cotton Combed 24s tee variants are finally back in stock. Grab them before they're gone again.",
    image: "/photos/heyfreak/882279.jpg",
    body: [
      "A lot of you asked when we'd restock — a few fan-favorite variants are finally back on the catalog, made from the same lightweight, all-day-breathable Cotton Combed 20s fabric.",
      "Sizes and colors are limited to what's left of the last production run, so once they're gone, they're really gone.",
    ],
  },
  {
    slug: "free-ongkir-jabodetabek",
    title: "Free Shipping in Jabodetabek on Every Order",
    date: "2026-08-05",
    excerpt:
      "Every order shipped within Jabodetabek is now free shipping. Check the terms and conditions.",
    image: "/photos/heyfreak/category-pants.png",
    body: [
      "As a thank-you to our loyal customers, every order shipped to the Jabodetabek area now gets free shipping automatically — no minimum purchase required.",
      "The promo applies as long as checkout shows the standard shipping option. See the checkout page for more details.",
    ],
  },
  {
    slug: "koleksi-headwear-terbaru",
    title: "New Headwear Collection Is Here",
    date: "2026-07-18",
    excerpt:
      "Cotton drill trucker hats to round out your street style. Now available in a few colorways.",
    image: "/photos/heyfreak/category-headwear.png",
    body: [
      "Looking for something to finish off a street-ready outfit? HEYFREAK's new headwear collection is now live on the product page.",
      "Made from durable, all-day-comfortable cotton drill, built to pair with both our T-shirt and S-shirt collections.",
    ],
  },
];

export function getNewsPost(slug: string): NewsPost | undefined {
  return NEWS_POSTS.find((post) => post.slug === slug);
}
