import type { Metadata } from "next";
import { Klee_One } from "next/font/google";
import "./globals.css";

const klee = Klee_One({
  variable: "--font-klee",
  subsets: ["latin"],
  weight: ["400", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "潟ボトル / GATA BOTTLE",
  description:
    "新潟の海に、音楽をボトルに詰めて流す。誰かが拾ってくれるかもしれない、偶然の音楽出会いアプリ。",
  openGraph: {
    title: "潟ボトル / GATA BOTTLE",
    description: "新潟の海に、音楽をボトルに詰めて流す。",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${klee.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
