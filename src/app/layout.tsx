import type { Metadata } from "next";
import { Cinzel, Space_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { CartProvider } from "@/lib/cart-context";
import { AuthProvider } from "@/lib/auth-context";
import { ToastProvider } from "@/lib/toast-context";
import { WishlistProvider } from "@/lib/wishlist-context";
import CartDrawer from "@/components/CartDrawer";
import "./globals.css";

// Body/UI text uses the system Helvetica/Arial stack directly (see
// globals.css) — no webfont needed there. Cinzel is the display serif for
// every heading, Space Mono for prices and other numeric/technical text.
const cinzel = Cinzel({
  variable: "--font-headline",
  weight: ["700", "900"],
  subsets: ["latin"],
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  weight: ["400", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HEYFREAK — Original Streetwear",
  description:
    "HEYFREAK — kaos oversize cotton combed 24s, sablon plastisol, dan aksesoris statement. Desain original, stok terbatas.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className={`${cinzel.variable} ${spaceMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <NextIntlClientProvider locale={locale} messages={messages}>
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
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
