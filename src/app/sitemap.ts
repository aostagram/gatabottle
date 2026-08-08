import type { MetadataRoute } from "next";

const SITE_URL = "https://www.gatabottle.com";

// サービス終了後はトップ（お知らせ）のみ。/post・/ranking・/history は
// next.config.ts のリダイレクトでトップへ寄せているため載せない。
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${SITE_URL}/`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 1,
    },
  ];
}
