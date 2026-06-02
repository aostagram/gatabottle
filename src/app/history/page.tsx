import type { Metadata } from "next";
import { HistoryList } from "./HistoryList";

export const metadata: Metadata = {
  title: "開封した曲 – あなたが拾った音楽",
  description:
    "潟ボトルで、これまであなたが海から拾って開封してきた音楽の履歴。出会った一曲をもう一度。",
  alternates: { canonical: "/history" },
  // 端末ごとに内容が変わる個人ページのため検索対象にはしない。
  robots: { index: false, follow: false },
};

export default function HistoryPage() {
  return (
    <main className="relative flex-1 flex flex-col items-center justify-start overflow-hidden px-6 py-12">
      <header className="relative z-10 text-center mb-10">
        <p className="text-sm tracking-[0.4em] text-ink/70 mb-2">YOUR PICKS</p>
        <h1 className="text-4xl sm:text-5xl font-semibold text-ink">開封した曲</h1>
        <p className="mt-3 text-sm text-ink/80">
          海から拾って開封してきた音楽の記録です。
        </p>
      </header>

      <HistoryList />
    </main>
  );
}
