import type { Metadata } from "next";
import { Klee_One } from "next/font/google";
import { GoogleAnalytics } from "@next/third-parties/google";
import "./globals.css";

const klee = Klee_One({
  variable: "--font-klee",
  subsets: ["latin"],
  weight: ["400", "600"],
  display: "swap",
});

const SITE_URL = "https://www.gatabottle.com";
const SITE_NAME = "潟ボトル";
const SITE_TITLE = "新潟で音楽をシェア｜潟ボトル";
const SITE_DESCRIPTION =
  "新潟から音楽をシェア。YouTubeリンクをボトルに詰めて海に流し、知らない誰かと音楽を交換できる、偶然の出会いアプリ「潟ボトル」。新潟の音楽好きが集う音楽交換コミュニティ。";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: "%s | 潟ボトル",
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "潟ボトル",
    "新潟 音楽交換",
    "新潟 音楽 シェア",
    "音楽 交換 アプリ",
    "音楽 シェア",
    "YouTube シェア",
    "ボトルメール",
    "新潟",
    "音楽 コミュニティ",
  ],
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  openGraph: {
    type: "website",
    locale: "ja_JP",
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  category: "music",
  icons: {
    icon: [
      { url: "/icon.png", sizes: "512x512", type: "image/png" },
      { url: "/favicon-48.png", sizes: "48x48", type: "image/png" },
    ],
    shortcut: "/favicon-48.png",
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      alternateName: "GATA BOTTLE",
      description: SITE_DESCRIPTION,
      inLanguage: "ja",
    },
    {
      "@type": "WebApplication",
      "@id": `${SITE_URL}/#app`,
      name: SITE_NAME,
      url: SITE_URL,
      description:
        "新潟発の音楽交換・シェアアプリ。YouTubeリンクをボトルに詰めて海に流し、知らない誰かと音楽を交換する。",
      applicationCategory: "MusicApplication",
      operatingSystem: "Web",
      inLanguage: "ja",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "JPY",
      },
    },
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#org`,
      name: SITE_NAME,
      url: SITE_URL,
      logo: `${SITE_URL}/icon.png`,
      areaServed: {
        "@type": "AdministrativeArea",
        name: "新潟県",
      },
    },
  ],
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
      <body className="min-h-full flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
      </body>
      <GoogleAnalytics gaId="G-F5N88G1G26" />
    </html>
  );
}
