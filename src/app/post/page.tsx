import type { Metadata } from "next";
import { PostForm } from "./PostForm";

export const metadata: Metadata = {
  title: "ボトルを流す – YouTubeで音楽をシェア",
  description:
    "新潟発の音楽交換アプリ「潟ボトル」に音楽を投稿。YouTubeリンクと一言コメントを添えるだけで、あなたの一曲が新潟の海に流れ、誰かに拾われます。",
  alternates: { canonical: "/post" },
  openGraph: {
    title: "ボトルを流す – YouTubeで音楽をシェア | 潟ボトル",
    description:
      "YouTubeリンクで音楽をボトルに詰めて流そう。新潟の音楽交換コミュニティ「潟ボトル」。",
    url: "/post",
    type: "website",
  },
};

export default function PostPage() {
  return (
    <main className="relative flex-1 flex flex-col items-center justify-start overflow-hidden px-6 py-12">
      <header className="relative z-10 text-center mb-10">
        <p className="text-sm tracking-[0.4em] text-ink/70 mb-2">POST A BOTTLE</p>
        <h1 className="text-4xl sm:text-5xl font-semibold text-ink">
          海に流す
        </h1>
        <p className="mt-3 text-sm text-ink/80">
          YouTube リンクと、一言メッセージを添えて。
          <br />
          ボトルは 7 日間、誰かに拾われるのを待ちます。
        </p>
      </header>

      <PostForm />

      <p className="relative z-10 mt-10 max-w-md text-center text-xs leading-relaxed text-ink/60">
        ※ 毎日 3 本までは無料でボトルを開けられます（翌日 0:00 にリセット）。
        <br />
        無料枠を使い切ったら、ボトルを 1 本流すごとに、もう 1 本開けられます。
      </p>
    </main>
  );
}
