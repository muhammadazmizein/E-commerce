import type { Metadata } from "next";
import { Inter, Bebas_Neue } from "next/font/google";
import { CartProvider } from "@/lib/cart-context";
import { AuthProvider } from "@/lib/auth-context";
import { ToastProvider } from "@/lib/toast-context";
import { WishlistProvider } from "@/lib/wishlist-context";
import CartDrawer from "@/components/CartDrawer";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  weight: ["300", "400", "500", "600", "700", "900"],
  subsets: ["latin"],
});

// Bold condensed display face for the hero/featured-drops "campaign"
// sections only — a punchier, more streetwear-native shout than the plain
// grotesque used for the rest of the shop.
const bebasNeue = Bebas_Neue({
  variable: "--font-headline",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HEYFREAK — Original Streetwear",
  description:
    "HEYFREAK — kaos oversize cotton combed 24s, sablon plastisol, dan aksesoris statement. Desain original, stok terbatas.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      className={`${inter.variable} ${bebasNeue.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ToastProvider>
          <AuthProvider>
            <WishlistProvider>
              <CartProvider>
                {children}
                <CartDrawer />
              </CartProvider>
            </WishlistProvider>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
