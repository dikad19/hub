import type { Metadata } from "next";
import "./globals.css";
import { Plus_Jakarta_Sans, Inter, IBM_Plex_Mono } from "next/font/google";

const display = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-display",
});
const body = Inter({ subsets: ["latin"], variable: "--font-body" });
const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-receipt",
});

export const metadata: Metadata = {
  title: "Hub | Point of sale, stock, and profit for small businesses",
  description:
    "Hub helps shops, warungs, cafés, and service businesses ring up sales, track stock, and see daily profit.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${mono.variable}`}
    >
      <body className="font-[family-name:var(--font-body)] antialiased">
        {children}
      </body>
    </html>
  );
}
