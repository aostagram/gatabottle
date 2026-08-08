import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // サービス終了に伴い、投稿・ランキング・履歴の各ページは廃止した。
  // ブックマークや検索結果から来た人が 404 に落ちないよう、お知らせを出す
  // トップへ寄せる。将来復活させる可能性を残すため 307（一時）にしている。
  async redirects() {
    return [
      { source: "/post", destination: "/", permanent: false },
      { source: "/ranking", destination: "/", permanent: false },
      { source: "/history", destination: "/", permanent: false },
    ];
  },
};

export default nextConfig;
